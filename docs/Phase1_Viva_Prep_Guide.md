# Phase 1 — Detailed Viva Preparation Guide

### RTB C16 — AI & ML | Evaluation Phase 1: topic viva across Milestones 1–5

This guide follows the milestone structure in [`docs/RTB-C16-AI-ML.md`](RTB-C16-AI-ML.md) exactly.
For each milestone: the concepts as the case study brief states them, **how this specific repo
implements that concept** (real file, real code), and a set of likely viva questions with model
answers. The viva draws questions **randomly** from any milestone — read all five, not just the ones
that feel most relevant to "the demo."

**How to use this guide:** know the concept well enough to explain it without the code in front of
you, then know _where_ in this repo it lives well enough to point to it if asked "show me." Examiners
in a viva of this style are usually testing whether you understand what your own project does, not
whether you've memorized a textbook definition.

---

## Milestone 1 — Introduction to AI and ML

### 1.1 What is AI, and what is ML (and how do they relate)?

- **Artificial Intelligence** is the broad field: building systems that perform tasks which would
  normally require human intelligence (reasoning, perception, language, decision-making).
- **Machine Learning** is a subset of AI: systems that improve their performance on a task by
  learning patterns from data, rather than being explicitly programmed with rules for every case.
- **This project is ML, not "hand-coded AI."** Nobody wrote `if distance > 10km: fare = ...` rules.
  Instead, `scripts/train_extreme.py` shows the algorithm 20 million labeled examples
  (`{features} → fare_amount`) and it learns the mapping itself.

### 1.2 Types of AI: Narrow, General, Superintelligent

| Type                        | Definition                                               | Where this project sits                                                                                                                                                                                                                                      |
| --------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Narrow AI (ANI)**         | Designed for one specific task; no capability outside it | **This is what we built.** The XGBoost model predicts taxi fares. It cannot drive a car, hold a conversation, or predict anything else. Even the Ollama LLM in `/parse-trip` is used narrowly — one prompt template, one job (extract trip fields from text) |
| **General AI (AGI)**        | Human-level reasoning across _any_ task, not just one    | Hypothetical; doesn't exist yet. Not what this project is                                                                                                                                                                                                    |
| **Superintelligence (ASI)** | Beyond human-level, across all domains                   | Purely theoretical/philosophical at this point                                                                                                                                                                                                               |

**Likely question:** _"Is the LLM you're using for text parsing 'the AI' in this project, or is the
fare model?"_
**Answer:** Both are narrow AI, doing two different jobs. The XGBoost model is the actual prediction
engine — regression on structured, engineered features. The LLM (`llama3:8b` via Ollama) is used only
as a **text-to-structured-data extractor** in `server/services.py::parse_trip_description_via_llm` —
it never sees or predicts a fare itself. The two are architecturally separate and could be swapped
independently.

### 1.3 Types of ML: Supervised, Unsupervised, Reinforcement Learning

| Type                       | How it learns                                           | Example                                             | In this project                                                                                                                                                                                     |
| -------------------------- | ------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Supervised**             | Learns from labeled input→output pairs                  | Predict house price from features, given past sales | **This is the whole project.** Every training row has a known `fare_amount` (the label) alongside pickup/drop-off/time/passenger features                                                           |
| **Unsupervised**           | Finds structure in unlabeled data                       | Customer segmentation via clustering                | Not used here, though a natural extension: clustering pickup/drop-off points into named zones instead of the fixed landmark table (see `scripts/shared/landmarks.py`) would be an unsupervised step |
| **Reinforcement Learning** | Learns via reward/penalty from acting in an environment | A game-playing agent                                | Not used here — there's no sequential decision-making or reward signal in this problem                                                                                                              |

