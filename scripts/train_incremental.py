import gc
import joblib
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import root_mean_squared_error
from sklearn.model_selection import train_test_split
from config import (
    DATA_PATH, FEATURE_COLUMNS, TRAIN_DTYPES,
    TOTAL_DATASET_ROWS, INCREMENTAL_CHUNK_SIZE, INCREMENTAL_VAL_SIZE_ROWS,
    MODEL_SAVE_PATH_INCREMENTAL, METADATA_SAVE_PATH_INCREMENTAL
)
from shared.data_utils import process_chunk

def train_incrementally(csv_path):
    print(f"Starting incremental GPU training across {TOTAL_DATASET_ROWS:,} rows...")

    model = xgb.XGBRegressor(
        n_estimators=100,
        learning_rate=0.05,
        max_depth=9,
        subsample=0.85,
        colsample_bytree=0.85,
        tree_method='hist',
        device='cuda',
        objective='reg:squarederror',
        random_state=42
    )

    total_processed = 0
    is_first_chunk = True

    # Initialize validation variables to satisfy strict linters
    X_val, y_val = None, None

    for chunk in pd.read_csv(csv_path, chunksize=INCREMENTAL_CHUNK_SIZE, dtype=TRAIN_DTYPES, parse_dates=['pickup_datetime']):
        processed_chunk = process_chunk(chunk)

        X = processed_chunk[FEATURE_COLUMNS]
        y = processed_chunk['fare_amount'].values

        if is_first_chunk:
            print(f"Carving out global validation set from the first chunk...")
            X_train_chunk, X_val, y_train_chunk, y_val = train_test_split(
                X, y, test_size=INCREMENTAL_VAL_SIZE_ROWS, random_state=42
            )
            print(f"Training on first chunk ({len(X_train_chunk):,} rows)...")
            model.fit(X_train_chunk, y_train_chunk, eval_set=[(X_val, y_val)], verbose=50)
            is_first_chunk = False

            # Immediately free the training chunk memory here so we don't need locals() checks later
            del X_train_chunk, y_train_chunk
        else:
            print(f"Resuming training on next chunk ({len(processed_chunk):,} rows)...")
            model.fit(X, y, eval_set=[(X_val, y_val)], verbose=50, xgb_model=model.get_booster())

        total_processed += INCREMENTAL_CHUNK_SIZE
        print(f"Total raw rows processed: {total_processed:,} / {TOTAL_DATASET_ROWS:,}")

        # Cleanup current chunk data
        del chunk, processed_chunk, X, y
        gc.collect()

    print("Full dataset training complete.")
    model.set_params(device='cpu')

    # Safety guard in case the CSV was entirely empty and the loop never executed
    if X_val is None or y_val is None:
        print("Error: No data was processed. Validation sets were never bound.")
        return

    print("Calculating final RMSE on the global validation set...")
    final_preds = np.clip(model.predict(X_val), 2.50, None)
    final_rmse = root_mean_squared_error(y_val, final_preds)

    print("\n" + "="*50)
    print(f"Final Global Validation RMSE: ${final_rmse:.4f}")
    print("="*50)

    joblib.dump(model, MODEL_SAVE_PATH_INCREMENTAL)
    joblib.dump({
        "features": FEATURE_COLUMNS,
        "rmse": float(final_rmse),
        "model_type": "xgboost_gpu_incremental"
    }, METADATA_SAVE_PATH_INCREMENTAL)
    print("Saved production model.")

if __name__ == "__main__":
    train_incrementally(DATA_PATH)
