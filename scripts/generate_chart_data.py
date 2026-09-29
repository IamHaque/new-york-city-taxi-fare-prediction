"""
scripts/generate_chart_data.py
-------------------------------
Generates the JSON chart artifacts consumed by the React client (client/src/data/*.json),
so every chart in the insights dashboard is backed by numbers that actually came out of
notebooks/train.ipynb's analysis rather than numbers a UI pass invented.

These files are CHECKED-IN GENERATED ARTIFACTS: they are regenerated on demand with
`python -m scripts.generate_chart_data` (run from the repo root) followed by a normal
`npm run build` in client/ — the React app never runs Python at build time, never fetches
this data at runtime, and has no live Python dependency.

Each aggregate function's docstring names the exact pandas call in train.ipynb that it
mirrors, so a future notebook change and this script don't silently drift apart.

Cleaning/feature logic is NOT reimplemented here: the sample goes through the exact same
scripts.shared.data_utils.process_chunk pipeline the training scripts use, so chart numbers
and model numbers are computed on the same cleaned data.
"""

import json
import os

# Import order matters. scripts.shared.features bootstraps sys.path (adds scripts/shared/ and
# scripts/ to it), which is what lets scripts.shared.data_utils's flat
# (`from shared.features import ...`, `from config import ...`) imports resolve when this module
# is executed as `python -m scripts.generate_chart_data` from the repo root.
from scripts.shared.features import compute_features  # noqa: F401  (side-effect import)

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import root_mean_squared_error
from sklearn.model_selection import train_test_split

from scripts.config import (
    CHART_DATA_CHUNK_SIZE,
    CHART_DATA_SAMPLE_ROWS,
    DATA_PATH,
    METADATA_SAVE_PATH_EXTREME,
    MODEL_SAVE_PATH_EXTREME,
    TRAIN_DTYPES,
)
from scripts.shared.data_utils import process_chunk
from scripts.shared.landmarks import LANDMARK_COORDINATES

OUTPUT_DIR = os.path.join('client', 'src', 'data')

DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
MONTH_LABELS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

# Notebook-style RMSE comparison split (train.ipynb cells 10-14)
MODEL_FEATURES = ['distance_km', 'hour', 'day_of_week_num', 'month', 'passenger_count']
MODEL_TEST_FRACTION = 0.2
RANDOM_STATE = 42


def load_sample(csv_path=DATA_PATH):
    """
    Reads a configurable sample of train.csv through the shared cleaning/feature pipeline.

    Mirrors train_extreme.py's chunk-then-cap approach (read chunks, process_chunk each,
    stop at CHART_DATA_SAMPLE_ROWS clean rows, downsample with a fixed seed if over), just at
    CHART_DATA_SAMPLE_ROWS instead of EXTREME_TRAIN_MAX_ROWS — full 55M rows is unnecessary
    for aggregate charts.
    """
    print(f"Sampling up to {CHART_DATA_SAMPLE_ROWS:,} cleaned rows from {csv_path}...")

    chunks = []
    collected_rows = 0
    for chunk in pd.read_csv(
        csv_path,
        chunksize=CHART_DATA_CHUNK_SIZE,
        dtype=TRAIN_DTYPES,
        parse_dates=['pickup_datetime'],
    ):
        processed = process_chunk(chunk)
        chunks.append(processed)
        collected_rows += len(processed)
        print(f"  collected {collected_rows:,} clean rows...")
        if collected_rows >= CHART_DATA_SAMPLE_ROWS:
            break

    df = pd.concat(chunks, ignore_index=True)
    if len(df) > CHART_DATA_SAMPLE_ROWS:
        df = df.sample(n=CHART_DATA_SAMPLE_ROWS, random_state=RANDOM_STATE).reset_index(drop=True)

    print(f"Chart sample assembled: {len(df):,} rows.")
    return df


def rides_by_day_of_week(df):
    """Mirrors train.ipynb cell 5: `df.day_of_week.value_counts()` (via day_of_week_num, which
    is what process_chunk produces — same Monday=0 ordering as the notebook's day names)."""
    counts = df['day_of_week_num'].value_counts()
    return [
        {'day': DAY_LABELS[d], 'rides': int(counts.get(d, 0))}
        for d in range(7)
    ]


def rides_by_hour(df):
    """Mirrors train.ipynb cell 6: `df.hour.value_counts().sort_index()`."""
    counts = df['hour'].value_counts()
    return [
        {'hour': h, 'rides': int(counts.get(h, 0))}
        for h in range(24)
    ]


