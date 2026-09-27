# NYC Taxi Fare Prediction — Case Study Execution Plan

### RTB C16 – AI & ML | Personal Preparation & Delivery Document

**Author context:** 8 years React/Angular experience, beginner-level ML background, comfortable with AI coding assistants (Cursor, Claude, Gemini) for day-to-day dev work.
**Timeline:** 2 days
**Operating system on BOTH machines:** Windows (personal PC and company laptop)
**Hardware:** Personal PC (unrestricted, admin rights) + Company laptop (locked down / restricted installs, has dedicated Ollama server access to `llama2:7b`, `llama3:8b`, `all-minilm`, `qwen3-embedding`, `embeddinggemma`)
**Evaluation happens on:** Company laptop

---

## 0. Foundational Concept Map (read this first, refer back constantly)

Before touching code, it's worth fixing the vocabulary in concrete terms, because the evaluator can question _any_ term used in the manual. Each definition below is tied directly to this project so it's not abstract.

| Term               | Textbook meaning                                                                                                    | What it concretely is in THIS project                                                                                                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Algorithm**      | A step-by-step procedure that learns a pattern from data                                                            | Linear Regression / Random Forest — the mathematical recipe that turns input features into a fare prediction                                                                                                               |
| **Model**          | The _trained artifact_ produced by running an algorithm on data                                                     | The `.pkl` file produced after `RandomForestRegressor().fit(X_train, y_train)` — it now holds learned coefficients/tree splits, not raw data                                                                               |
| **Dataset**        | The raw or processed data used to train/evaluate                                                                    | `train.csv` (5.5M rows, 5.5GB) sampled down to ~50k rows for tractability                                                                                                                                                  |
| **Training**       | Showing the model input-output pairs so it adjusts internal parameters                                              | Fitting on 80% of rows: model sees `distance_km, hour, day_of_week...` → learns their relationship to `fare_amount`                                                                                                        |
| **Testing**        | Checking performance on data the model never saw during training                                                    | Evaluating RMSE on the held-out 20%                                                                                                                                                                                        |
| **Features**       | Input variables fed into the model                                                                                  | `distance_km`, `hour`, `day_of_week`, `month`, `passenger_count`                                                                                                                                                           |
| **Labels**         | The ground-truth output the model is trying to predict                                                              | `fare_amount`                                                                                                                                                                                                              |
| **Neural Network** | A layered computational graph of weighted connections loosely modeled on neurons, used for complex pattern learning | Not used for the core regression here (overkill for 5 tabular features) — but the LLMs (`llama3:8b`, etc.) _are_ neural networks under the hood (transformer architecture), used only for the natural-language input layer |

### AI Types (Milestone 1 refresher)

- **Narrow AI (ANI):** Does one task well, no generalization. Example: this fare predictor — it does one thing, cannot suddenly play chess.
- **General AI (AGI):** Hypothetical — human-level reasoning across any domain. Does not exist yet.
- **Superintelligent AI (ASI):** Hypothetical — beyond human intelligence in all domains. Purely theoretical/future concept.
- _Everything built in this case study is Narrow AI._

### ML Types (Milestone 1 refresher)

- **Supervised Learning:** Learn from labeled examples (input + correct answer given). _This project is supervised regression_ — every training row has a known `fare_amount`.
- **Unsupervised Learning:** Find structure in unlabeled data (e.g., clustering pickup zones by density with k-means — not required here, but could be an EDA bonus: "cluster pickup locations to find hotspots").
- **Reinforcement Learning:** An agent learns by trial-and-error against a reward signal (e.g., a self-driving policy learning to minimize trip time). Not applicable here — just be able to define it and contrast it against supervised learning if asked.

---

## 1. Critical Clarification: What the Provided Ollama Models Are Actually For

This is the single most important strategic decision in the whole plan, and it must be understood before writing any code.

The company has provided:

- `llama2:7b`, `llama3:8b` → **Large Language Models (LLMs)**. They generate/understand natural language text. They do NOT do numeric regression on structured tabular data (lat/long, timestamps, passenger counts) — that is not what they were trained for, and forcing one to "predict a fare" by prompting it with numbers would give an unreliable, unexplainable, hallucination-prone guess, not a statistically grounded prediction.
- `all-minilm`, `qwen3-embedding`, `embeddinggemma` → **Embedding models**. They convert text into numeric vectors for _semantic similarity_ tasks (search, RAG, clustering of text). They have no bearing on numeric fare prediction either.

**The actual fare prediction must be done with classical ML** (scikit-learn: Linear Regression, Random Forest, Gradient Boosting) trained on the structured CSV columns. This is non-negotiable and is exactly what the case study's own "Model Explanation" and "Evaluation" sections describe (RMSE, structured features).

