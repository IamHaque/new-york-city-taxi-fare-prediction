import numpy as np

from shared.features import compute_features
from config import NYC_LAT_MIN, NYC_LAT_MAX, NYC_LON_MIN, NYC_LON_MAX

def process_chunk(chunk):
    """Parses temporal data, applies geographical constraints, and generates features."""
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

    return chunk