def avg_fare_by_month(df):
    """Mirrors train.ipynb cell 7: `df.groupby('month').fare_amount.mean()`."""
    means = df.groupby('month')['fare_amount'].mean()
    return [
        {'month': MONTH_LABELS[m - 1], 'avgFare': round(float(means.get(m, 0.0)), 2)}
        for m in range(1, 13)
    ]


def avg_fare_by_hour(df):
    """Same groupby-mean pattern as train.ipynb cell 7, applied to hour — replaces the
    hand-typed numbers in client/src/data/avgFareByHour.json with real ones on the identical
    schema ([{hour, avgFare}]), so FareChart.tsx needs zero code changes."""
    means = df.groupby('hour')['fare_amount'].mean()
    return [
        {'hour': h, 'avgFare': round(float(means.get(h, 0.0)), 2)}
        for h in range(24)
    ]


def _label_dropoff_bucket(lat, lon):
    """Nearest LANDMARK_COORDINATES entry within ~0.01 degrees, else the raw rounded
    coordinates. No neighborhood boundaries are invented — outside that tolerance the data
    speaks for itself."""
    best_name = None
    best_dist = 0.01
    for name, (lm_lat, lm_lon) in LANDMARK_COORDINATES.items():
        dist = ((lat - lm_lat) ** 2 + (lon - lm_lon) ** 2) ** 0.5
        if dist <= best_dist:
            best_dist = dist
            best_name = name
    if best_name:
        return best_name.title()
    return f"{lat:.2f}, {lon:.2f}"


def top_dropoff_zones(df, top_n=10):
    """Mirrors train.ipynb cell 8's bucketing —
    `df.dropoff_latitude.round(2)` / `df.dropoff_longitude.round(2)` then a groupby over the
    rounded pair — but aggregates ride COUNT as well as mean fare (cell 8 only printed the
    mean), because the dashboard chart ranks buckets by ride count."""
    buckets = (
        df.assign(
            dropoff_lat_rounded=df['dropoff_latitude'].round(2),
            dropoff_lon_rounded=df['dropoff_longitude'].round(2),
        )
        .groupby(['dropoff_lat_rounded', 'dropoff_lon_rounded'])
        .agg(rides=('fare_amount', 'size'), avgFare=('fare_amount', 'mean'))
        .sort_values('rides', ascending=False)
        .head(top_n)
    )
    return [
        {
            'label': _label_dropoff_bucket(lat, lon),
            'lat': round(float(lat), 2),
            'lon': round(float(lon), 2),
            'rides': int(row['rides']),
            'avgFare': round(float(row['avgFare']), 2),
        }
        for (lat, lon), row in buckets.iterrows()
    ]


def fare_distribution(df):
    """New (not in the notebook yet) — simple `pd.cut` + `value_counts`, the same pattern as
    the existing value_counts cells. Cleaning caps fares at $300, so the last bin is $100+."""
    bins = [0, 5, 10, 15, 20, 30, 40, 60, 100, 301]
    labels = ['$0-5', '$5-10', '$10-15', '$15-20', '$20-30', '$30-40', '$40-60', '$60-100', '$100+']
    counts = pd.cut(df['fare_amount'], bins=bins, labels=labels, right=False).value_counts()
    return [
        {
            'range': label,
            'min': bins[i],
            'max': bins[i + 1],
            'count': int(counts.get(label, 0)),
        }
        for i, label in enumerate(labels)
    ]


def fare_vs_distance_sample(df, sample_size=500):
    """Capped random sample of {distance_km, fare_amount} pairs for the scatter chart — the
    full dataset must never ship to the client (PRD v4, Story 8.2)."""
    n = min(sample_size, len(df))
    sample = df.sample(n=n, random_state=RANDOM_STATE)[['distance_km', 'fare_amount']]
    return [
        {'distance_km': round(float(d), 3), 'fare_amount': round(float(f), 2)}
        for d, f in zip(sample['distance_km'], sample['fare_amount'])
    ]


def city_average_fare(df):
    """`df.fare_amount.mean()` — the single city-wide number the fare result panel compares
    against (PRD v4, Epic 5 / Story 5.2)."""
    return {'cityAverageFare': round(float(df['fare_amount'].mean()), 2)}


def _rmse(y_true, y_pred):
    return float(root_mean_squared_error(y_true, y_pred))