**Where the Ollama models legitimately fit in:** as an _enhancement layer on top of the UI_, not as the prediction engine itself:

- Use `llama3:8b` to parse a free-text sentence like _"3 people, picked up near Times Square at 6pm on a Friday heading to JFK"_ into structured JSON (`{pickup_lat, pickup_lon, dropoff_lat, dropoff_lon, hour, day_of_week, passenger_count}`), which is THEN fed into the real regression model.
- Optionally use an embedding model to match a typed landmark name ("Times Square") against a small lookup table of known NYC landmark coordinates via semantic similarity, instead of a brittle exact-string match.

This gives an honest, technically correct story: _"I used the right tool for each sub-problem — classical ML for structured numeric regression, and an LLM only for the natural-language front door into that model."_ This is a strong thing to be able to explain if questioned on why an LLM wasn't used for the "real" prediction.

---

## 2. Hardware Split Strategy

| Machine                                                 | Role                                                                                       | Rationale                                                                                                                                                                                                              |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Personal PC** (no restrictions, Windows)              | Environment setup, EDA, feature engineering, model training/tuning, notebook documentation | This is the highest-iteration, most experimental part of the work. Corporate IT restrictions (blocked installs, proxy issues, disk quotas) would slow this down the most, so it must happen where I have full control. |
| **Company laptop** (locked, Windows, has Ollama access) | Flask API hosting, React/Vite UI, Ollama LLM integration, final rehearsal/demo             | Evaluation happens here, and only this machine can reach the Ollama servers, so the final integrated app **must** live and run here regardless of where it was built.                                                  |

**Merge mechanism (the "combine in parallel" step):**

1. Train and validate the model entirely on the personal PC.
2. Serialize it: `joblib.dump(model, 'fare_model.pkl')`.
3. Transfer the single `.pkl` file (via private git repo, internal file share, OneDrive/SharePoint, or USB) to the company laptop.
4. Load it inside the Flask app there: `model = joblib.load('fare_model.pkl')`.

This is a one-directional, one-file merge — not a live sync — which keeps the process simple and low-risk with a tight deadline. No custom training code needs to run twice.

**Important Windows-specific note before starting:** if the company laptop restricts software installation (no admin rights, blocked installers via Group Policy, or an IT-managed software center), do NOT assume Python/conda can be installed there the same way as the personal PC. Two fallback options if `winget`/direct installers are blocked:

- Request the ML runtime (Python + pip packages) be pushed via the company's approved software center/IT ticket **on day 1 morning**, so there's no last-minute surprise before evaluation.
- As a fallback, the Flask + React portions on the company laptop only need Python and Node.js — NOT the full conda/Jupyter/scikit-learn stack — since the actual model training already happened on the personal PC and only a serialized `.pkl` file plus a lightweight `pip install flask flask-cors joblib scikit-learn requests` needs to run there to load and serve the model.

---

## 3. Environment Setup From Scratch (Windows) — Personal PC

This section assumes conda, Python, and Jupyter are **not yet installed**. If they already are, skip to 3.5.

### 3.1 What is Conda, and why use it at all?

**Conda** is a package and environment manager. In plain terms: it lets you create an isolated, self-contained Python installation (an "environment") for this specific project, with its own set of library versions, completely separate from any other Python already on the machine. This matters because:

- If Python is already installed for something else (or not installed at all), conda avoids version conflicts (e.g., a different project needing an older pandas version).
- It gives a clean, reproducible setup that can be described exactly ("I used Python 3.10 with these exact packages") if the evaluator asks how the environment was built.

### 3.2 Installing Conda on Windows (Miniconda — lightweight, recommended)

