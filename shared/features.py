import numpy as np
import pandas as pd

# NYC Geographic Boundaries
NYC_LAT_MIN, NYC_LAT_MAX = 40.50, 40.95
NYC_LON_MIN, NYC_LON_MAX = -74.25, -73.70

# Major NYC Airport & Landmark Coordinates
JFK_COORD = (40.6413, -73.7781)
LGA_COORD = (40.7769, -73.8740)
EWR_COORD = (40.6895, -74.1745)
MIDTOWN_COORD = (40.7580, -73.9855)

FEATURE_COLUMNS = [
    'pickup_longitude', 'pickup_latitude',
    'dropoff_longitude', 'dropoff_latitude',
    'passenger_count',
    'hour', 'day_of_week_num', 'month', 'year',
    'distance_km', 'manhattan_km',
    'abs_lat_diff', 'abs_lon_diff',
    'jfk_pickup_dist', 'jfk_dropoff_dist',
    'lga_pickup_dist', 'lga_dropoff_dist',
    'ewr_dropoff_dist', 'midtown_pickup_dist',
    'is_jfk_trip', 'is_lga_trip',
    'is_rush_hour', 'is_overnight',
    'bearing', 'is_post_2012_hike', 'is_jfk_manhattan'
]

def compute_bearing(lat1, lon1, lat2, lon2):
    """Calculates the directional angle of the trip to capture avenue vs. cross-street traffic."""
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
    dlon = lon2 - lon1
    x = np.sin(dlon) * np.cos(lat2)
    y = np.cos(lat1) * np.sin(lat2) - np.sin(lat1) * np.cos(lat2) * np.cos(dlon)
    return np.degrees(np.arctan2(x, y))

def haversine_np(lat1, lon1, lat2, lon2):
    """Vectorized Haversine distance in kilometers."""
    R = 6371.0
    phi1, phi2 = np.radians(lat1), np.radians(lat2)
    dphi = np.radians(lat2 - lat1)
    dlambda = np.radians(lon2 - lon1)

    a = np.sin(dphi / 2.0)**2 + np.cos(phi1) * np.cos(phi2) * np.sin(dlambda / 2.0)**2
    c = 2.0 * np.arctan2(np.sqrt(a), np.sqrt(1.0 - a))
    return R * c

def compute_features(df):
    """Applies distance and surcharge feature engineering to a DataFrame."""
    df['abs_lat_diff'] = (df['dropoff_latitude'] - df['pickup_latitude']).abs()
    df['abs_lon_diff'] = (df['dropoff_longitude'] - df['pickup_longitude']).abs()

    df['distance_km'] = haversine_np(
        df['pickup_latitude'], df['pickup_longitude'],
        df['dropoff_latitude'], df['dropoff_longitude']
    )

    # Manhattan distance proxy
    df['manhattan_km'] = (df['abs_lat_diff'] * 111.0) + (df['abs_lon_diff'] * 85.0)

    # Airport proximities
    df['jfk_pickup_dist'] = haversine_np(df['pickup_latitude'], df['pickup_longitude'], JFK_COORD[0], JFK_COORD[1])
    df['jfk_dropoff_dist'] = haversine_np(df['dropoff_latitude'], df['dropoff_longitude'], JFK_COORD[0], JFK_COORD[1])

    df['lga_pickup_dist'] = haversine_np(df['pickup_latitude'], df['pickup_longitude'], LGA_COORD[0], LGA_COORD[1])
    df['lga_dropoff_dist'] = haversine_np(df['dropoff_latitude'], df['dropoff_longitude'], LGA_COORD[0], LGA_COORD[1])

    df['ewr_dropoff_dist'] = haversine_np(df['dropoff_latitude'], df['dropoff_longitude'], EWR_COORD[0], EWR_COORD[1])
    df['midtown_pickup_dist'] = haversine_np(df['pickup_latitude'], df['pickup_longitude'], MIDTOWN_COORD[0], MIDTOWN_COORD[1])

    df['is_jfk_trip'] = ((df['jfk_pickup_dist'] < 2.5) | (df['jfk_dropoff_dist'] < 2.5)).astype(np.uint8)
    df['is_lga_trip'] = ((df['lga_pickup_dist'] < 2.5) | (df['lga_dropoff_dist'] < 2.5)).astype(np.uint8)

    # Time-based surcharge proxies
    # Rush hour: 4 PM - 8 PM on weekdays
    df['is_rush_hour'] = ((df['hour'] >= 16) & (df['hour'] < 20) & (df['day_of_week_num'] <= 4)).astype(np.uint8)
    # Overnight: 8 PM - 6 AM daily
    df['is_overnight'] = ((df['hour'] >= 20) | (df['hour'] < 6)).astype(np.uint8)

    # Spatial Feature: Trip Bearing
    df['bearing'] = compute_bearing(
        df['pickup_latitude'], df['pickup_longitude'],
        df['dropoff_latitude'], df['dropoff_longitude']
    )

    # Temporal Feature: 2012 NYC Taxi Fare Hike (Sept 2012)
    df['is_post_2012_hike'] = ((df['year'] > 2012) | ((df['year'] == 2012) & (df['month'] >= 9))).astype(np.uint8)

    # Domain Feature: JFK to Manhattan Flat Rate Proxy
    # If it's a JFK trip and the other coordinate is in Manhattan's longitude bound
    df['is_jfk_manhattan'] = (
        (df['is_jfk_trip'] == 1) &
        ((df['pickup_longitude'].between(-74.02, -73.93)) | (df['dropoff_longitude'].between(-74.02, -73.93)))
    ).astype(np.uint8)

    return df
