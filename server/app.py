from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import pandas as pd
from shared.features import compute_features, FEATURE_COLUMNS

app = Flask(__name__)
CORS(app)

model = joblib.load('fare_model_full.pkl')

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()

    # Support both single dict and lists for batch predictions
    if isinstance(data, dict):
        data = [data]

    df = pd.DataFrame(data)

    # Map API keys to internal feature names
    df = df.rename(columns={
        'pickup_lat': 'pickup_latitude',
        'pickup_lon': 'pickup_longitude',
        'dropoff_lat': 'dropoff_latitude',
        'dropoff_lon': 'dropoff_longitude'
    })

    # Ensure datatypes align
    for col in ['pickup_latitude', 'pickup_longitude', 'dropoff_latitude', 'dropoff_longitude']:
        df[col] = df[col].astype(float)

    # Apply shared feature engineering
    df = compute_features(df)

    # Predict and enforce NYC legal minimum
    predictions = model.predict(df[FEATURE_COLUMNS])
    final_fares = np.clip(predictions, 2.50, None)

    results = [
        {"fare_amount": round(fare, 2), "distance_km": round(dist, 2)}
        for fare, dist in zip(final_fares, df['distance_km'])
    ]

    # Return single object if input was single, otherwise return list
    return jsonify(results[0] if len(results) == 1 else results)

if __name__ == '__main__':
    # Recommend running via Waitress or Gunicorn in production
    app.run(host='0.0.0.0', port=5000)