Miniconda is a minimal installer for conda (as opposed to full Anaconda, which bundles hundreds of extra packages that aren't needed here and takes far longer to install).

**Step-by-step:**

1. Open a browser and go to: `https://docs.conda.io/en/latest/miniconda.html`
2. Download the **Miniconda3 Windows 64-bit** installer (`.exe`).
3. Run the downloaded `.exe`. During installation:
   - Choose **"Install for me only"** (does not require admin rights — important if the personal PC has any restrictions, and definitely relevant if trying this on the company laptop).
   - On the "Advanced Options" screen, it is fine to leave **"Add Miniconda3 to my PATH environment variable"** unchecked (Anaconda's own installer recommends against it to avoid conflicts with other Python installs) — instead, use the **"Anaconda Prompt (miniconda3)"** shortcut added to the Start Menu, which automatically has conda available without needing PATH changes.
4. Finish the installation and reboot if prompted.

### 3.3 Verifying Conda Is Available

Conda might genuinely "not be available" in a plain Command Prompt or PowerShell window even after installing, precisely because of the PATH decision in step 3 above. This is expected, not an error.

**How to open a terminal where conda IS available:**

- Click Start → type "Anaconda Prompt" → open **"Anaconda Prompt (miniconda3)"**. This is a special terminal shortcut that pre-loads conda's PATH for that session only.

**Verify it works:**

```powershell
conda --version
# Expected output: something like "conda 24.x.x"
```

If this command fails even in the Anaconda Prompt, the installation did not complete correctly — re-run the installer.

**Optional (only if comfortable with PATH editing):** conda can be made available in a normal PowerShell/Command Prompt window by running `conda init powershell` once from inside the Anaconda Prompt, then restarting the terminal. This is a convenience step, not a requirement — the Anaconda Prompt shortcut alone is sufficient to complete this entire case study.

### 3.4 Creating the Project Environment

From the **Anaconda Prompt**:

```powershell
# Creates a new isolated environment named "taxi_fare" with Python 3.10
conda create -n taxi_fare python=3.10 -y

# Activates it — the terminal prompt will change to show "(taxi_fare)" at the start of the line,
# confirming the isolated environment is now active for every command that follows
conda activate taxi_fare

# Installs every library needed across the whole case study, all at once
pip install pandas numpy scikit-learn matplotlib seaborn jupyter opendatasets joblib flask flask-cors requests
```

**Why these specific libraries (know this cold — it maps directly to Milestone 2):**

- `pandas` → DataFrame operations: reading CSV, filtering, grouping, cleaning.
- `numpy` → Fast vectorized numeric operations (used for the haversine distance formula below).
- `scikit-learn` → Preprocessing utilities (`train_test_split`, scalers, encoders) AND the ML algorithms themselves (`LinearRegression`, `RandomForestRegressor`).
- `matplotlib` / `seaborn` → Charting for EDA (histograms, bar charts, scatter plots as explicitly required by the case study).
- `jupyter` → The notebook interface itself (explained fully in 3.6 below).
- `opendatasets` → One-line Kaggle dataset downloader, as instructed in the case study's own steps.
- `joblib` → Serializes/deserializes the trained model object so it can cross from the personal PC to the company laptop.
- `flask` + `flask-cors` → Minimal REST API to serve predictions to the React frontend (CORS needed because React dev server and Flask run on different ports).
- `requests` → Used later to call the Ollama HTTP API from the Flask backend.

**Every time work resumes on this project** (a new terminal session, the next day, etc.), the environment must be re-activated first:

```powershell
conda activate taxi_fare
```

Forgetting this step is the single most common source of "module not found" errors — it means the terminal is using the computer's base Python instead of the isolated one where the libraries were actually installed.

### 3.5 What Is a Jupyter Notebook, and How Do You Actually Use One?

A **Jupyter Notebook** (`.ipynb` file) is an interactive coding document that mixes:

- **Code cells** — runnable Python code, executed one cell at a time, with output (text, tables, charts) displayed directly underneath that same cell.
- **Markdown cells** — formatted text/notes (headings, bullet points, bold text) for explaining what the code below it is doing.

This is fundamentally different from writing a normal `.py` script: instead of running the whole file top-to-bottom every time, each cell can be run independently and its output stays visible on screen, which makes it ideal for **exploratory work** — trying something, immediately seeing the result (a chart, a table preview, an error), then adjusting the next cell without re-running everything from scratch. This is exactly why the case study repeatedly asks for a notebook rather than a plain script: the entire point is to document a chain of small experiments and their outputs together, in order.

**How to launch it:**

```powershell
# From inside the activated (taxi_fare) environment, in the project folder
jupyter notebook
```

This automatically opens a browser tab (usually at `http://localhost:8888`) showing a file browser. From there:

1. Click **"New" → "Python 3 (ipykernel)"** to create a new blank notebook.
2. A new browser tab opens with one empty code cell.

**Basic controls to know:**

- **Shift + Enter** → runs the current cell and moves to the next one (the most-used shortcut by far).
- **Ctrl + Enter** → runs the current cell and stays on it (useful when re-running the same cell repeatedly while tweaking it).
- Clicking the `+` icon (or pressing `B` after clicking a cell's left margin) → inserts a new cell below.
- The dropdown at the top showing "Code" can be switched to **"Markdown"** to turn a cell into formatted text instead of executable code — this is how the case study's requirement to "document the process" gets satisfied: alternate code cells with markdown cells explaining what each step does and why.
- **File → Save and Checkpoint** (or **Ctrl+S**) → saves the `.ipynb` file, which stores both the code AND all the output (charts, tables) that were generated last time each cell ran — meaning the notebook can be reopened later and everything is still visible without re-running.
- **Kernel → Restart & Run All** → wipes all variables and output, then re-runs every cell from the top in order. Good practice to do this once near the end, to confirm the whole notebook actually works cleanly start-to-finish (catches the common mistake of accidentally depending on a variable from a cell that was later deleted or reordered).

**Alternative: using VS Code instead of the browser interface** — if more comfortable in an IDE (likely, given daily Cursor/VS Code usage), VS Code has built-in Jupyter notebook support:

1. Install the **"Jupyter"** extension (by Microsoft) inside VS Code.
2. Open or create an `.ipynb` file directly in VS Code — the same cell/run/markdown model applies, but with VS Code's familiar editor, IntelliSense, and Cursor/Copilot-style AI assistance available inline. This is likely the most comfortable option given existing tool familiarity, and is fully interchangeable with the browser version — same file format, same execution model.

### 3.6 Sanity-Check the Environment Before Doing Any Real Work

Run this as the very first cell in the notebook, before anything else, to confirm every library installed correctly:

```python
import pandas as pd
import numpy as np
import sklearn
import matplotlib
import seaborn as sns

print("pandas:", pd.__version__)
print("numpy:", np.__version__)
print("scikit-learn:", sklearn.__version__)
print("matplotlib:", matplotlib.__version__)
print("seaborn:", sns.__version__)
```

If any import fails, it almost always means the `taxi_fare` conda environment isn't actually the one Jupyter is running under. Fix by confirming Jupyter was launched from an Anaconda Prompt window where `conda activate taxi_fare` was run first, in that same terminal session.

---

## 4. Day 1 — Data Understanding, EDA, and Theory Grounding

### 4.1 Downloading and Safely Loading the Dataset

```python
import opendatasets as od

# This triggers a Kaggle login prompt (username + API key) the first time.
# On Windows, if prompted for a "kaggle.json" file location, it typically expects
# it at C:\Users\<YourUsername>\.kaggle\kaggle.json — download this API key file
# from your Kaggle account settings page ("Create New API Token") beforehand.
dataset_url = 'https://www.kaggle.com/c/new-york-city-taxi-fare-prediction/overview'
od.download(dataset_url)

data_dir = './new-york-city-taxi-fare-prediction'
```

**Why we do NOT load the full file naively:**
The case study explicitly warns training data is 5.5 GB / 5.5 million rows. Calling `pd.read_csv('train.csv')` directly on this will either exhaust RAM or take many minutes per attempt — unacceptable inside a 2-day deadline where fast iteration matters more than working with the full corpus.

```python
import pandas as pd

# Only read the columns we actually need, with the SMALLEST dtype that safely fits each column.
# float32 instead of the pandas default float64 halves memory for coordinate/fare columns.
# uint8 for passenger_count since it never exceeds ~9.
dtypes = {
    'fare_amount': 'float32',
    'pickup_longitude': 'float32',
    'pickup_latitude': 'float32',
    'dropoff_longitude': 'float32',
    'dropoff_latitude': 'float32',
    'passenger_count': 'uint8'
}

# nrows caps how many rows pandas even parses from disk — this alone is the biggest speed win.
# parse_dates converts pickup_datetime straight into a proper datetime64 column instead of a string.
df = pd.read_csv(
    f'{data_dir}/train.csv',
    nrows=500_000,
    dtype=dtypes,
    parse_dates=['pickup_datetime']
)

# Case study explicitly suggests working with ~1% of data for iteration speed.
# random_state=42 is set for reproducibility — same sample every run, so results are comparable across experiments.
df = df.sample(frac=0.10, random_state=42)  # 10% of the 500k pre-filtered rows ≈ 50k rows, a workable size
print(df.shape)
```

### 4.2 Initial Data Audit

```python
df.info()          # column dtypes, non-null counts — quick sanity check
df.describe()       # min/max/mean per numeric column — this is where garbage jumps out
df.isnull().sum()   # exact count of missing values per column
```

**What to look for and WHY (write these observations down verbatim in the notebook — the case study explicitly asks for this):**

- Negative or zero `fare_amount` → impossible, must be dropped (a taxi ride cannot cost $0 or negative).
- `passenger_count` of 0 or absurdly high (e.g., 208) → sensor/data-entry error, not a real ride.
- Lat/long values of exactly `0.0` or far outside NYC's real bounding box (roughly lat 40.5–40.9, long -74.3 to -73.7) → GPS failures, must be filtered out before they distort distance calculations.

```python
# Concrete cleaning step based on the audit above
df = df[
    (df.fare_amount > 0) &
    (df.passenger_count > 0) & (df.passenger_count <= 6) &
    (df.pickup_latitude.between(40.5, 40.9)) &
    (df.dropoff_latitude.between(40.5, 40.9)) &
    (df.pickup_longitude.between(-74.3, -73.7)) &
    (df.dropoff_longitude.between(-74.3, -73.7))
].copy()
```

### 4.3 Exploratory Data Analysis — Answering the Case Study's Specific Questions

First, derive time-based features (needed for every question below):

```python
# .dt accessor extracts date/time components from a datetime64 column
df['hour'] = df.pickup_datetime.dt.hour                 # 0–23
df['day_of_week'] = df.pickup_datetime.dt.day_name()     # 'Monday', 'Tuesday', ...
df['day_of_week_num'] = df.pickup_datetime.dt.dayofweek  # 0=Monday ... 6=Sunday (numeric, needed for modeling later)
df['month'] = df.pickup_datetime.dt.month                # 1–12
```

**Q: What is the busiest day of the week?**

```python
import matplotlib.pyplot as plt

ride_counts_by_day = df.day_of_week.value_counts()
ride_counts_by_day.plot(kind='bar', title='Number of Rides by Day of Week')
plt.ylabel('Ride Count')
plt.show()
```

_Note: "busiest" = ride COUNT, not fare amount. Don't conflate the two — a common mistake._

**Q: Busiest time of day?**

```python
df.hour.value_counts().sort_index().plot(kind='line', title='Ride Volume by Hour of Day')
plt.xlabel('Hour (24h)')
plt.ylabel('Ride Count')
plt.show()
```

_Expect two peaks (rush hours) — being able to explain WHY (commute patterns) shows real understanding, not just chart-reading._

**Q: Which months have the highest fares?**

```python
df.groupby('month').fare_amount.mean().plot(kind='bar', title='Average Fare by Month')
plt.ylabel('Average Fare ($)')
plt.show()
```

**Q: Which drop-off locations have the highest fares?**

```python
# Round coordinates to ~1km precision to group nearby drop points into buckets
df['dropoff_lat_rounded'] = df.dropoff_latitude.round(2)
df['dropoff_lon_rounded'] = df.dropoff_longitude.round(2)

top_dropoffs = (
    df.groupby(['dropoff_lat_rounded', 'dropoff_lon_rounded'])
      .fare_amount.mean()
      .sort_values(ascending=False)
      .head(10)
)
print(top_dropoffs)
# Cross-reference the highest lat/long pairs against a map (e.g., Google Maps) —
# expect to see JFK/LaGuardia airport coordinates surface here, since airport rides are flat-rate and long-distance.
```

**Q: Average ride distance?**
(Requires the haversine distance feature — built in section 4.4 — computed first, then:)

```python
print(f"Average ride distance: {df.distance_km.mean():.2f} km")
```

### 4.4 Feature Engineering — The Haversine Distance Feature

This is the single most important engineered feature for this dataset, because straight-line distance is the strongest available predictor of taxi fare.

```python
import numpy as np

def haversine(lat1, lon1, lat2, lon2):
    """
    Computes great-circle distance (in km) between two lat/long points on Earth's surface.
    This matters because Euclidean distance on raw lat/long degrees is WRONG —
    degrees of longitude shrink in real-world distance as you move away from the equator,
    so a naive sqrt((lat2-lat1)^2 + (lon2-lon1)^2) would misrepresent true distance.
    The haversine formula accounts for the Earth's curvature.
    """
    R = 6371  # Earth's radius in kilometers
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])  # trig functions need radians, not degrees
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = np.sin(dlat / 2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2)**2
    c = 2 * np.arcsin(np.sqrt(a))
    return R * c

df['distance_km'] = haversine(
    df.pickup_latitude, df.pickup_longitude,
    df.dropoff_latitude, df.dropoff_longitude
)

# A distance of exactly 0 means pickup == dropoff, which is not a valid fare-generating ride — drop these.
df = df[df.distance_km > 0]

# Cap unrealistic distances (data errors, not real NYC trips)
df = df[df.distance_km < 100]
```

**Encoding categorical variables (Milestone 3 concept, applied concretely):**
`day_of_week_num` is already numeric (0–6) from `.dt.dayofweek`, so no further encoding is needed for it in a tree-based model. (Tree-based models like Random Forest can split on numeric-encoded categories without issue; only linear models are sensitive to the _ordinal_ assumption this implies — worth mentioning if asked about label encoding vs one-hot encoding trade-offs.)

### 4.5 End of Day 1 Checklist

- [ ] Conda environment created and verified (`conda --version`, package import sanity check)
- [ ] Jupyter Notebook launched successfully and basic controls (Shift+Enter, markdown cells, save) understood
- [ ] Dataset downloaded and safely sampled
- [ ] Data audited, garbage rows identified and removed
- [ ] All 5 case-study EDA questions answered with charts
- [ ] `distance_km` feature engineered
- [ ] Notebook has markdown cells explaining every decision (not just code)
- [ ] Theory flashcards reviewed (Section 0) via active recall (quiz yourself, or have Claude quiz you)

---

## 5. Day 2 — Modeling, Evaluation, API, and UI Integration

### 5.1 Train/Test Split

```python
from sklearn.model_selection import train_test_split

# These are the exact 5 features referenced in the case study's "Model Explanation" section,
# transformed into model-friendly numeric form.
features = ['distance_km', 'hour', 'day_of_week_num', 'month', 'passenger_count']
X = df[features]
y = df['fare_amount']

# test_size=0.2 -> 80% train / 20% test, a standard default split.
# random_state=42 -> reproducible split; without it, every run would shuffle differently
# and RMSE comparisons between models would not be a fair comparison.
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print(f"Train size: {len(X_train)}, Test size: {len(X_test)}")
```

**Why we split at all (core theory point, likely to be questioned):**
If we evaluate a model on the same data it was trained on, it can simply "memorize" the training set (a symptom of **overfitting**) and look artificially perfect while actually failing to predict fares for a NEW ride it hasn't seen. The test set is a stand-in for "the real world" — data the model has never touched — so the RMSE on it is a trustworthy estimate of real-world performance.

### 5.2 Hardcoded Baseline Model (explicitly required by the case study)

```python
from sklearn.metrics import mean_squared_error

# The "dumbest possible" model: ignore all inputs, always guess the average fare.
# This sets the floor — any real model MUST beat this to be worth using at all.
mean_fare = y_train.mean()
baseline_predictions = [mean_fare] * len(y_test)

baseline_rmse = mean_squared_error(y_test, baseline_predictions, squared=False)
print(f"Hardcoded baseline RMSE: ${baseline_rmse:.2f}")
```

### 5.3 Baseline ML Model — Linear Regression

```python
from sklearn.linear_model import LinearRegression

# Linear Regression assumes fare = w1*distance + w2*hour + w3*day + w4*month + w5*passengers + b
# It's fast, interpretable (each weight tells you how much that feature moves the fare),
# and a natural "first real model" to compare against the hardcoded baseline.
lr_model = LinearRegression()
lr_model.fit(X_train, y_train)

lr_predictions = lr_model.predict(X_test)
lr_rmse = mean_squared_error(y_test, lr_predictions, squared=False)
print(f"Linear Regression RMSE: ${lr_rmse:.2f}")

# Inspect learned weights — useful talking point: "distance_km should have by far the largest coefficient"
for feature, coef in zip(features, lr_model.coef_):
    print(f"{feature}: {coef:.4f}")
```

### 5.4 Improved Model — Random Forest Regressor

```python
from sklearn.ensemble import RandomForestRegressor

# Random Forest = an ensemble of many decision trees, each trained on a random subset of rows/features,
# with predictions averaged across all trees. This captures NON-linear relationships
# (e.g., fare might jump sharply for very long distances in a way a straight line can't represent)
# and is generally more accurate than plain linear regression on messy real-world data.
rf_model = RandomForestRegressor(
    n_estimators=100,   # number of trees — more trees = more stable predictions, at the cost of training time
    max_depth=10,       # caps how deep each tree can grow — controls overfitting (see note below)
    random_state=42,
    n_jobs=-1           # use all CPU cores to speed up training
)
rf_model.fit(X_train, y_train)

rf_predictions = rf_model.predict(X_test)
rf_rmse = mean_squared_error(y_test, rf_predictions, squared=False)
print(f"Random Forest RMSE: ${rf_rmse:.2f}")

# Feature importance — which inputs actually drove the predictions the most
importances = pd.Series(rf_model.feature_importances_, index=features).sort_values(ascending=False)
print(importances)
```

**Overfitting vs Underfitting (Milestone 4 concept, tied directly to `max_depth`):**

- **Underfitting:** model is too simple to capture the real pattern (e.g., `max_depth=1` — barely better than the hardcoded baseline; high error on BOTH train and test sets).
- **Overfitting:** model is too complex and starts memorizing noise in the training data (e.g., `max_depth=None`, unlimited — very low error on train set, but noticeably worse error on the test set, because it learned quirks specific to training rows that don't generalize).
- `max_depth=10` is a deliberate middle-ground choice — worth trying `max_depth=None` vs `max_depth=3` side-by-side and comparing train RMSE vs test RMSE to _demonstrate_ this concept live if asked, rather than just defining it.

### 5.5 Results Comparison Table (put this directly in the notebook)

```python
results = pd.DataFrame({
    'Model': ['Hardcoded (mean)', 'Linear Regression', 'Random Forest'],
    'RMSE': [baseline_rmse, lr_rmse, rf_rmse]
})
print(results)
```

This progression (baseline → linear → ensemble, with decreasing RMSE at each step) is exactly the "Train hardcoded and baseline models" + "Train and evaluate different models" outcomes the case study lists — and doubles as a clean narrative to walk an evaluator through.

### 5.6 Serialize the Final Model

```python
import joblib
joblib.dump(rf_model, 'fare_model.pkl')
# This is the ONE file that crosses from the personal PC to the company laptop.
```

### 5.7 Environment Setup on the Company Laptop (lighter-weight, Windows)

Since model training already happened on the personal PC, the company laptop only needs enough to **serve** the model, not train it.

1. Check if Python is already installed (open PowerShell): `python --version`. If missing and installs are IT-restricted, request Python 3.10+ via the company's approved software channel first thing on day 2 morning — do not discover this blocker at demo time.
2. Once Python is available, create a lightweight virtual environment (using Python's built-in `venv` instead of conda is fine here, since this machine only needs to run a small Flask server, not do data science work):

   ```powershell
   python -m venv fare_api_env
   fare_api_env\Scripts\activate
   pip install flask flask-cors joblib scikit-learn requests numpy
   ```

   Note the Windows-specific activation script path (`Scripts\activate`, backslash), which differs from the Mac/Linux equivalent (`bin/activate`) frequently shown in online tutorials — a common point of confusion when following non-Windows documentation.

3. Verify Node.js is installed for the React/Vite frontend: `node --version` and `npm --version`. If missing, same rule applies — request it via IT well ahead of the demo, since installing Node.js typically also needs elevated/admin rights on a locked-down machine.

### 5.8 Flask REST API (built/run on the Company Laptop)

```python
# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np

app = Flask(__name__)
CORS(app)  # allows the React dev server (different port) to call this API without being blocked by the browser

model = joblib.load('fare_model.pkl')

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    a = np.sin(dlat/2)**2 + np.cos(lat1)*np.cos(lat2)*np.sin(dlon/2)**2
    return 2 * R * np.arcsin(np.sqrt(a))

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()

    # Compute distance server-side so the frontend only ever needs to send raw coordinates,
    # keeping the "business logic" of feature engineering in one place (not duplicated in JS).
    distance_km = haversine(
        data['pickup_lat'], data['pickup_lon'],
        data['dropoff_lat'], data['dropoff_lon']
    )

    features = [[
        distance_km,
        data['hour'],
        data['day_of_week_num'],
        data['month'],
        data['passenger_count']
    ]]

    prediction = model.predict(features)[0]
    return jsonify({
        'fare_amount': round(float(prediction), 2),
        'distance_km': round(float(distance_km), 2)
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
```

Run it from the activated environment: `python app.py`. On Windows, if port 5000 is already in use by another process (occasionally true on Windows due to a built-in service), switch to a different port (e.g., `port=5001`) and update the frontend's `.env` value accordingly (see the companion PRD, Story 6.3).

### 5.9 Optional Differentiator — Ollama LLM as a Natural-Language Front Door

```python
# Additional route in app.py — calls the company's local Ollama server (llama3:8b)
import requests

OLLAMA_URL = "http://localhost:11434/api/generate"  # adjust to the actual company-provided endpoint

@app.route('/parse-trip', methods=['POST'])
def parse_trip():
    user_text = request.get_json()['description']

    # The prompt instructs the LLM to return ONLY JSON, so the response can be parsed directly
    # without the model adding conversational filler around the answer.
    prompt = f"""Extract structured trip details from this text as JSON only, no explanation:
Text: "{user_text}"
Return exactly this shape:
{{"pickup_landmark": "", "dropoff_landmark": "", "hour": 0, "day_of_week_num": 0, "month": 0, "passenger_count": 1}}
"""

    response = requests.post(OLLAMA_URL, json={
        "model": "llama3:8b",
        "prompt": prompt,
        "stream": False
    })

    llm_output = response.json()['response']
    # In production, this JSON should be validated/parsed defensively (try/except around json.loads),
    # since LLM output is not guaranteed to be perfectly formed JSON every time.
    return llm_output
```

_Why this is a legitimate and honest use of the assigned models_: it uses the LLM strictly for what LLMs are good at (unstructured text → structured intent), and hands off the actual numeric prediction to the properly trained regression model — no part of the pipeline pretends an LLM can do numeric regression it wasn't built for.

### 5.10 React UI (Vite) — see the companion PRD document for the full build spec

The UI itself is being generated via a separate AI-agent-executable PRD (Epic/Story format) rather than hand-built here, to save time on the "tedious but well-understood" scaffolding work, freeing my own hours for the ML learning curve, which is the actual skill gap. High-level shape only, for context:

- A form: pickup lat/long, dropoff lat/long (or a free-text box wired to `/parse-trip`), date/time picker, passenger count.
- A "Predict Fare" button → calls `/predict` → displays fare + distance.
- A results panel with a bar chart (e.g., average fare by hour, precomputed from the notebook and shipped as static JSON) to satisfy the case study's "we can even show graphs and charts on UI" instruction.
- A theme toggle for a modern, polished look (see the PRD for exact themes) — a small touch, but it signals attention to UI/UX craft consistent with an 8-year frontend background.

### 5.11 End of Day 2 Checklist

- [ ] Hardcoded, Linear Regression, and Random Forest models trained and compared by RMSE
- [ ] Overfitting/underfitting demonstrated with at least one `max_depth` experiment
- [ ] Model serialized and moved to company laptop
- [ ] Company laptop's lightweight Python environment set up and verified (`python --version`, `pip list`)
- [ ] Flask API running locally, `/predict` tested via Postman/curl/browser before wiring up the UI
- [ ] React UI (from the PRD/agent build) integrated and hitting the live API
- [ ] Optional: Ollama `/parse-trip` route working end-to-end
- [ ] Notebook fully documented with markdown explaining every step (explicit case study requirement)
- [ ] One-page personal cheat sheet of concepts rehearsed out loud

---

## 6. Pre-Evaluation Concept Cheat Sheet (rehearse these answers, don't just read them)

| If asked...                                                                          | Answer in plain terms                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Why RMSE over MAE?                                                                   | RMSE squares errors before averaging, so it penalizes large mistakes (e.g., predicting $10 for a $50 ride) more heavily than many small ones — appropriate here since a wildly wrong fare estimate is worse than several slightly-off ones.                                                                                                       |
| Why not use the LLMs for the prediction itself?                                      | LLMs are trained on text generation, not numeric regression on structured tabular features; they have no notion of "fitting a curve" to lat/long/time → fare the way scikit-learn algorithms do. Using one for that would be unreliable and unexplainable, and the case study's own required metric (RMSE) presumes a proper regression model.    |
| What's the difference between supervised and unsupervised learning, concretely here? | Supervised: every training row has a known fare_amount (the label) — that's what we did. Unsupervised would be, e.g., clustering pickup coordinates into "zones" with no fare label involved at all — not required by this case study but a valid stretch topic to mention.                                                                       |
| What is overfitting, and where did you guard against it?                             | Model memorizes training-set noise instead of the general pattern, hurting performance on new data. Guarded against by capping `max_depth=10` on the Random Forest and by evaluating on a held-out test set rather than training data.                                                                                                            |
| Why scale/normalize some models but not tree-based ones?                             | Linear models are sensitive to feature scale because coefficients are compared directly; tree-based models split on thresholds per feature independently, so scale doesn't affect their splits — this is why Random Forest didn't require a `StandardScaler` step here while a from-scratch gradient descent linear model would benefit from one. |
| What is conda/a virtual environment, and why bother?                                 | An isolated Python installation with its own library versions, so this project's dependencies never conflict with anything else on the machine, and the setup can be reproduced exactly on another machine (the company laptop) if needed.                                                                                                        |
| What is a Jupyter Notebook and why not just a script?                                | An interactive document mixing runnable code cells with formatted explanation cells, where each cell's output stays visible — ideal for exploratory, step-by-step work like EDA, and it directly satisfies the case study's requirement to document the process alongside the code.                                                               |
| What would you do with more time?                                                    | Cross-validation (k-fold) instead of a single train/test split for a more robust RMSE estimate; try Gradient Boosting (XGBoost/LightGBM) which typically beats plain Random Forest on tabular data; add weather or traffic data as additional features.                                                                                           |

---

## 7. Risk Notes / Things to Double-Check Before Demo Day

- Confirm the company laptop can actually reach the Kaggle-trained `.pkl` file and the Ollama endpoint from the same network context that will be used during evaluation — test this the night before, not minutes before.
- Confirm Flask's CORS settings actually permit the Vite dev server's port (default `5173`) — a common last-minute integration snag.
- Windows firewall prompts: the first time `python app.py` or `npm run dev` binds to a network port, Windows may show a "Windows Defender Firewall has blocked some features of this app" popup — click "Allow access" (private networks is sufficient; do not need public network access for a local demo).
- Keep the notebook and the Flask/React app in sync: if the notebook's final feature list changes, the Flask `/predict` route's expected JSON shape must be updated identically, or the UI will silently send the wrong feature order.
- Have a fallback screenshot/recording of the working UI in case of live network/demo failure during evaluation.
- If IT restrictions on the company laptop block even the lightweight `venv` + `pip install` steps in Section 5.7, escalate this as an IT ticket on Day 1, not Day 2 — this is the single biggest schedule risk in the entire plan since evaluation happens on that exact machine.
