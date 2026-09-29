from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import pandas as pd
import traceback

from scripts.config import (
    MODEL_SAVE_PATH_EXTREME,
    SERVER_HOST,
    SERVER_PORT,
    MIN_FARE_AMOUNT,
    MIN_PASSENGERS,
    MAX_PASSENGERS,
    API_COLUMN_MAPPING,
    COORDINATE_COLUMNS,
    FEATURE_COLUMNS
)
from scripts.shared.features import compute_features
from scripts.shared.landmarks import resolve_landmark
from server.services import parse_trip_description_via_llm

app = Flask(__name__)
CORS(app)

# Load model using path configuration
model = joblib.load(MODEL_SAVE_PATH_EXTREME)


def parse_request_data(request_json):
    """Normalizes single dict or list inputs into a Pandas DataFrame."""
    if isinstance(request_json, dict):
        request_json = [request_json]
    return pd.DataFrame(request_json)


def preprocess_input_dataframe(df):
    """Renames payload keys, enforces data types, and computes features."""
    df = df.rename(columns=API_COLUMN_MAPPING)

    for col in COORDINATE_COLUMNS:
        df[col] = df[col].astype(float)

    return compute_features(df)


def run_model_prediction(processed_df):
    """
    Shared inference path used by both /predict and /parse-trip, so the two endpoints can never
    silently drift into computing fares two different ways.

    Expects processed_df to already have been through preprocess_input_dataframe (or an
    equivalent compute_features pass) — i.e. FEATURE_COLUMNS and 'distance_km' must exist.

    Returns a list of {"fare_amount": float, "distance_km": float} dicts, one per row, in the
    same row order as the input.
    """
    # Run prediction in log-space
    log_predictions = model.predict(processed_df[FEATURE_COLUMNS])

    # CRITICAL: Reverse log transformation back to standard dollar amounts
    predictions = np.expm1(log_predictions)

    # Enforce legal minimum fare
    final_fares = np.clip(predictions, MIN_FARE_AMOUNT, None)

    return [
        {"fare_amount": round(float(fare), 2), "distance_km": round(float(dist), 2)}
        for fare, dist in zip(final_fares, processed_df['distance_km'])
    ]


@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid or empty JSON payload"}), 400

        df = parse_request_data(data)
        processed_df = preprocess_input_dataframe(df)
        results = run_model_prediction(processed_df)

        return jsonify(results[0] if len(results) == 1 else results)

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/parse-trip', methods=['POST'])
def parse_trip():
    """
    Turns a free-text trip description into a fare prediction in one round trip:
      1. Ollama extracts structured fields (landmark names + decomposed time fields).
      2. Each landmark name is resolved to coordinates via scripts.shared.landmarks.
      3. If BOTH sides resolve, the same run_model_prediction() path /predict uses is called,
         and fare_amount/distance_km are included in the response alongside the parsed fields.
      4. If EITHER side fails to resolve, the parsed fields are still returned (so the client can
         still pre-fill the form/map) but with no fare_amount/distance_km, plus a 'warning'
         explaining which side needs to be placed manually. This is a 200, not an error — parsing
         partially succeeded, and failing loudly here would throw away the fields that DID parse.
    """
    try:
        req_json = request.get_json()
        if not req_json or 'description' not in req_json:
            return jsonify({"error": "Missing 'description' field in JSON payload"}), 400

        user_text = req_json['description']

        # Step 1: LLM extraction (landmark names + hour/day_of_week_num/month/year/passenger_count)
        parsed_data = parse_trip_description_via_llm(user_text)
        response = dict(parsed_data)

        # Step 2: resolve landmark names -> coordinates
        pickup_coord = resolve_landmark(parsed_data.get('pickup_landmark'))
        dropoff_coord = resolve_landmark(parsed_data.get('dropoff_landmark'))
        response['pickup_resolved'] = pickup_coord is not None
        response['dropoff_resolved'] = dropoff_coord is not None

        # The LLM is free-text extraction and can return a passenger_count outside the range the
        # model was trained on ([1, 6], see validateTripInputs on the client) — clamp it rather
        # than feeding the model an out-of-distribution value.
        if 'passenger_count' in response and response['passenger_count'] is not None:
            response['passenger_count'] = int(
                np.clip(response['passenger_count'], MIN_PASSENGERS, MAX_PASSENGERS)
            )

        if pickup_coord is None or dropoff_coord is None:
            unresolved = [
                label for label, coord in (('pickup', pickup_coord), ('dropoff', dropoff_coord))
                if coord is None
            ]
            response['warning'] = (
                f"Couldn't recognize the {' and '.join(unresolved)} location"
                f"{'s' if len(unresolved) > 1 else ''} in that description. "
                "Place the pin on the map to get a fare estimate."
            )
            return jsonify(response)

        # Step 3: both sides resolved — build the same row shape /predict expects and run
        # inference through the identical code path, so this fare is computed exactly the way a
        # manually-submitted /predict call would compute it.
        response['pickup_lat'], response['pickup_lon'] = pickup_coord
        response['dropoff_lat'], response['dropoff_lon'] = dropoff_coord

        model_input = pd.DataFrame([{
            'pickup_latitude': pickup_coord[0],
            'pickup_longitude': pickup_coord[1],
            'dropoff_latitude': dropoff_coord[0],
            'dropoff_longitude': dropoff_coord[1],
            'passenger_count': response.get('passenger_count', MIN_PASSENGERS),
            'hour': response['hour'],
            'day_of_week_num': response['day_of_week_num'],
            'month': response['month'],
            'year': response['year'],
        }])
        processed = compute_features(model_input)
        prediction = run_model_prediction(processed)[0]

        response['fare_amount'] = prediction['fare_amount']
        response['distance_km'] = prediction['distance_km']

        return jsonify(response)

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"Failed to parse trip text via LLM: {str(e)}"}), 500


if __name__ == '__main__':
    app.run(host=SERVER_HOST, port=SERVER_PORT)
