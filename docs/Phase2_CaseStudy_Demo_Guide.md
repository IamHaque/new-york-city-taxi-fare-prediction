# Phase 2 — Case Study Demo Showcase Guide

### RTB C16 — AI & ML | Evaluation Phase 2: live demo + questions on the case study

Phase 1 tests whether you understand the concepts. Phase 2 tests whether you can **show a working
system and defend the decisions behind it** under questioning. This guide is a run-of-show for the
demo itself, plus a bank of the questions most likely to follow it — organized by the angle they come
from (technical, product/UX, and edge-case/robustness), each with an answer grounded in this repo's
actual code.

---

## Before you demo: a pre-flight checklist

Do this **before** the evaluator is in the room. A demo that crashes on startup is a worse impression
than a slightly-rough demo that runs.

- [ ] **Ollama is running** and the model is pulled: `ollama pull llama3:8b`, then confirm
      `ollama list` shows it. `/parse-trip` will hang or error without this.
- [ ] **The Flask server actually starts.** In the current state of this repo,
      `server/app.py` loads `trained-models/fare_model_extreme.pkl`, which **does not exist** —
      the server will crash immediately with `FileNotFoundError`. This is documented in detail in
      [`docs/Taxi_Fare_UI_PRD_v5_Fixes_and_Enhancements.md`](Taxi_Fare_UI_PRD_v5_Fixes_and_Enhancements.md#epic-1),
      but the short version: either point `MODEL_SAVE_PATH_EXTREME`/`METADATA_SAVE_PATH_EXTREME` in
      `scripts/config.py` at the model files that _do_ exist (`fare_model_full.pkl` +
      `model_metadata.pkl` are the closest match — both are 26-feature XGBoost models), or run
      `python scripts/train_extreme.py` for real and let it produce the expected files. **Do this
      days before the demo, not the morning of** — training a fresh model takes time, and you want to
      have re-verified `npm run build`/the client against whichever model you land on.
- [ ] **The client hits the right API URL.** Confirm `client/src/api/fareApi.ts` points at wherever
      your Flask server is actually running.
- [ ] **`client/src/data/*.json` exists and isn't empty** — these back the entire Insights dashboard.
      If you need to regenerate them: `python -m scripts.generate_chart_data` (needs `train.csv`
      locally, and this script has the _same_ missing-model-file dependency as the server for its
      `model_comparison()`/`feature_importance()` sections — fix that first).
- [ ] Have a **second trip description ready** in case your first live example accidentally names a
      location outside the 31-entry landmark table and returns a `warning` instead of a fare — see
      the "if the live demo goes wrong" section below for how to turn that into a positive instead of
      a stumble.

---

## Demo script

A suggested order — roughly 8–12 minutes if you talk through the "why" at each step rather than just
clicking through.

### 1. Open with the problem, not the app (30 seconds)

State the problem before showing anything: _"Given a pickup point, a drop-off point, a time, and a
passenger count, predict what a NYC taxi fare would be — this is Kaggle's New York City Taxi Fare
Prediction competition, 55 million labeled historical trips."_ This framing matters because it tells
the evaluator you understand this as an ML problem with a real, external benchmark, not just an app
you built.

### 2. The map-based flow

- Click a pickup point, click a drop-off point. Narrate what's happening: _"Both pins are
  reverse-geocoded to addresses, and the straight-line distance appears on the route line
  immediately — that's a client-side calculation for feedback, separate from the server's own
  distance figure, though both use the same haversine formula so they agree."_
- Set a time and passenger count, submit. Point at the result panel: fare, distance, the fare vs.
  city-average comparison, and the illustrative breakdown.
- **Drag a pin.** The fare re-estimates automatically. This is worth calling out explicitly — it's a
  deliberate UX decision (`TripMap.tsx`'s drag handler → `TripPlanner.tsx::runEstimate`), not
  something that happens for free.

### 3. The natural-language flow — this is the centerpiece

- Type a trip description: _"2 people from Times Square to JFK on Friday at 6pm"_.
- Narrate the pipeline **while it's loading**, since this is the most interesting technical content
  in the whole project: _"This text goes to a local LLM — Llama 3, running via Ollama, entirely
  offline — which extracts the pickup landmark, drop-off landmark, and time/passenger fields as
  JSON. The server then resolves those landmark names to real coordinates, and — if both sides
  resolve — runs the exact same trained model, through the exact same code path as the manual form,
  to produce a fare. All of that happens in one request."_
- When the map/form populate and the fare appears, make the "one request" point concrete: _"I didn't
  click predict a second time — the parse endpoint already ran the model."_

### 4. The insights dashboard

- Walk through one chart from each of the four categories (demand, fares, locations, model
  comparison) rather than every chart. For the model comparison chart specifically, narrate the
  progression: _"Predicting the mean fare for every trip gets you to about $9.90 RMSE. Distance
  alone — which is what Kaggle says you should expect to land at $5–8 — gets to about
  $[value from your current model_comparison.json]. Our full 26-feature XGBoost model gets to
  about $3.55."_ This single sentence answers "did the ML actually help" better than anything else
  in the demo.

### 5. Theme toggle (10 seconds, don't over-invest here)

Click through System → Light → Dark. Mention only in passing that it's token-driven, not per-component
overrides — this isn't the technical heart of the project and shouldn't eat demo time.

### 6. Close by naming what you'd do next

Evaluators tend to respond well to a closing "if I had more time" list, because it shows you
understand the project's current limits rather than believing it's flawless. Good, honest candidates
(all real, all in the linked PRD): expanding the landmark table or replacing it with live geocoding,
fixing the model-artifact path issue properly, adding a keyboard-accessible way to set a location
without the map.

---

## If the live demo goes wrong

- **`/parse-trip` returns a `warning`, no fare.** This isn't a bug to panic over — it's a designed
  degradation path. Say so: _"That location wasn't in our landmark table, so the server correctly
  told us it couldn't resolve it rather than guessing — the time and passenger fields still came
  through, and I can place that pin manually."_ Then do exactly that. This turns a demo hiccup into
  evidence you understand your own error-handling design.
- **Ollama is slow or times out.** Have the manual map flow ready as your primary path and treat the
  text flow as the "let me also show you" addition, not the only path through the demo.
- **A chart looks sparse or a number looks off.** Don't improvise a justification on the spot — say
  you'll verify the exact figure against `client/src/data/*.json` / `scripts/generate_chart_data.py`
  after, and move on. Confident precision about numbers you're sure of beats a shaky guess.

---

## Anticipated questions

### Technical / model questions

**Q: Why XGBoost over a simpler model like linear regression?**
A: The model-comparison chart is the direct evidence: linear regression on the full feature set
still leaves meaningful error on the table because fare isn't a linear function of these features
(airport flat-rate effects, rush-hour surcharges, and grid-distance-vs-straight-line-distance
relationships are all non-linear or conditional). XGBoost's tree-based splits capture "if this AND
that" interactions (e.g. "if `is_jfk_trip` AND `distance_km` is large") that a linear model
structurally cannot represent without those interactions being hand-engineered as explicit
multiplied features first.

**Q: Why not use a neural network?**
A: For structured/tabular data at this scale and feature count, gradient-boosted trees (XGBoost)
are a standard, well-justified choice, and typically match or beat neural networks on this class of
problem without needing the much larger data volumes, longer training times, and heavier tuning
neural approaches usually require. This project's decision reflects standard practice for tabular
regression, not a limitation.

**Q: How did you validate the model isn't overfitting?**
A: `early_stopping_rounds=60` in `train_extreme.py` halts training the moment validation RMSE stops
improving, and the reported ≈$3.55 figure is measured on a validation split the model never trained
on — not on training-set error, which would be an invalid (optimistic) measure of real performance.

**Q: What's the single most important feature?**
A: The Insights dashboard's feature-importance chart answers this directly from the trained model's
own `.feature_importances_` — expect `distance_km` (and/or `manhattan_km`) to dominate, since fare is
fundamentally distance-driven; be ready to open that specific chart if asked, rather than guessing
from memory.

**Q: Your dataset has 55 million rows — did you train on all of them?**
A: Not in one pass with `train_extreme.py` — that script samples up to `EXTREME_TRAIN_MAX_ROWS`
(20 million) cleaned rows, since a well-sampled 20M rows for this problem gets diminishing returns
against the compute cost of all 55M. `train_incremental.py` is the alternative path that _does_ walk
the full dataset, chunk by chunk, updating the same model progressively (`xgb_model=model.get_booster()`
continuation) rather than loading everything into memory at once.

**Q: How do you handle NYC's actual 2012 fare increase in the data?**
A: Explicitly — `is_post_2012_hike` is an engineered boolean feature (`scripts/shared/features.py`)
set for any trip from September 2012 onward, reflecting a real, documented NYC taxi fare-structure
change. Rather than hoping the model infers this from `year`/`month` alone, it's handed to the model
directly as a flag.

### Product / UX questions

**Q: Why map-based pin placement instead of just typing an address?**
A: Two complementary input methods are offered, not one: the map for precision (exact coordinates,
visual confirmation of the route) and free-text description for speed (skip the map entirely for
common trips). The map path also has no dependency on an LLM being available, so it works even if
Ollama is down — a deliberate resilience choice.

**Q: What happens if the LLM misunderstands a description?**
A: It's parsed defensively at two levels: `server/services.py` strips accidental Markdown code
fences before JSON-parsing the LLM's raw text output, and `server/app.py` clamps whatever
`passenger_count` comes back into the trained model's valid range ([1, 6]) rather than feeding the
model an out-of-distribution value the LLM might have hallucinated.

**Q: Why show an "illustrative" fare breakdown instead of the model's real internal computation?**
A: Because it _is_ illustrative, and the UI says so — XGBoost doesn't decompose a prediction into
"base + distance + surcharge" the way the breakdown bar implies; that breakdown is a client-side
approximation computed from the submitted trip's own rush-hour/airport flags, built for
interpretability, not a literal readout of the model's internals. Be ready to say this plainly if
asked — claiming otherwise would misrepresent what the model actually does.

### Edge case / robustness questions

**Q: What if someone requests a trip entirely outside NYC?**
A: The map itself is bounded to a fixed NYC lat/lon box (`TripMap.tsx`'s `maxBounds`, using the same
`NYC_LAT_MIN`/`MAX`/`NYC_LON_MIN`/`MAX` constants `scripts/config.py` uses for training-data cleaning)
— you cannot place a pin outside that box in the first place, so the model is never asked to
extrapolate to coordinates it never saw in training.

**Q: What if the description names a location not in your landmark table?**
A: `/parse-trip` returns a 200 (not an error) with whatever _did_ parse successfully (time,
passenger count) plus a `warning` field naming which side failed to resolve — the person places that
one pin manually rather than the whole request silently failing or guessing a wrong location.

**Q: What if two people request the identical trip through different input methods — do they get the
same fare?**
A: Yes, by construction — `server/app.py::run_model_prediction()` is the single function both
`/predict` and `/parse-trip` call for actual model inference; there's no second, separately
maintained copy of the log-transform/clip/round logic that the two paths could drift apart on.

**Q: How would this scale to real-time production traffic (not a demo)?**
A: Honest answer, not a defensive one: the current Flask setup loads one model into memory at import
time and serves synchronously — fine for a case study, but a production deployment would want a
proper WSGI server (gunicorn/uWSGI) instead of Flask's development server, and would want the known
model-artifact path issue resolved and CI-verified rather than depending on a developer's local file
layout matching `scripts/config.py`'s expectations by coincidence.

---

## A closing note on tone

The strongest answers in a Phase 2 viva are usually the ones that say _"here's the trade-off we made,
and here's why,"_ not the ones that claim the project has no limitations. This repo has one real,
confirmed blocking bug (the missing model artifact) and a handful of smaller rough edges — naming them
accurately, with the fix already scoped (see the PRD), reads as more credible than pretending
everything is finished.
