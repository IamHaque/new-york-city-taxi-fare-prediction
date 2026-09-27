"""
scripts/train_extreme.py
------------------------
Single-pass extreme training script for NYC Taxi Fare Prediction.
Combines 10M row random sample ingestion with Log-Target Transformation
and GPU acceleration to push RMSE scores below 3.0.
"""

import gc
import joblib
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import root_mean_squared_error
from sklearn.model_selection import train_test_split

from config import (
    DATA_PATH, FEATURE_COLUMNS, TRAIN_DTYPES,
    TRAIN_MAX_ROWS, STANDARD_VAL_SIZE_FRACTION,
    MODEL_SAVE_PATH_INCREMENTAL, METADATA_SAVE_PATH_INCREMENTAL
)
from shared.data_utils import process_chunk

def train_extreme_model(csv_path):
    print(f"Starting extreme single-pass GPU training (Targeting up to {TRAIN_MAX_ROWS:,} rows)[cite: 6]...")

    chunks = []
    collected_rows = 0

    # Ingest data using your existing chunking pipeline from config & data_utils[cite: 6, 8]
    for chunk in pd.read_csv(csv_path, chunksize=1_000_000, dtype=TRAIN_DTYPES, parse_dates=['pickup_datetime']):
        processed_chunk = process_chunk(chunk)
        chunks.append(processed_chunk)
        collected_rows += len(processed_chunk)

        print(f"Collected {collected_rows:,} clean rows...")
        if collected_rows >= TRAIN_MAX_ROWS:
            break

    # Stitch the single-pass training matrix together
    df = pd.concat(chunks, ignore_index=True)
    if len(df) > TRAIN_MAX_ROWS:
        df = df.sample(n=TRAIN_MAX_ROWS, random_state=42)

    print(f"Final training matrix assembled: {len(df):,} rows. Preparing features and log-target...")

    X = df[FEATURE_COLUMNS]

    # CRITICAL OPTIMIZATION: Log-transform the target variable to compress extreme outliers
    # and directly optimize the RMSE loss function.
    y_raw = df['fare_amount'].values
    y = np.log1p(y_raw)

    del df
    gc.collect()

    # Train/Validation split (95% / 5%)[cite: 6]
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=STANDARD_VAL_SIZE_FRACTION, random_state=42
    )

    print("Initializing XGBoost Regressor on RTX 3050 GPU...")
    model = xgb.XGBRegressor(
        n_estimators=3500,
        learning_rate=0.03,
        max_depth=10,             # Deep trees to accurately map grid blocks
        subsample=0.85,
        colsample_bytree=0.85,
        tree_method='hist',
        device='cuda',            # Routes computation to your NVIDIA GPU
        objective='reg:squarederror',
        random_state=42,
        early_stopping_rounds=60  # Automatically halts when validation loss stops improving
    )

    print(f"Training on {len(X_train):,} rows with early stopping...")
    model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=100)

    # Shift model back to CPU for production server / inference compatibility
    model.set_params(device='cpu')

    # Predict in log-space, then invert via expm1 to evaluate true dollar-scale RMSE
    preds_log = model.predict(X_val)
    preds = np.expm1(preds_log)
    preds = np.clip(preds, 2.50, None)  # Enforce statutory minimum base rate[cite: 6]

    y_val_actual = np.expm1(y_val)
    final_rmse = root_mean_squared_error(y_val_actual, preds)

    print("\n" + "="*50)
    print(f"EXTREME MODEL VALIDATION RMSE (Real Dollar Scale): ${final_rmse:.4f}")
    print("="*50)

    # Save artifacts overriding the incremental path so app_2.py loads it automatically
    joblib.dump(model, MODEL_SAVE_PATH_INCREMENTAL)
    joblib.dump({
        "features": FEATURE_COLUMNS,
        "rmse": float(final_rmse),
        "model_type": "xgboost_gpu_extreme_log"
    }, METADATA_SAVE_PATH_INCREMENTAL)

    print("Saved optimized extreme model artifacts successfully.")

if __name__ == "__main__":
    train_extreme_model(DATA_PATH)
