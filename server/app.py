from datetime import datetime, timedelta

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


def resolve_time_fields(parsed_data, now=None):
    """
    Completes the possibly-null time fields the LLM extracted, per the /parse-trip contract:
    the model only echoes what the text literally says (null otherwise) — filling unstated
    fields is this server's job, because only the server knows the real current date/time.

    Precedence, applied per field:
      1. explicit value extracted from the text (hour/day_of_week_num/month/year),
      2. relative_day ('today'|'tomorrow'|'yesterday') resolved against `now` for
         day_of_week_num/month/year,
      3. `now` itself.

    Fields that fell through to step 3 are reported in the returned assumed list so the client
    can disclose the assumption instead of silently showing a fabricated time.

    Returns (fields, assumed_time_fields) where fields keys are
    hour/day_of_week_num/month/year, all guaranteed valid ints.
    """
    now = now or datetime.now()

    relative_base = {
        'today': now,
        'tomorrow': now + timedelta(days=1),
        'yesterday': now - timedelta(days=1),
    }.get(parsed_data.get('relative_day'))

    relative_values = {}
    if relative_base is not None:
        relative_values = {
            'day_of_week_num': relative_base.weekday(),
            'month': relative_base.month,
            'year': relative_base.year,
        }

    now_values = {
        'hour': now.hour,
        'day_of_week_num': now.weekday(),
        'month': now.month,
        'year': now.year,
    }

    fields = {}
    assumed_time_fields = []
    for key in ('hour', 'day_of_week_num', 'month', 'year'):
        explicit = parsed_data.get(key)
        if explicit is not None:
            fields[key] = explicit
        elif key in relative_values:
            fields[key] = relative_values[key]
        else:
            fields[key] = now_values[key]
            assumed_time_fields.append(key)

    return fields, assumed_time_fields


@app.route('/parse-trip', methods=['POST'])
def parse_trip():
    """
    Turns a free-text trip description into a fare prediction in one round trip:
      1. Ollama extracts structured fields (landmark names + decomposed time fields). Values the
         text does not state come back as null — the model never invents them.
      2. Time fields are completed server-side (explicit text > relative_day > now) and the
         fields that defaulted to now are listed in assumed_time_fields for the client to disclose.
      3. Each landmark name is resolved to coordinates via scripts.shared.landmarks.
      4. If BOTH sides resolve, the same run_model_prediction() path /predict uses is called,
         and fare_amount/distance_km are included in the response alongside the parsed fields.
      5. If EITHER side fails to resolve, the parsed fields are still returned (so the client can
         still pre-fill the form/map) but with no fare_amount/distance_km, plus a 'warning'
         explaining which side needs to be placed manually. This is a 200, not an error — parsing
         partially succeeded, and failing loudly here would throw away the fields that DID parse.
    """
    try:
        req_json = request.get_json()
        if not req_json or 'description' not in req_json:
            return jsonify({"error": "Missing 'description' field in JSON payload"}), 400

        user_text = req_json['description']

        # Step 1: LLM extraction (landmark names + possibly-null time fields)
        parsed_data = parse_trip_description_via_llm(user_text)
        response = dict(parsed_data)

        # Step 2: complete the time fields before anything downstream can see them — both the
        # warning path and the model input below are guaranteed valid ints from here on.
        time_fields, assumed_time_fields = resolve_time_fields(parsed_data)
        response.update(time_fields)
        response['assumed_time_fields'] = assumed_time_fields

        # passenger_count: the LLM leaves it null unless the text states one; default to 1
        # (the common case) rather than feeding the model a missing value.
        if response.get('passenger_count') is None:
            response['passenger_count'] = MIN_PASSENGERS

        # relative_day was only needed to resolve the date server-side; keep the response
        # contract to the documented fields.
        response.pop('relative_day', None)

        # Step 3: resolve landmark names -> coordinates
        pickup_coord = resolve_landmark(response.get('pickup_landmark'))
        dropoff_coord = resolve_landmark(response.get('dropoff_landmark'))
        response['pickup_resolved'] = pickup_coord is not None
        response['dropoff_resolved'] = dropoff_coord is not None

        # Belt-and-braces: sanitize_extracted_trip already bounds passenger_count to
        # [MIN_PASSENGERS, MAX_PASSENGERS]; clamp again before it reaches the model.
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

        # Step 4: both sides resolved — build the same row shape /predict expects and run
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
