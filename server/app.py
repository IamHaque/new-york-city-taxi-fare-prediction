from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np

# Additional route — calls the company's local Ollama server (llama3:8b)
import requests

app = Flask(__name__)
CORS(app)  # allows the React dev server (different port) to call this API without being blocked by the browser

model = joblib.load('fare_model_full.pkl')
OLLAMA_URL = "http://localhost:11434/api/generate"

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    a = np.sin(dlat/2)**2 + np.cos(lat1)*np.cos(lat2)*np.sin(dlon/2)**2
    return 2 * R * np.arcsin(np.sqrt(a))

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()

    # Compute distance server-side so the frontend only ever needs to send raw coordinates,
    # keeping the "business logic" of feature engineering in one place (not duplicated in JS).
    distance_km = haversine(
        data['pickup_lat'], data['pickup_lon'],
        data['dropoff_lat'], data['dropoff_lon']
    )

    features = [[
        distance_km,
        data['hour'],
        data['day_of_week_num'],
        data['month'],
        data['passenger_count']
    ]]

    prediction = model.predict(features)[0]
    return jsonify({
        'fare_amount': round(float(prediction), 2),
        'distance_km': round(float(distance_km), 2)
    })

@app.route('/parse-trip', methods=['POST'])
def parse_trip():
    user_text = request.get_json()['description']

    # The prompt instructs the LLM to return ONLY JSON, so the response can be parsed directly
    # without the model adding conversational filler around the answer.
    prompt = f"""Extract structured trip details from this text as JSON only, no explanation:
    Text: "{user_text}"
    Return exactly this shape:
    {{"pickup_landmark": "", "dropoff_landmark": "", "hour": 0, "day_of_week_num": 0, "month": 0, "passenger_count": 1}}
    """

    response = requests.post(OLLAMA_URL, json={
        "model": "llama3:8b",
        "prompt": prompt,
        "stream": False
    })

    llm_output = response.json()['response']
    # In production, this JSON should be validated/parsed defensively (try/except around json.loads),
    # since LLM output is not guaranteed to be perfectly formed JSON every time.
    return llm_output

if __name__ == '__main__':
    app.run(debug=True, port=5000)
