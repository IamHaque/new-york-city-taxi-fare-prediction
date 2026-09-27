# ==========================================
# API & Paths
# ==========================================
API_URL = 'http://localhost:5000/predict'
HEADERS = {'Content-Type': 'application/json'}
DATA_PATH = './new-york-city-taxi-fare-prediction/train.csv'
TEST_DATA_PATH = './new-york-city-taxi-fare-prediction/test.csv'
SUBMISSION_PATH = './new-york-city-taxi-fare-prediction/submission.csv'

# ==========================================
# Model Output Paths
# ==========================================
MODEL_SAVE_PATH_STANDARD = "./trained-models/fare_model_standard.pkl"
METADATA_SAVE_PATH_STANDARD = "./trained-models/model_metadata_standard.pkl"

MODEL_SAVE_PATH_INCREMENTAL = "./trained-models/fare_model_full.pkl"
METADATA_SAVE_PATH_INCREMENTAL = "./trained-models/model_metadata_full.pkl"

# ==========================================
# Training & Validation Parameters
# ==========================================
# Standard in-memory training
TRAIN_MAX_ROWS = 10_000_000
TRAIN_CHUNK_SIZE_STANDARD = 1_000_000
STANDARD_VAL_SIZE_FRACTION = 0.05

# Incremental (Out-of-core) training
TOTAL_DATASET_ROWS = 55_423_856
INCREMENTAL_CHUNK_SIZE = 4_000_000
INCREMENTAL_VAL_SIZE_ROWS = 200_000

# ==========================================
# API Evaluation Parameters
# ==========================================
API_TEST_SKIP_ROWS = 500_000
API_TEST_READ_ROWS = 20_000
API_TEST_SAMPLE_SIZE = 10_000

# ==========================================
# NYC Geographic Boundaries & Coordinates
# ==========================================
NYC_LAT_MIN, NYC_LAT_MAX = 40.50, 40.95
NYC_LON_MIN, NYC_LON_MAX = -74.25, -73.70

JFK_COORD = (40.6413, -73.7781)
LGA_COORD = (40.7769, -73.8740)
EWR_COORD = (40.6895, -74.1745)
MIDTOWN_COORD = (40.7580, -73.9855)

# ==========================================
# Data Types & Features
# ==========================================
TRAIN_DTYPES = {
    'fare_amount': 'float32',
    'pickup_longitude': 'float32',
    'pickup_latitude': 'float32',
    'dropoff_longitude': 'float32',
    'dropoff_latitude': 'float32',
    'passenger_count': 'uint8'
}

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

# ==========================================
# Server Configuration & API Mapping
# ==========================================
SERVER_HOST = '0.0.0.0'
SERVER_PORT = 5000
MIN_FARE_AMOUNT = 2.50

# Column mapping from API payload to model feature set
API_COLUMN_MAPPING = {
    'pickup_lat': 'pickup_latitude',
    'pickup_lon': 'pickup_longitude',
    'dropoff_lat': 'dropoff_latitude',
    'dropoff_lon': 'dropoff_longitude'
}

COORDINATE_COLUMNS = [
    'pickup_latitude', 'pickup_longitude',
    'dropoff_latitude', 'dropoff_longitude'
]

# ==========================================
# LLM / Ollama Configuration
# ==========================================
OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL_NAME = "llama3:8b"
TRIP_PARSER_PROMPT_TEMPLATE = (
    'Extract structured trip details from this text as JSON only, no explanation:\n'
    'Text: "{user_text}"\n'
    'Return exactly this shape:\n'
    '{{"pickup_landmark": "", "dropoff_landmark": "", "hour": 0, "day_of_week_num": 0, "month": 0, "year": 0, "passenger_count": 1}}'
)