def model_comparison(df):
    """Mirrors train.ipynb cells 10-14: same 5-feature set, same 80/20 split
    (`train_test_split(..., test_size=0.2, random_state=42)`), same constant-baseline /
    LinearRegression / RandomForestRegressor(n_estimators=500, max_depth=10) calls.

    Adds two entries the notebook doesn't have (PRD v4 Stories 8.3-8.4): the production
    XGBoost RMSE read from model_metadata_extreme.pkl (no retraining), and a
    single-feature "Distance only" linear regression — the Kaggle competition's own
    "$5-8 with distance alone" reference point.
    """
    X = df[MODEL_FEATURES]
    y = df['fare_amount']
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=MODEL_TEST_FRACTION, random_state=RANDOM_STATE
    )

    # Baseline (train.ipynb cell 11): always predict the training-set mean fare.
    baseline_rmse = _rmse(y_test, np.full(len(y_test), y_train.mean()))

    # Distance-only baseline (Story 8.4): single-feature linear regression on distance_km.
    # Same seed + same row count => identical split positions as the 5-feature split above.
    Xd_train, Xd_test, yd_train, yd_test = train_test_split(
        df[['distance_km']], y, test_size=MODEL_TEST_FRACTION, random_state=RANDOM_STATE
    )
    distance_model = LinearRegression().fit(Xd_train, yd_train)
    distance_rmse = _rmse(yd_test, distance_model.predict(Xd_test))

    # Linear regression (cell 12).
    linear_model = LinearRegression().fit(X_train, y_train)
    linear_rmse = _rmse(y_test, linear_model.predict(X_test))

    # Random forest (cell 13).
    rf_model = RandomForestRegressor(
        n_estimators=500, max_depth=10, random_state=RANDOM_STATE, n_jobs=-1
    )
    rf_model.fit(X_train, y_train)
    rf_rmse = _rmse(y_test, rf_model.predict(X_test))

    # Production XGBoost: RMSE is already recorded in the training metadata — load it, don't
    # retrain (Story 8.3).
    extreme_meta = joblib.load(METADATA_SAVE_PATH_EXTREME)
    xgb_rmse = float(extreme_meta['rmse'])

    return [
        {'model': 'Hardcoded (mean)', 'rmse': round(baseline_rmse, 4)},
        {'model': 'Distance only', 'rmse': round(distance_rmse, 4)},
        {'model': 'Linear Regression', 'rmse': round(linear_rmse, 4)},
        {'model': 'Random Forest', 'rmse': round(rf_rmse, 4)},
        {'model': 'XGBoost (production)', 'rmse': round(xgb_rmse, 4)},
    ]


def feature_importance():
    """The fitted production XGBoost model's `.feature_importances_` (standard
    XGBoost/sklearn API) paired with its own recorded feature-name list, sorted descending."""
    model = joblib.load(MODEL_SAVE_PATH_EXTREME)
    meta = joblib.load(METADATA_SAVE_PATH_EXTREME)
    names = meta['features']
    importances = model.feature_importances_
    pairs = sorted(zip(names, importances), key=lambda p: p[1], reverse=True)
    return [
        {'feature': name, 'importance': round(float(imp), 6)}
        for name, imp in pairs
    ]


def write_json(filename, payload):
    """Writes one artifact into client/src/data/ with stable formatting for clean git diffs."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    path = os.path.join(OUTPUT_DIR, filename)
    with open(path, 'w', encoding='utf-8') as handle:
        json.dump(payload, handle, indent=2)
        handle.write('\n')
    print(f"  wrote {path}")


def main():
    print("=" * 50)
    print("GENERATING CHART DATA FOR client/src/data/")
    print("=" * 50)

    df = load_sample()

    print("Computing aggregates...")
    write_json('rides_by_day.json', rides_by_day_of_week(df))
    write_json('rides_by_hour.json', rides_by_hour(df))
    write_json('avg_fare_by_month.json', avg_fare_by_month(df))
    write_json('avgFareByHour.json', avg_fare_by_hour(df))
    write_json('top_dropoffs.json', top_dropoff_zones(df))
    write_json('fare_distribution.json', fare_distribution(df))
    write_json('fare_vs_distance_sample.json', fare_vs_distance_sample(df))
    write_json('city_average_fare.json', city_average_fare(df))

    print("Computing model comparison (includes a random forest fit)...")
    write_json('model_comparison.json', model_comparison(df))
    write_json('feature_importance.json', feature_importance())

    print("=" * 50)
    print("Done. Regenerate the client with: cd client && npm run build")
    print("=" * 50)


if __name__ == '__main__':
    main()
