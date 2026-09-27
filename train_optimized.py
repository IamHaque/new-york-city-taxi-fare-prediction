import os
import time
import joblib
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import root_mean_squared_error
from shared.features import compute_features, FEATURE_COLUMNS, NYC_LAT_MIN, NYC_LAT_MAX, NYC_LON_MIN, NYC_LON_MAX

def load_data_in_chunks(csv_path, max_rows=15_000_000, chunk_size=1_000_000):
    print(f"Loading up to {max_rows:,} rows in chunks to preserve RAM...")
    dtypes = {
        'fare_amount': 'float32',
        'pickup_longitude': 'float32', 'pickup_latitude': 'float32',
        'dropoff_longitude': 'float32', 'dropoff_latitude': 'float32',
        'passenger_count': 'uint8'
    }

    chunks = []
    rows_processed = 0

    # Process CSV iteratively
    for chunk in pd.read_csv(csv_path, chunksize=chunk_size, dtype=dtypes, parse_dates=['pickup_datetime']):
        # Extract basic time features
        chunk['hour'] = chunk['pickup_datetime'].dt.hour.astype(np.uint8)
        chunk['day_of_week_num'] = chunk['pickup_datetime'].dt.dayofweek.astype(np.uint8)
        chunk['month'] = chunk['pickup_datetime'].dt.month.astype(np.uint8)
        chunk['year'] = chunk['pickup_datetime'].dt.year.astype(np.uint16)

        # Apply precision bounds immediately to drop garbage rows before feature engineering
        clean_mask = (
            (chunk['fare_amount'] >= 2.50) & (chunk['fare_amount'] <= 300.0) &
            (chunk['passenger_count'] >= 1) & (chunk['passenger_count'] <= 6) &
            (chunk['pickup_latitude'].between(NYC_LAT_MIN, NYC_LAT_MAX)) &
            (chunk['dropoff_latitude'].between(NYC_LAT_MIN, NYC_LAT_MAX)) &
            (chunk['pickup_longitude'].between(NYC_LON_MIN, NYC_LON_MAX)) &
            (chunk['dropoff_longitude'].between(NYC_LON_MIN, NYC_LON_MAX))
        )
        chunk = chunk[clean_mask].copy()

        # Apply heavy math
        chunk = compute_features(chunk)
        chunk = chunk[(chunk['distance_km'] >= 0.10) & (chunk['distance_km'] <= 85.0)]

        chunks.append(chunk.drop(columns=['key', 'pickup_datetime'], errors='ignore'))

        rows_processed += chunk_size
        print(f"Processed {rows_processed:,} rows...")
        if rows_processed >= max_rows:
            break

    # Stitch the compressed chunks together
    final_df = pd.concat(chunks, ignore_index=True)
    print(f"Final clean dataset size in RAM: {len(final_df):,} rows.")
    return final_df

def train_model():
    csv_path = "./new-york-city-taxi-fare-prediction/train.csv"

    # 10M-15M rows will comfortably fit in your 16GB RAM once cleaned
    df = load_data_in_chunks(csv_path, max_rows=10_000_000)

    X = df[FEATURE_COLUMNS]
    y = df['fare_amount'].values

    # Free up memory before training
    del df

    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.05, random_state=42)

    print("Training XGBoost Regressor on RTX 3050 GPU...")
    start_time = time.time()

    # GPU-Accelerated XGBoost Configuration
    model = xgb.XGBRegressor(
        n_estimators=3500,        # Higher tree count for massive data
        learning_rate=0.05,
        max_depth=9,              # Slightly deeper trees to capture complex street grids
        subsample=0.85,
        colsample_bytree=0.85,
        tree_method='hist',       # Required for optimized performance
        device='cuda',            # Pushes computation to your NVIDIA GPU
        objective='reg:squarederror',
        random_state=42,
        early_stopping_rounds=50
    )

    model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=100)

    elapsed = time.time() - start_time
    print(f"GPU Training completed in {elapsed:.1f} seconds.")

    # Explicitly shift the model back to the CPU for inference
    model.set_params(device='cpu')

    # Now predict on the CPU-bound validation set
    preds = np.clip(model.predict(X_val), 2.50, None)
    rmse = root_mean_squared_error(y_val, preds)

    print("\n" + "="*50)
    print(f"Validation RMSE: ${rmse:.4f}")
    print("="*50)

    joblib.dump(model, "fare_model_all_records.pkl")
    joblib.dump({"features": FEATURE_COLUMNS, "rmse": float(rmse), "model_type": "xgboost_gpu"}, "model_metadata.pkl")

if __name__ == "__main__":
    train_model()
