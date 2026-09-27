import time
import requests
import pandas as pd
from config import (
    API_URL, HEADERS, DATA_PATH, TEST_DATA_PATH, SUBMISSION_PATH,
    API_TEST_SKIP_ROWS, API_TEST_READ_ROWS, API_TEST_SAMPLE_SIZE,
    NYC_LAT_MIN, NYC_LAT_MAX, NYC_LON_MIN, NYC_LON_MAX
)

def _prepare_payload(df):
    """Constructs API payload from a DataFrame to maintain DRY principles."""
    payload = []
    for _, row in df.iterrows():
        dt = row['pickup_datetime']
        payload.append({
            "pickup_lat": float(row['pickup_latitude']),
            "pickup_lon": float(row['pickup_longitude']),
            "dropoff_lat": float(row['dropoff_latitude']),
            "dropoff_lon": float(row['dropoff_longitude']),
            "hour": int(dt.hour),
            "day_of_week_num": int(dt.dayofweek),
            "month": int(dt.month),
            "year": int(dt.year),
            "passenger_count": int(row['passenger_count'])
        })
    return payload

def run_tests():
    print("Loading holdout test data...")
    # Skip rows used for training, plus 1 for header
    skip_rows = range(1, API_TEST_SKIP_ROWS + 1)

    df = pd.read_csv(DATA_PATH, skiprows=skip_rows, nrows=API_TEST_READ_ROWS, parse_dates=['pickup_datetime'])
    df = df[
        (df.fare_amount >= 2.50) &
        (df.passenger_count > 0) & (df.passenger_count <= 6) &
        (df.pickup_latitude.between(NYC_LAT_MIN, NYC_LAT_MAX)) &
        (df.dropoff_latitude.between(NYC_LAT_MIN, NYC_LAT_MAX)) &
        (df.pickup_longitude.between(NYC_LON_MIN, NYC_LON_MAX)) &
        (df.dropoff_longitude.between(NYC_LON_MIN, NYC_LON_MAX))
    ]

    sample_df = df.sample(n=API_TEST_SAMPLE_SIZE, random_state=42)
    payload = _prepare_payload(sample_df)

    print(f"Sending batch request of {len(payload)} rows to API...")
    start_time = time.time()

    try:
        response = requests.post(API_URL, json=payload, headers=HEADERS)
        response.raise_for_status()
        predictions = response.json()

        elapsed = time.time() - start_time
        print(f"API processed {len(payload)} rows in {elapsed:.2f} seconds.\n")

        sample_df['predicted_fare'] = [p['fare_amount'] for p in predictions]
        sample_df['difference'] = (sample_df['predicted_fare'] - sample_df['fare_amount']).abs()

        print("-" * 50)
        print(f"True Holdout Mean Absolute Error (MAE): ${sample_df['difference'].mean():.2f}")
        print("-" * 50)
    except requests.exceptions.RequestException as e:
        print(f"API Request Failed: {e}")

def generate_kaggle_submission():
    print(f"Loading Kaggle test data from {TEST_DATA_PATH}...")
    try:
        df = pd.read_csv(TEST_DATA_PATH, parse_dates=['pickup_datetime'])
    except FileNotFoundError:
        print(f"Error: Could not find {TEST_DATA_PATH}. Please ensure it is downloaded.")
        return

    payload = _prepare_payload(df)
    print(f"Sending {len(payload)} records to the prediction server...")
    start_time = time.time()

    try:
        response = requests.post(API_URL, json=payload, headers=HEADERS)
        response.raise_for_status()
        predictions = response.json()

        print(f"API processed {len(payload)} rows in {time.time() - start_time:.2f} seconds.")

        submission_df = pd.DataFrame({
            'key': df['key'],
            'fare_amount': [p['fare_amount'] for p in predictions]
        })
        submission_df.to_csv(SUBMISSION_PATH, index=False)
        print(f"Successfully saved predictions to '{SUBMISSION_PATH}'.")
    except requests.exceptions.RequestException as e:
        print(f"API Request Failed: {e}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == '--submit':
        generate_kaggle_submission()
    else:
        run_tests()
        print("Run with '--submit' to generate the Kaggle submission.csv")