**Likely question:** _"Why is this a supervised regression problem specifically, not classification?"_
**Answer:** The target, `fare_amount`, is a **continuous** dollar value, not a category. Regression
predicts a number; classification predicts a label from a fixed set. If we were instead predicting
"cheap / moderate / expensive," that would be classification — but the case study explicitly asks for
a fare _amount_, so regression is the correct framing (`scripts/train_extreme.py` uses
`xgb.XGBRegressor`, not `XGBClassifier`).

### 1.4 Key terminologies, mapped to this project

| Term                | General definition                                             | Concretely, in this repo                                                                                                                                         |
| ------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Algorithm**       | The learning procedure                                         | Gradient-boosted decision trees (XGBoost)                                                                                                                        |
| **Model**           | The algorithm's learned state, after training                  | `trained-models/*.pkl` — a fitted `XGBRegressor` object, saved with `joblib.dump`                                                                                |
| **Dataset**         | The data used to train/evaluate                                | Kaggle's `train.csv`, 55,423,856 rows (`TOTAL_DATASET_ROWS` in `scripts/config.py`)                                                                              |
| **Training**        | Fitting the model to data                                      | `model.fit(X_train, y_train, ...)` in `scripts/train_extreme.py`                                                                                                 |
| **Testing**         | Evaluating on unseen data                                      | The held-out validation split inside training scripts, plus `scripts/evaluate_api.py`'s separate holdout-MAE check against the _live API_                        |
| **Features**        | The input variables the model sees                             | The 26 columns in `FEATURE_COLUMNS` (`scripts/config.py`) — see Milestone 3                                                                                      |
| **Labels**          | The target/output the model learns to predict                  | `fare_amount`                                                                                                                                                    |
| **Neural networks** | A specific model architecture (layers of weighted connections) | **Not used here.** XGBoost is decision-tree-based, not a neural network. Worth being explicit about this if asked — this project is "ML" but not "deep learning" |

**Likely question:** _"Where exactly does 'training' happen, and how do you know it worked?"_
**Answer:** Training happens in `scripts/train_extreme.py::train_extreme_model()` — it reads
`train.csv` in chunks, cleans each chunk, engineers features, then calls `model.fit()` with an
`eval_set` so XGBoost can track validation loss and stop early (`early_stopping_rounds=60`) once it
stops improving. We know it worked because the final validation RMSE (computed on data the model
never trained on) is printed and saved to `model_metadata_extreme.pkl` — currently **≈$3.55**, well
under Kaggle's own "$5–8 with distance alone" reference point for this exact competition.

### 1.5 AI/ML in Frontend Development — use cases

The case study asks for a real-world example of AI/ML changing frontend UX. This project _is_ one:

- **Traditional form:** four number inputs (lat/lon × 2), a date picker, a passenger count.
- **AI-enhanced form:** the exact same data, but the person can also just type
  _"2 people from Times Square to JFK Friday at 6pm"_ and have the LLM fill every field — including
  running the prediction — in one step (`client/src/components/TripInputCard/TripInputCard.tsx`'s
  describe-box, wired to `server/app.py`'s `/parse-trip`).

Other well-known examples worth having ready if asked for _industry_ cases beyond this project:
e-commerce recommendation engines (Amazon), fraud-detection on checkout forms, healthcare triage
chatbots, and social media feed ranking.

---

## Milestone 2 — Python for AI/ML

### 2.1 NumPy — vectorized numeric computation

Used throughout `scripts/shared/features.py` for **vectorized** math — operating on an entire column
of millions of rows at once, instead of looping row by row (which would be catastrophically slow at
55 million rows).

```python
def haversine_np(lat1, lon1, lat2, lon2):
    """Vectorized Haversine distance in kilometers."""
    R = 6371.0
    phi1, phi2 = np.radians(lat1), np.radians(lat2)
    dphi = np.radians(lat2 - lat1)
    dlambda = np.radians(lon2 - lon1)
    a = np.sin(dphi / 2.0)**2 + np.cos(phi1) * np.cos(phi2) * np.sin(dlambda / 2.0)**2
    c = 2.0 * np.arctan2(np.sqrt(a), np.sqrt(1.0 - a))
    return R * c
```

**Likely question:** _"Why not just loop over the rows with a `for` loop and compute distance one at
a time?"_
**Answer:** A Python-level loop over 20 million rows is orders of magnitude slower than NumPy's
vectorized operations, which push the loop down into compiled C code operating on whole arrays at
once. `haversine_np` takes four pandas Series (columns) and returns a new Series in one call — no
explicit loop in Python at all.

### 2.2 Pandas — tabular data manipulation

`scripts/shared/data_utils.py::process_chunk` is the single best example in this repo:

```python
def process_chunk(chunk):
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
```

This single function demonstrates: **datetime accessors** (`.dt.hour`, `.dt.dayofweek`), **boolean
masking** (building a condition column-by-column with `&`, then filtering with it), **dtype
downcasting** (`uint8`/`uint16` instead of the pandas default `int64`, to cut memory use when you're
holding millions of rows in memory), and **method chaining** (filter → engineer → filter again).

**Likely question:** _"Why cast `hour` to `uint8` instead of just leaving it as a normal int?"_
**Answer:** `uint8` holds values 0–255, more than enough for an hour (0–23), and uses 1 byte per value
instead of pandas' default 8 bytes for `int64`. Across 20 million rows and several such columns, that
adds up to real memory savings during training — this matters because `TRAIN_DTYPES` in
`scripts/config.py` applies the same discipline at CSV read time (`pickup_longitude`: `float32`,
`passenger_count`: `uint8`, etc.), not just here.

### 2.3 Matplotlib / Seaborn — visualization

Used in `notebooks/train.ipynb` for the exploratory data analysis: distribution histograms, bar
charts of rides-by-day/hour, scatter plots of fare vs. distance. In production, the equivalent charts
are **regenerated as data** (not images) by `scripts/generate_chart_data.py` and rendered client-side
with Recharts — worth mentioning if asked how EDA in a notebook differs from EDA in a shipped product:
the notebook is for the analyst; the JSON + Recharts pipeline is for the end user's browser.

### 2.4 Data structures: lists, tuples, dicts, sets

Concrete examples already in this repo rather than generic textbook ones:

```python
# Tuple — fixed-size, immutable coordinate pair (scripts/config.py)
JFK_COORD = (40.6413, -73.7781)

# List — the ordered feature set the model expects, order matters for some model types
FEATURE_COLUMNS = ['pickup_longitude', 'pickup_latitude', ..., 'is_jfk_manhattan']

# Dict — landmark name -> coordinate tuple lookup (scripts/shared/landmarks.py)
LANDMARK_COORDINATES = {
    'times square': (40.7580, -73.9855),
    'jfk airport': (40.6413, -73.7781),
    ...
}

# Set — implicitly used any time we care about membership, e.g. checking a value
# is one of a fixed group of valid states, though this repo mostly uses list/dict
```

**Likely question:** _"Why a tuple for `JFK_COORD` instead of a list?"_
**Answer:** A coordinate pair is fixed at exactly two values and should never be mutated in place —
tuples communicate "this is a fixed, immutable pair" and are slightly more memory-efficient than lists
for that reason.

### 2.5 Functions and modules

The whole `scripts/` package is organized as importable modules rather than one giant script —
`scripts/shared/features.py`, `scripts/shared/data_utils.py`, and `scripts/shared/landmarks.py` are
each imported by multiple entry points (`train_extreme.py`, `train_incremental.py`,
`generate_chart_data.py`, `server/app.py`) so the cleaning/feature logic is written **once** and
reused everywhere, rather than copy-pasted into each script.

### 2.6 Jupyter Notebooks for experimentation

`notebooks/train.ipynb` is where the original exploratory work happened — EDA (`groupby`,
`value_counts`), the first baseline/linear/random-forest model comparisons, before that logic was
"promoted" into production scripts (`train_extreme.py` for the real model,
`generate_chart_data.py::model_comparison()` for a live-recomputed version of the same comparison used
by the dashboard).

---

## Milestone 3 — Data Preprocessing

This is the milestone with the most code to point to. Know `scripts/shared/data_utils.py` and
`scripts/shared/features.py` well.

### 3.1 Data cleaning

| Cleaning step     | Code                                                                       | Why                                                                                                                                                               |
| ----------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fare range        | `fare_amount >= 2.50 & <= 300.0`                                           | $2.50 is NYC's legal minimum base fare; $300 caps extreme outliers/data errors (a $4,000 "fare" is almost certainly bad data)                                     |
| Passenger count   | `1 <= passenger_count <= 6`                                                | Legal NYC taxi capacity; `0` passengers is a data error, `208` (seen in raw Kaggle data during EDA) is obviously bad                                              |
| Geographic bounds | pickup/drop-off lat within `[40.50, 40.95]`, lon within `[-74.25, -73.70]` | Excludes coordinates that are `(0, 0)`, in the ocean, or otherwise clearly not a real NYC trip                                                                    |
| Distance bounds   | `0.10 <= distance_km <= 85.0` (applied _after_ feature engineering)        | A trip under 100m is likely a data error (or a cancelled fare); 85km is roughly NYC-to-the-edge-of-its-suburbs — further than that is out of scope for this model |

**Likely question:** _"Why filter by distance \_after_ computing features, not before?"\_
**Answer:** `distance_km` doesn't exist until `compute_features()` derives it from the coordinates —
you can't filter on a column that hasn't been calculated yet. `process_chunk` deliberately orders
this as: clean on raw columns → engineer features → clean again on a now-derived column.

**Likely question:** _"What would happen if you skipped cleaning and trained on raw data?"_
**Answer:** The model would waste capacity trying to fit noise and errors (negative fares,
impossible coordinates), which typically **increases** validation error, not decreases it — a model
that has learned to partially accommodate a $-52 fare or a passenger count of 208 fits those outliers
at the expense of getting realistic trips right.

### 3.2 Feature engineering — the 26 columns in `FEATURE_COLUMNS`

This is `scripts/shared/features.py::compute_features()`. Walk through it in groups:

**Distance features** (the single most important group — see Milestone 4's feature-importance chart):

```python
df['distance_km'] = haversine_np(pickup_lat, pickup_lon, dropoff_lat, dropoff_lon)   # straight-line
df['manhattan_km'] = (abs_lat_diff * 111.0) + (abs_lon_diff * 85.0)                   # grid-distance
df['abs_lat_diff'], df['abs_lon_diff']                                                # raw components
```

Two different distance measures are included because NYC streets are laid out on a grid — a taxi
rarely travels the straight-line (as-the-crow-flies) distance. `manhattan_km` approximates the
grid-walking distance a real trip takes, using rough km-per-degree constants (111 km/° latitude is a
near-constant everywhere on Earth; 85 km/° longitude is specific to NYC's latitude, since longitude
degrees shrink toward the poles).

**Airport distance features** — six columns, distance from each of pickup/drop-off to JFK and LGA,
plus drop-off to EWR:

```python
df['jfk_pickup_dist'] = haversine_np(pickup_lat, pickup_lon, *JFK_COORD)
df['is_jfk_trip'] = ((df['jfk_pickup_dist'] < 2.5) | (df['jfk_dropoff_dist'] < 2.5)).astype(np.uint8)
```

**Why this matters for a viva answer:** NYC airport trips are priced differently in reality (JFK has
a long-standing flat-rate rule to/from Manhattan) — without an explicit signal, a plain
distance-based model would systematically **mispredict** every airport trip, since the fare doesn't
scale with distance the same way a cross-town trip does. `is_jfk_manhattan` narrows this further:

```python
df['is_jfk_manhattan'] = (
    (df['is_jfk_trip'] == 1) &
    (pickup_lon.between(-74.02, -73.93) | dropoff_lon.between(-74.02, -73.93))
).astype(np.uint8)
```

**Time features:**

```python
df['is_rush_hour'] = ((hour >= 16) & (hour < 20) & (day_of_week_num <= 4)).astype(np.uint8)
df['is_overnight'] = ((hour >= 20) | (hour < 6)).astype(np.uint8)
df['is_post_2012_hike'] = ((year > 2012) | ((year == 2012) & (month >= 9))).astype(np.uint8)
```

`is_post_2012_hike` is a real piece of domain knowledge: NYC taxi fares actually increased in
September 2012. Without this flag, the model has to _infer_ a structural price shift purely from
`year`/`month` interacting with fare — an explicit flag makes that easy to learn instead of hoping the
tree-splitting process finds it.

**Bearing (direction of travel):**

```python
def compute_bearing(lat1, lon1, lat2, lon2):
    x = np.sin(dlon) * np.cos(lat2)
    y = np.cos(lat1) * np.sin(lat2) - np.sin(lat1) * np.cos(lat2) * np.cos(dlon)
    return np.degrees(np.arctan2(x, y))
```

Captures _which direction_ a trip travels, not just how far — potentially useful since e.g.
traffic/tolls differ by direction (crossing into Manhattan vs. out of it).

**Likely question:** _"You have both `distance_km` and `manhattan_km` — isn't that redundant?"_
**Answer:** They're correlated but not identical, and correlated-but-not-identical features are
exactly what tree-based models like XGBoost can exploit — each tree split can pick whichever of the
two better separates the data at that point, and having both gives the model more ways to approximate
the true (grid-constrained, one-way-street-constrained) driving distance than either alone.

### 3.3 Feature encoding, selection, train-test split

- **Encoding:** every feature here is already numeric (coordinates, counts, booleans-as-0/1) — there's
  no categorical string column needing one-hot or label encoding in this feature set, which is worth
  noting explicitly if asked, since "encoding categorical variables" is named in the case study
  brief but doesn't literally apply to this particular feature set.
- **Selection:** `FEATURE_COLUMNS` in `scripts/config.py` _is_ the feature selection — a deliberately
  chosen list of 26 columns, not "every column in the dataframe." `key` (a row identifier) and the raw
  `pickup_datetime` string are examples of columns present in the raw data but deliberately excluded.
- **Train/test split:** `sklearn.model_selection.train_test_split`, used consistently across
  `train_extreme.py` (95/5 train/validation), `train_incremental.py` (a fixed-row validation carve-out
  from the first chunk only, reused across all later chunks so validation never leaks into training),
  and `generate_chart_data.py`'s model comparison (80/20, `random_state=42` for reproducibility).

**Likely question:** _"Why is the validation set carved from only the \_first_ chunk in
`train_incremental.py`, not resampled from every chunk?"\_
**Answer:** Out-of-core training processes the 55M rows in sequential chunks and never holds the
whole dataset in memory at once. Carving validation from the first chunk and holding it fixed for
every subsequent `model.fit(..., xgb_model=model.get_booster())` call gives one **consistent**
held-out set to measure progress against across the whole incremental run — resampling validation
data from every chunk would mean comparing RMSE against a different yardstick each time.

---

## Milestone 4 — Machine Learning Fundamentals

### 4.1 The ML pipeline, mapped to this repo

```
Data Collection  → Kaggle's train.csv (external, already collected)
Preprocessing    → scripts/shared/data_utils.py::process_chunk
Feature Eng.     → scripts/shared/features.py::compute_features
Model Building   → scripts/train_extreme.py (xgb.XGBRegressor)
Evaluation       → RMSE on held-out validation split; scripts/evaluate_api.py's holdout MAE
Deployment       → server/app.py, loaded via joblib, served over Flask
```

### 4.2 Supervised learning: regression here, contrasted with classification

Already covered in Milestone 1.3 — be ready to give a one-line definition of each on demand:
**regression** predicts a continuous number (fare in dollars); **classification** predicts a discrete
label from a fixed set (this project uses neither clustering nor classification anywhere).

### 4.3 Evaluation metrics — know RMSE cold

This project uses **RMSE (Root Mean Squared Error)** everywhere, exclusively:

```
RMSE = sqrt( (1/n) * Σ (y_predicted - y_actual)² )
```

```python
from sklearn.metrics import root_mean_squared_error
final_rmse = root_mean_squared_error(y_val_actual, preds)
```

**Likely question:** _"Why RMSE and not, say, MAE or R²?"_
**Answer:** Three reasons, and it's worth having all three ready:

1. **It's what the Kaggle competition itself is scored on** — using the competition's own metric
   makes our reported numbers directly comparable to the leaderboard and to the case study's own
   "$5–8 with distance alone" reference point.
2. **RMSE penalizes large errors more than small ones** (because errors are squared before
   averaging), which fits a domain where a wildly wrong fare prediction (e.g. predicting $12 for an
   actual $80 airport trip) is a much worse failure than being off by $1 on an average trip. MAE (Mean
   Absolute Error) would treat both mistakes as scaling linearly, understating how bad the big misses
   are.
3. **It's in the same units as the target** (dollars), unlike MSE (which would be in _squared_
   dollars) — RMSE of $3.55 is directly interpretable as "typically off by about three and a half
   dollars," where MSE's $12.60 (3.55²) isn't a naturally meaningful number.

**Likely question:** _"What does an RMSE of $3.55 actually mean in practice?"_
**Answer:** On the held-out validation set, the model's predictions are, in a root-mean-square sense,
about $3.55 away from the true fare on average. Since NYC fares in this dataset average around
$11 (see `city_average_fare.json`), that's roughly 30% relative error at the mean — reasonable for a
model using only pickup/drop-off/time/passenger data with no live traffic or exact route information.

**Precision/recall/F1/ROC-AUC** are classification metrics and **do not apply here** — a correct viva
answer to "what's your precision?" is to explain _why_ that question doesn't fit a regression problem,
not to make up a number.

### 4.4 Overfitting and underfitting, and how the code guards against them

| Concept          | Symptom                                                                                 | Where it's addressed in this repo                                                                                                                                                                                                                                                                                                                |
| ---------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Overfitting**  | Model fits training data (incl. its noise) very well but generalizes poorly to new data | `early_stopping_rounds=60` in `train_extreme.py` — training halts once validation loss stops improving, rather than continuing to fit the training set indefinitely; `max_depth=10` and `subsample=0.85`/`colsample_bytree=0.85` (only 85% of rows/columns considered per tree) limit how tightly any single tree can memorize the training data |
| **Underfitting** | Model is too simple to capture real patterns, performs poorly even on training data     | The **model comparison chart** is direct evidence against this — the hardcoded-mean baseline (RMSE ~$9.90) clearly underfits; each step up (distance-only → 5-feature linear → random forest → the full 26-feature XGBoost) captures more real signal and reduces RMSE, ending at ~$3.55                                                         |

**Likely question:** _"How would you \_know_ if the model were overfitting, if you saw it happen?"\_
**Answer:** Training loss would keep dropping while validation loss (the `eval_set` XGBoost tracks
during `.fit()`) plateaus or starts rising — that divergence between training and validation error is
the textbook overfitting signature, and it's exactly what `early_stopping_rounds` is watching for.

### 4.5 Hyperparameter tuning — read directly from the code

`train_extreme.py`'s `XGBRegressor` call has several hyperparameters set deliberately, not left at
defaults:

```python
model = xgb.XGBRegressor(
    n_estimators=3500,       # number of boosting rounds (trees)
    learning_rate=0.03,      # how much each tree corrects the previous ensemble's error
    max_depth=10,            # how deep each individual tree can grow
    subsample=0.85,          # fraction of rows sampled per tree (reduces overfitting/variance)
    colsample_bytree=0.85,   # fraction of features sampled per tree (same purpose)
    tree_method='hist',      # histogram-based split-finding — much faster on large data
    device='cuda',           # train on GPU
    objective='reg:squarederror',
    early_stopping_rounds=60
)
```

**Likely question:** _"Why a low learning rate (0.03) with a high number of trees (3500) instead of
the reverse?"_
**Answer:** This is a classic boosting trade-off. A small learning rate means each tree only makes a
small correction, so the ensemble needs many trees to reach a good fit — but that slow, gradual
correction generally generalizes better than a few large, aggressive corrections (a high learning
rate with few trees). `early_stopping_rounds=60` protects against wasting compute (or overfitting) by
running trees indefinitely — training stops as soon as 60 rounds pass with no validation improvement.

### 4.6 The dataset named in the case study, and what was actually done with it

The case study brief points at
[`jsphyg/weather-dataset-rattle-package`](https://www.kaggle.com/datasets/jsphyg/weather-dataset-rattle-package)
as a generic _practice_ dataset for Milestone 4's regression exercise — this repo's actual case study
(Milestone 5 + the dedicated Case Study section of the brief) uses the **NYC Taxi Fare** dataset
instead, which is the correct target for this project specifically. If asked to contrast the two: the
weather dataset is a good exercise for practicing the _pipeline_ (preprocessing → regression → RMSE)
on a small, clean, single-file dataset; the taxi dataset adds the real-world complications this
project's code actually had to solve — 55 million rows that don't fit in memory at once, geospatial
features, and a highly skewed, outlier-prone target.

---

## Milestone 5 — Integrating AI/ML with UI

### 5.1 REST API design for model serving

`server/app.py` exposes the model over two POST endpoints. The core serving function is shared
between them deliberately:

```python
def run_model_prediction(processed_df):
    log_predictions = model.predict(processed_df[FEATURE_COLUMNS])
    predictions = np.expm1(log_predictions)              # undo the log1p from training
    final_fares = np.clip(predictions, MIN_FARE_AMOUNT, None)  # enforce the $2.50 legal minimum
    return [
        {"fare_amount": round(float(fare), 2), "distance_km": round(float(dist), 2)}
        for fare, dist in zip(final_fares, processed_df['distance_km'])
    ]
```

**Likely question:** _"Why train on `log1p(fare_amount)` instead of the raw dollar value?"_
**Answer:** Fares are **right-skewed** — most trips cost $5–15, but a small number of long
airport/outer-borough trips cost $60–100+. Training directly on raw dollars lets those rare large
fares dominate the loss function (since squared-error loss penalizes big absolute misses heavily),
pulling the model's attention away from getting the common, cheaper trips right. `log1p` compresses
that long tail before training; `expm1` at prediction time converts back to real dollars. This is a
standard technique for right-skewed regression targets, not something specific to this dataset.

**Likely question:** _"Why is `run_model_prediction` a separate, shared function instead of writing
the prediction logic separately inside `/predict` and `/parse-trip`?"_
**Answer:** So the two endpoints can never silently compute a fare two different ways. If `/predict`
and `/parse-trip` each had their own copy of the log/expm1/clip logic, a future change to one (say,
adjusting the minimum fare clip) could be applied to only one endpoint by mistake, and a manually
pin-dropped trip and a text-described trip could start returning different fares for numerically
identical inputs — a bug that would be very hard to notice without directly comparing the two paths side by side.

### 5.2 Real-time feedback in the UI

Two distinct real-time behaviors, both traceable to specific code:

- **Drag-to-re-estimate:** dragging a placed pin re-runs the prediction automatically
  (`TripMap.tsx`'s marker `dragend` handler passes `reestimate=true`, which
  `TripPlanner.tsx::handlePickupChange`/`handleDropoffChange` uses to call `runEstimate()` only when
  both pins already exist).
- **Live distance on the map:** a Leaflet `<Tooltip permanent>` on the route `<Polyline>` shows the
  straight-line distance in miles, recalculated on every render from the current pin positions
  (`utils/geo.ts::haversineMiles`) — this is a client-side display number, separate from the
  server's `distance_km` (though both use the same haversine formula, so they agree).

### 5.3 The LLM integration, end to end

````python
# server/services.py
def parse_trip_description_via_llm(user_text):
    prompt = TRIP_PARSER_PROMPT_TEMPLATE.format(user_text=user_text)
    response = requests.post(OLLAMA_URL, json={
        "model": OLLAMA_MODEL_NAME, "prompt": prompt, "stream": False
    })
    response.raise_for_status()
    llm_output_str = response.json().get('response', '{}')
    try:
        parsed_data = json.loads(llm_output_str)
    except json.JSONDecodeError:
        cleaned_output = llm_output_str.replace("```json", "").replace("```", "").strip()
        parsed_data = json.loads(cleaned_output)
    return parsed_data
````

The prompt template (`scripts/config.py`) asks the LLM for **JSON only**, in an exact shape:

```python
TRIP_PARSER_PROMPT_TEMPLATE = (
    'Extract structured trip details from this text as JSON only, no explanation:\n'
    'Text: "{user_text}"\n'
    'Return exactly this shape:\n'
    '{{"pickup_landmark": "", "dropoff_landmark": "", "hour": 0, "day_of_week_num": 0, '
    '"month": 0, "year": 0, "passenger_count": 1}}'
)
```

**Likely question:** _"What does the LLM actually return — coordinates, or something else?"_
**Answer:** **Landmark name strings**, not coordinates — the LLM has no reliable way to know real
latitude/longitude for a place name. `server/app.py::parse_trip` takes those names and resolves them
against a small Python lookup table (`scripts/shared/landmarks.py::resolve_landmark`) before it can
run the model at all. If a name isn't in that table, the endpoint still returns everything that _did_
parse (time, passengers) plus a `warning` field, rather than failing the whole request.

**Likely question:** _"Why defensively strip ` ```json ` fences from the LLM's response?"_
**Answer:** Local LLMs (even when explicitly instructed "JSON only, no explanation") sometimes wrap
their output in Markdown code fences out of habit from how they were trained on formatted text. The
`try/except json.JSONDecodeError` fallback strips those fences and retries the parse rather than
crashing the endpoint over a formatting quirk that has nothing to do with whether the extraction
itself succeeded.

### 5.4 Why Flask, briefly

A REST framework was needed to put the trained model behind an HTTP interface the React client (or
any other client, or `scripts/evaluate_api.py`) could call. Flask was chosen for its minimalism —
`server/app.py` is under 200 lines end to end, appropriate for a project with two endpoints and no
need for the heavier tooling (auth, ORMs, templating) a larger framework like Django would bring.

---

## Quick-reference cheat sheet

| Fact                                           | Value                                                 |
| ---------------------------------------------- | ----------------------------------------------------- |
| Dataset size                                   | 55,423,856 rows (`TOTAL_DATASET_ROWS`)                |
| Rows the production model actually trained on  | up to 20,000,000 (`EXTREME_TRAIN_MAX_ROWS`)           |
| Number of engineered features                  | 26 (`FEATURE_COLUMNS`)                                |
| Algorithm                                      | XGBoost regression, log-target                        |
| Reported validation RMSE                       | ≈ $3.55                                               |
| Kaggle's own "distance alone" reference        | $5–8 RMSE                                             |
| Minimum legal fare enforced                    | $2.50                                                 |
| Fare cap during cleaning                       | $300                                                  |
| Passenger count range kept                     | 1–6                                                   |
| Distance range kept (post feature-engineering) | 0.10–85.0 km                                          |
| NYC lat/lon bounding box                       | lat 40.50–40.95, lon -74.25 to -73.70                 |
| LLM used for text parsing                      | `llama3:8b` via local Ollama                          |
| Metric used throughout                         | RMSE (never precision/recall/F1 — this is regression) |
