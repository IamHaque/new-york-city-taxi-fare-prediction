import numpy as np

from config import JFK_COORD, LGA_COORD, EWR_COORD, MIDTOWN_COORD

def compute_bearing(lat1, lon1, lat2, lon2):
    """Calculates the directional angle of the trip."""
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

    df['manhattan_km'] = (df['abs_lat_diff'] * 111.0) + (df['abs_lon_diff'] * 85.0)

    df['jfk_pickup_dist'] = haversine_np(df['pickup_latitude'], df['pickup_longitude'], JFK_COORD[0], JFK_COORD[1])
    df['jfk_dropoff_dist'] = haversine_np(df['dropoff_latitude'], df['dropoff_longitude'], JFK_COORD[0], JFK_COORD[1])
    df['lga_pickup_dist'] = haversine_np(df['pickup_latitude'], df['pickup_longitude'], LGA_COORD[0], LGA_COORD[1])
    df['lga_dropoff_dist'] = haversine_np(df['dropoff_latitude'], df['dropoff_longitude'], LGA_COORD[0], LGA_COORD[1])
    df['ewr_dropoff_dist'] = haversine_np(df['dropoff_latitude'], df['dropoff_longitude'], EWR_COORD[0], EWR_COORD[1])
    df['midtown_pickup_dist'] = haversine_np(df['pickup_latitude'], df['pickup_longitude'], MIDTOWN_COORD[0], MIDTOWN_COORD[1])

    df['is_jfk_trip'] = ((df['jfk_pickup_dist'] < 2.5) | (df['jfk_dropoff_dist'] < 2.5)).astype(np.uint8)
    df['is_lga_trip'] = ((df['lga_pickup_dist'] < 2.5) | (df['lga_dropoff_dist'] < 2.5)).astype(np.uint8)

    df['is_rush_hour'] = ((df['hour'] >= 16) & (df['hour'] < 20) & (df['day_of_week_num'] <= 4)).astype(np.uint8)
    df['is_overnight'] = ((df['hour'] >= 20) | (df['hour'] < 6)).astype(np.uint8)

    df['bearing'] = compute_bearing(
        df['pickup_latitude'], df['pickup_longitude'],
        df['dropoff_latitude'], df['dropoff_longitude']
    )

    df['is_post_2012_hike'] = ((df['year'] > 2012) | ((df['year'] == 2012) & (df['month'] >= 9))).astype(np.uint8)

    df['is_jfk_manhattan'] = (
        (df['is_jfk_trip'] == 1) &
        ((df['pickup_longitude'].between(-74.02, -73.93)) | (df['dropoff_longitude'].between(-74.02, -73.93)))
    ).astype(np.uint8)

    return df
