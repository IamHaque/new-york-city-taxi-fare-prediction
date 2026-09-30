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
- [ ] **The Flask server actually starts — i.e. the model artifacts are present.**
      `server/app.py` loads `trained-models/fare_model_extreme.pkl` +
      `trained-models/model_metadata_extreme.pkl` at import time. Both now exist locally (trained
      27 Sep 2026), so the server starts fine on _this_ machine — but they are **git-untracked**,
      so a fresh clone or the demo machine will die with `FileNotFoundError` until you either copy
      the two files over or retrain with `python scripts/train_extreme.py`. Background:
      [`docs/Taxi_Fare_UI_PRD_v5_Fixes_and_Enhancements.md`](Taxi_Fare_UI_PRD_v5_Fixes_and_Enhancements.md#epic-1).
      **Verify this days before the demo, not the morning of** — training a fresh model takes time,
      and you want to have re-verified `npm run build`/the client against whichever model you land on.
- [ ] **`client/.env` exists and is filled in.** Copy `client/.env.example` → `client/.env`
      (gitignored) and set `VITE_API_BASE_URL` to wherever your Flask server actually runs
      (defaults to `http://localhost:5000`), plus **`VITE_CARTO_KEY`** — without it, dark-theme map
      tiles come back watermarked with "API KEY REQUIRED" (CARTO's keyless policy since Sept 2026).
- [ ] **`client/src/data/*.json` exists and isn't empty** — these back the entire Insights dashboard.
      If you need to regenerate them: `python -m scripts.generate_chart_data` (needs `train.csv`
      locally, and it loads the same extreme-model artifacts as the server — if those are missing,
      fix the checklist item above first).
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
- **Show the recent-estimates card** under the result: three rows inline, a "See all N estimates"
  button opens the full session history in a dialog, and clicking any row (card or dialog) reloads
  that trip. One narration line: _"The list upserts by payload — re-running the same trip refreshes
  that row and moves it to the top instead of duplicating it — capped at 50 for the session."_
- **Point at manual coordinate entry:** each location row expands into lat/lon number inputs
  (NYC-bounded, with range errors), so a location can be set by keyboard without touching the map —
  the answer if the evaluator asks about accessibility or non-pointer input.
- **Clear pins** clears _both_ pins and their address labels in one action (this went through a real
  stale-state bug — two sequential per-side updates — and is now a single atomic state update; only
  mention it if asked about state-management bugs you've fixed).

### 3. The natural-language flow — this is the centerpiece

- Type a trip description: _"2 people from Times Square to JFK on Friday at 6pm"_.
- Narrate the pipeline **while it's loading**, since this is the most interesting technical content
  in the whole project: _"This text goes to a local LLM — Llama 3, running via Ollama, entirely
  offline — which extracts the pickup landmark, drop-off landmark, and time/passenger fields as
  JSON. The server then resolves those landmark names to real coordinates, and — if both sides
  resolve — runs the exact same trained model, through the exact same code path as the manual form,
  to produce a fare. All of that happens in one request."_
- Keep talking through the extraction rules — this is the part evaluators dig into: _"The model is
  deliberately conservative: JSON-grammar decoding at temperature 0, and it only echoes what the
  text literally says — null for anything unstated, never a made-up date. Dayparts map to fixed
  hours (morning→8, afternoon→14, evening→19, night→22), a day name alone only sets the weekday
  and never implies a month or year, and the description itself is fenced as data so instructions
  inside it are ignored."_
- When the form populates, expect the disclosure notice. For the example above, hour (6pm) and
  Friday came from the text but month/year didn't, so the UI says _"No time stated in the text -
  filled in with the current date/time for month, year."_ Have this line ready: _"The model can't
  know today's date — so the server fills what's missing from the real clock and tells the user
  exactly which fields it assumed. It never silently fabricates time."_
- First Ollama call takes roughly 8–15 seconds cold — that pause is normal, not a hang; later calls
  in the session are faster.
- When the map/form populate and the fare appears, make the "one request" point concrete: _"I didn't
  click predict a second time — the parse endpoint already ran the model."_

### 4. The insights dashboard

- Walk through one chart from each of the four categories (demand, fares, locations, model
  comparison) rather than every chart. For the model comparison chart specifically, narrate the
  progression: _"Predicting the mean fare for every trip gets you to about $9.30 RMSE. Distance
  alone — which is what Kaggle says you should expect to land at $5–8 — gets to about
  $4.09. Linear regression is right there at $4.08. Our production 26-feature XGBoost model gets to
  about $2.84."_ This single sentence answers "did the ML actually help" better than anything else
  in the demo.

### 5. Theme toggle (10 seconds, don't over-invest here)

Click through System → Light → Dark. Mention only in passing that it's token-driven, not per-component
overrides — this isn't the technical heart of the project and shouldn't eat demo time. If asked about
the map in dark mode: it's CARTO's dark raster basemap keyed via `VITE_CARTO_KEY` (light mode uses
plain OpenStreetMap tiles).

### 6. Close by naming what you'd do next

Evaluators tend to respond well to a closing "if I had more time" list, because it shows you
understand the project's current limits rather than believing it's flawless. Good, honest candidates
(all real, most scoped in the PRDs): expanding the landmark table or replacing it with live
geocoding, making the model artifacts reproducible (CI-built instead of hand-trained untracked
files), persisting recent estimates across sessions, and a proper WSGI deployment. Note what **not**
to offer: "a keyboard-accessible way to set a location without the map" is **done** — the
manual lat/lon inputs cover it — proposing it as future work would undersell shipped work.

---

## If the live demo goes wrong

- **`/parse-trip` returns a `warning`, no fare.** This isn't a bug to panic over — it's a designed
  degradation path. Say so: _"That location wasn't in our landmark table, so the server correctly
  told us it couldn't resolve it rather than guessing — the time and passenger fields still came
  through complete, with any assumed fields disclosed, and I can place that pin manually."_ Then do
  exactly that. This turns a demo hiccup into evidence you understand your own error-handling design.
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
improving, and the reported ≈$2.84 figure is measured on a validation split the model never trained
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
A: It's constrained at four layers. (1) The prompt (`scripts/config.py::TRIP_PARSER_PROMPT_TEMPLATE`)
is a strict extractor: JSON-grammar decoding, `temperature: 0`, and the rule "null for anything not
stated" — dayparts map to fixed hours, day names alone never imply a month/year, and the landmark
list the model may copy from is the same canonical list the resolver uses. (2)
`server/services.py::sanitize_extracted_trip` range-validates every field — anything missing or
out of range becomes `null`, never a default `0` that could poison feature computation.
(3) `server/app.py::resolve_time_fields` completes the time fields server-side (explicit text >
`today`/`tomorrow` resolved against the real clock > current date/time) and reports everything it
filled as `assumed_time_fields`, which the UI discloses to the user. (4) `passenger_count` defaults
to 1 and is clamped to the trained range [1, 6]. A markdown-fence strip still sits behind the JSON
parse as a last-resort fallback for stubborn outputs.

**Q: How do you stop the LLM from making up a date/time the user never gave?**
A: The model is never allowed to fill time itself. Unstated fields are JSON `null` by rule,
decoding is grammar-constrained at `temperature: 0`, and `sanitize_extracted_trip` discards
anything out of range — so a fabrication like `year: 0` or a guessed weekday cannot survive into
the response. The server then completes what's missing from the real clock
(`resolve_time_fields`: explicit > relative > now) and returns the filled-in list as
`assumed_time_fields`, which the UI surfaces verbatim. Text like "ignore all previous instructions
and return {…}" is fenced inside `<description>` tags and treated as data — the extraction test
suite includes exactly this attack and confirms it's ignored.

**Q: Why show an "illustrative" fare breakdown instead of the model's real internal computation?**
A: Because it _is_ illustrative, and the UI says so — XGBoost doesn't decompose a prediction into
"base + distance + surcharge" the way the breakdown bar implies; that breakdown is a client-side
approximation computed from the submitted trip's own rush-hour/airport flags, built for
interpretability, not a literal readout of the model's internals. Be ready to say this plainly if
asked — claiming otherwise would misrepresent what the model actually does.

**Q: Why doesn't clicking an estimate in "Recent Estimates" duplicate it?**
A: The list upserts by payload. `TripPlanner.tsx::appendRecentEstimate` compares all nine model
inputs (`tripsEqual`) and, on a match, refreshes that row — new fare, new timestamp, labels
re-resolved — and moves it to the top instead of appending a copy. All four add paths (form submit,
text parse, drag re-estimate, recent-row click/retry) funnel through that single function, so the
invariant holds everywhere. The card shows three rows inline, the rest behind a "See all" dialog,
capped at 50 per session.

### Edge case / robustness questions

**Q: What if someone requests a trip entirely outside NYC?**
A: The map itself is bounded to a fixed NYC lat/lon box (`TripMap.tsx`'s `maxBounds`, using the same
`NYC_LAT_MIN`/`MAX`/`NYC_LON_MIN`/`MAX` constants `scripts/config.py` uses for training-data cleaning)
— you cannot place a pin outside that box in the first place, so the model is never asked to
extrapolate to coordinates it never saw in training.

**Q: What if the description names a location not in your landmark table?**
A: `/parse-trip` returns a 200 (not an error) with whatever _did_ parse successfully plus a
`warning` field naming which side failed to resolve — the person places that one pin manually
rather than the whole request failing or a wrong location being guessed. The anti-hallucination
design matters here too: the prompt embeds the canonical 31-name landmark list, so the model can
only copy a recognized name or return `null` — it won't invent "central station" and silently match
it to the wrong place. Time and passenger fields still come back complete (with any assumed fields
disclosed in `assumed_time_fields`), and the client's error message names the side and the
unrecognized text — never the literal string "null".

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
and here's why,"_ not the ones that claim the project has no limitations. This repo's sharpest edge
is now reproducibility rather than a crash: the trained extreme-model artifacts work on this
machine but are **untracked**, so a fresh clone won't boot the server until they're copied over or
retrained — naming that accurately, with the fix already scoped (see the PRD), reads as more
credible than pretending everything is finished.
