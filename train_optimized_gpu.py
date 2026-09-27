import gc
import time
import joblib
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import root_mean_squared_error
from sklearn.model_selection import train_test_split
from shared.features import compute_features, FEATURE_COLUMNS, NYC_LAT_MIN, NYC_LAT_MAX, NYC_LON_MIN, NYC_LON_MAX

def train_incrementally(csv_path):
    print("Starting incremental GPU training across 55.4M rows...")

    dtypes = {
        'fare_amount': 'float32',
        'pickup_longitude': 'float32', 'pickup_latitude': 'float32',
        'dropoff_longitude': 'float32', 'dropoff_latitude': 'float32',
        'passenger_count': 'uint8'
    }

    # Initialize the GPU model
    model = xgb.XGBRegressor(
        n_estimators=100,         # Trees added PER CHUNK (keep this lower for incremental)
        learning_rate=0.05,
        max_depth=9,
        subsample=0.85,
        colsample_bytree=0.85,
        tree_method='hist',
        device='cuda',            # Route to RTX 3050
        objective='reg:squarederror',
        random_state=42
    )

    chunk_size = 4_000_000  # Safe size for 16GB RAM / 4GB VRAM
    total_processed = 0
    is_first_chunk = True

    # Read the 55.4M row file sequentially
    for chunk in pd.read_csv(csv_path, chunksize=chunk_size, dtype=dtypes, parse_dates=['pickup_datetime']):

        # 1. Feature Engineering
        chunk['hour'] = chunk['pickup_datetime'].dt.hour.astype(np.uint8)
        chunk['day_of_week_num'] = chunk['pickup_datetime'].dt.dayofweek.astype(np.uint8)
        chunk['month'] = chunk['pickup_datetime'].dt.month.astype(np.uint8)
        chunk['year'] = chunk['pickup_datetime'].dt.year.astype(np.uint16)

        clean_mask = (
            (chunk['fare_amount'] >= 2.50) & (chunk['fare_amount'] <= 300.0) &
            (chunk['passenger_count'] >= 1) & (chunk['passenger_count'] <= 6) &
            (chunk['pickup_latitude'].between(NYC_LAT_MIN, NYC_LAT_MAX)) &
            (chunk['dropoff_latitude'].between(NYC_LAT_MIN, NYC_LAT_MAX)) &
            (chunk['pickup_longitude'].between(NYC_LON_MIN, NYC_LON_MAX)) &
            (chunk['dropoff_longitude'].between(NYC_LON_MIN, NYC_LON_MAX))
        )
        chunk = chunk[clean_mask].copy()
        chunk = compute_features(chunk)
        chunk = chunk[(chunk['distance_km'] >= 0.10) & (chunk['distance_km'] <= 85.0)]

        # 2. Split Features and Target
        X = chunk[FEATURE_COLUMNS]
        y = chunk['fare_amount'].values

        # 3. Train Incrementally
        if is_first_chunk:
            print(f"Carving out global validation set from the first chunk...")
            # Split the first chunk to hold 200,000 rows permanently in RAM
            X_train_chunk, X_val, y_train_chunk, y_val = train_test_split(
                X, y, test_size=200_000, random_state=42
            )

            print(f"Training on first chunk ({len(X_train_chunk):,} rows)...")
            model.fit(X_train_chunk, y_train_chunk, eval_set=[(X_val, y_val)], verbose=50)
            is_first_chunk = False
        else:
            print(f"Resuming training on next chunk ({len(chunk):,} rows)...")
            # Continue training the existing booster, evaluating against the held-out validation set
            model.fit(X, y, eval_set=[(X_val, y_val)], verbose=50, xgb_model=model.get_booster())


        total_processed += chunk_size
        print(f"Total raw rows processed: {total_processed:,} / 55,423,856")

        # 4. Aggressive Memory Cleanup
        del chunk, X, y
        if 'X_train_chunk' in locals():
            del X_train_chunk, y_train_chunk
        gc.collect()  # Force Python to release RAM immediately

    # Final wrap-up
    print("Full dataset training complete.")

    # Shift to CPU for the Flask API server
    model.set_params(device='cpu')

    # Calculate the true RMSE using the validation set we held in RAM
    print("Calculating final RMSE on the global validation set...")
    final_preds = np.clip(model.predict(X_val), 2.50, None)
    final_rmse = root_mean_squared_error(y_val, final_preds)

    print("\n" + "="*50)
    print(f"Final Global Validation RMSE: ${final_rmse:.4f}")
    print("="*50)

    joblib.dump(model, "fare_model_full.pkl")
    joblib.dump({
        "features": FEATURE_COLUMNS,
        "rmse": float(final_rmse),
        "model_type": "xgboost_gpu_incremental"
    }, "model_metadata.pkl")

    print("Saved production model.")

if __name__ == "__main__":
    train_incrementally("./new-york-city-taxi-fare-prediction/train.csv")
