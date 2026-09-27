from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import pandas as pd
import traceback

from scripts.config import (
    MODEL_SAVE_PATH_INCREMENTAL,
    SERVER_HOST,
    SERVER_PORT,
    MIN_FARE_AMOUNT,
    API_COLUMN_MAPPING,
    COORDINATE_COLUMNS,
    FEATURE_COLUMNS
)
from scripts.shared.features import compute_features
from server.services import parse_trip_description_via_llm

app = Flask(__name__)
CORS(app)

# Load model using path configuration
model = joblib.load(MODEL_SAVE_PATH_INCREMENTAL)


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


@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid or empty JSON payload"}), 400

        df = parse_request_data(data)
        processed_df = preprocess_input_dataframe(df)

       # Run prediction in log-space
        log_predictions = model.predict(processed_df[FEATURE_COLUMNS])

        # CRITICAL: Reverse log transformation back to standard dollar amounts
        predictions = np.expm1(log_predictions)

        # Enforce legal minimum fare[cite: 6]
        final_fares = np.clip(predictions, MIN_FARE_AMOUNT, None)

        results = [
            {"fare_amount": round(float(fare), 2), "distance_km": round(float(dist), 2)}
            for fare, dist in zip(final_fares, processed_df['distance_km'])
        ]

        return jsonify(results[0] if len(results) == 1 else results)

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/parse-trip', methods=['POST'])
def parse_trip():
    try:
        req_json = request.get_json()
        if not req_json or 'description' not in req_json:
            return jsonify({"error": "Missing 'description' field in JSON payload"}), 400

        user_text = req_json['description']
        parsed_data = parse_trip_description_via_llm(user_text)

        return jsonify(parsed_data)

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"Failed to parse trip text via LLM: {str(e)}"}), 500


if __name__ == '__main__':
    app.run(host=SERVER_HOST, port=SERVER_PORT)
