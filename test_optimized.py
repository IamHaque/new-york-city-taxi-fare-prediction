import pandas as pd
import requests
import time

API_URL = 'http://localhost:5000/predict'
HEADERS = {'Content-Type': 'application/json'}
DATA_PATH = './new-york-city-taxi-fare-prediction/train.csv'
TEST_DATA_PATH = './new-york-city-taxi-fare-prediction/test.csv'
SUBMISSION_PATH = 'submission.csv'


def run_tests():
    print("Loading holdout test data...")
    # Skip the 500,000 rows used for training to prevent data leakage, plus 1 for header
    skip_rows = range(1, 500_001)

    df = pd.read_csv(
        DATA_PATH,
        skiprows=skip_rows,
        nrows=20_000,
        parse_dates=['pickup_datetime']
    )

    # Filter to valid NYC bounds
    df = df[
        (df.fare_amount >= 2.50) &
        (df.passenger_count > 0) & (df.passenger_count <= 6) &
        (df.pickup_latitude.between(40.5, 40.95)) &
        (df.dropoff_latitude.between(40.5, 40.95)) &
        (df.pickup_longitude.between(-74.25, -73.7)) &
        (df.dropoff_longitude.between(-74.25, -73.7))
    ]

    # Sample an adequate validation size
    sample_df = df.sample(n=10_000, random_state=42)

    # Construct batch payload
    payload = []
    for _, row in sample_df.iterrows():
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

        mae = sample_df['difference'].mean()
        print("-" * 50)
        print(f"True Holdout Mean Absolute Error (MAE): ${mae:.2f}")
        print("-" * 50)

    except requests.exceptions.RequestException as e:
        print(f"API Request Failed: {e}")

def generate_kaggle_submission():
    print(f"Loading Kaggle test data from {TEST_DATA_PATH}...")

    try:
        # Read the test data, parsing the datetime column directly
        df = pd.read_csv(TEST_DATA_PATH, parse_dates=['pickup_datetime'])
    except FileNotFoundError:
        print(f"Error: Could not find {TEST_DATA_PATH}. Please ensure it is downloaded.")
        return

    print(f"Loaded {len(df)} rows. Preparing batch payload for API...")

    # Construct the batch payload mirroring the API's expected JSON structure
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

    print(f"Sending {len(payload)} records to the prediction server...")
    start_time = time.time()

    try:
        response = requests.post(API_URL, json=payload, headers=HEADERS)
        response.raise_for_status()
        predictions = response.json()

        elapsed = time.time() - start_time
        print(f"API processed {len(payload)} rows in {elapsed:.2f} seconds.")

        # Extract the predicted fares
        predicted_fares = [p['fare_amount'] for p in predictions]

        # Create the submission DataFrame matching the Kaggle requirements
        submission_df = pd.DataFrame({
            'key': df['key'],
            'fare_amount': predicted_fares
        })

        # Save to CSV without the index column
        submission_df.to_csv(SUBMISSION_PATH, index=False)
        print(f"Successfully saved predictions to '{SUBMISSION_PATH}'.")
        print(submission_df.head())

    except requests.exceptions.RequestException as e:
        print(f"API Request Failed: {e}")

# --- Update your execution block at the bottom of test_optimized.py ---
if __name__ == "__main__":
    import sys

    # Add a simple command line switch so you can choose which test to run
    if len(sys.argv) > 1 and sys.argv[1] == '--submit':
        generate_kaggle_submission()
    else:
        # Your existing run_tests() function call goes here
        run_tests()
        print("Run with '--submit' to generate the Kaggle submission.csv")
