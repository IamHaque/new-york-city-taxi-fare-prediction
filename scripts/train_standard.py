import time
import joblib
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import root_mean_squared_error
from sklearn.model_selection import train_test_split

from config import (
    DATA_PATH, FEATURE_COLUMNS, TRAIN_DTYPES,
    TRAIN_MAX_ROWS, TRAIN_CHUNK_SIZE_STANDARD, STANDARD_VAL_SIZE_FRACTION,
    MODEL_SAVE_PATH_STANDARD, METADATA_SAVE_PATH_STANDARD
)
from shared.data_utils import process_chunk

def load_data_in_chunks(csv_path, max_rows, chunk_size):
    print(f"Loading up to {max_rows:,} rows in chunks to preserve RAM...")
    chunks = []
    rows_processed = 0

    for chunk in pd.read_csv(csv_path, chunksize=chunk_size, dtype=TRAIN_DTYPES, parse_dates=['pickup_datetime']):
        processed_chunk = process_chunk(chunk)
        chunks.append(processed_chunk.drop(columns=['key', 'pickup_datetime'], errors='ignore'))

        rows_processed += chunk_size
        print(f"Processed {rows_processed:,} rows...")
        if rows_processed >= max_rows:
            break

    final_df = pd.concat(chunks, ignore_index=True)
    print(f"Final clean dataset size in RAM: {len(final_df):,} rows.")
    return final_df

def train_model():
    df = load_data_in_chunks(DATA_PATH, max_rows=TRAIN_MAX_ROWS, chunk_size=TRAIN_CHUNK_SIZE_STANDARD)

    X = df[FEATURE_COLUMNS]
    y = df['fare_amount'].values
    del df

    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=STANDARD_VAL_SIZE_FRACTION, random_state=42)

    print("Training XGBoost Regressor on RTX 3050 GPU...")
    start_time = time.time()

    model = xgb.XGBRegressor(
        n_estimators=3500,
        learning_rate=0.05,
        max_depth=9,
        subsample=0.85,
        colsample_bytree=0.85,
        tree_method='hist',
        device='cuda',
        objective='reg:squarederror',
        random_state=42,
        early_stopping_rounds=50
    )

    model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=100)
    print(f"GPU Training completed in {time.time() - start_time:.1f} seconds.")

    model.set_params(device='cpu')
    preds = np.clip(model.predict(X_val), 2.50, None)
    rmse = root_mean_squared_error(y_val, preds)

    print("\n" + "="*50)
    print(f"Validation RMSE: ${rmse:.4f}")
    print("="*50)

    joblib.dump(model, MODEL_SAVE_PATH_STANDARD)
    joblib.dump({
        "features": FEATURE_COLUMNS,
        "rmse": float(rmse),
        "model_type": "xgboost_gpu_standard"
    }, METADATA_SAVE_PATH_STANDARD)

if __name__ == "__main__":
    train_model()
