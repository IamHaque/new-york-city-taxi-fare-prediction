import json
import re
import requests
from scripts.config import (
    MIN_PASSENGERS,
    MAX_PASSENGERS,
    OLLAMA_URL,
    OLLAMA_MODEL_NAME,
    TRIP_PARSER_PROMPT_TEMPLATE,
)
from scripts.shared.landmarks import LANDMARK_COORDINATES

# The description is embedded into a prompt (and echoed into a JSON schema example), so keep it
# printable text only and bounded in size.
_MAX_DESCRIPTION_CHARS = 500

# Valid ranges the model may emit. Anything outside these is a fabrication -> null (the server,
# not the LLM, fills time fields with the current date when they are missing).
_HOUR_MIN, _HOUR_MAX = 0, 23
_DOW_MIN, _DOW_MAX = 0, 6
_MONTH_MIN, _MONTH_MAX = 1, 12
_YEAR_MIN, _YEAR_MAX = 1900, 2100
_RELATIVE_DAYS = ('today', 'tomorrow', 'yesterday')


def _clean_description(user_text):
    """Strips non-printable characters and caps length before the text enters the prompt."""
    text = str(user_text if user_text is not None else '')
    text = ''.join(ch for ch in text if ch.isprintable() or ch in ' \t')
    return ' '.join(text.split())[:_MAX_DESCRIPTION_CHARS]


def _to_int(value, low, high):
    """Coerces LLM output to an int within [low, high]; returns None when invalid or absent.

    Deliberately returns None (never a default like 0) for missing/garbage/out-of-range values:
    a silent 0 previously produced month=0/year=0 and KeyError'd feature computation.
    """
    if value is None or isinstance(value, bool):
        return None
    try:
        number = int(float(value))
    except (TypeError, ValueError):
        return None
    if number < low or number > high:
        return None
    return number


def _clean_landmark(value):
    if not isinstance(value, str):
        return None
    cleaned = ' '.join(value.split()).lower()[:80].strip()
    return cleaned or None


def sanitize_extracted_trip(raw):
    """Normalizes the raw LLM JSON into the strict shape /parse-trip returns.

    Every field becomes either a value inside its valid range or JSON null - never 0-by-default.
    Unknown/extra keys are dropped.
    """
    if not isinstance(raw, dict):
        raw = {}

    relative_day = raw.get('relative_day')
    if not isinstance(relative_day, str) or relative_day not in _RELATIVE_DAYS:
        relative_day = None

    return {
        'pickup_landmark': _clean_landmark(raw.get('pickup_landmark')),
        'dropoff_landmark': _clean_landmark(raw.get('dropoff_landmark')),
        'hour': _to_int(raw.get('hour'), _HOUR_MIN, _HOUR_MAX),
        'day_of_week_num': _to_int(raw.get('day_of_week_num'), _DOW_MIN, _DOW_MAX),
        'month': _to_int(raw.get('month'), _MONTH_MIN, _MONTH_MAX),
        'year': _to_int(raw.get('year'), _YEAR_MIN, _YEAR_MAX),
        'relative_day': relative_day,
        'passenger_count': _to_int(raw.get('passenger_count'), MIN_PASSENGERS, MAX_PASSENGERS),
    }


def _extract_json_object(llm_output_str):
    """Best-effort JSON object extraction from model output (code fences, stray prose, ...)."""
    try:
        return json.loads(llm_output_str)
    except json.JSONDecodeError:
        pass
    cleaned = llm_output_str.replace('```json', '').replace('```', '').strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass
    match = re.search(r'\{.*\}', cleaned, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass
    return {}


def parse_trip_description_via_llm(user_text):
    """Sends user text to local Ollama server to extract structured trip attributes.

    Returns a sanitized dict (see sanitize_extracted_trip): valid values or null, plus
    relative_day ('today'|'tomorrow'|'yesterday'|null) for the server to resolve against the
    real clock. This function never invents date/time values itself.
    """
    prompt = TRIP_PARSER_PROMPT_TEMPLATE.format(
        user_text=_clean_description(user_text),
        landmarks='\n'.join(f'- {name}' for name in LANDMARK_COORDINATES),
    )

    response = requests.post(OLLAMA_URL, json={
        "model": OLLAMA_MODEL_NAME,
        "prompt": prompt,
        "stream": False,
        # json-grammar + greedy decoding: the model must emit one valid JSON object and,
        # with temperature 0, does so deterministically instead of improvising field values.
        "format": "json",
        "options": {"temperature": 0, "num_predict": 400},
    }, timeout=120)
    response.raise_for_status()

    llm_output_str = response.json().get('response', '{}')
    return sanitize_extracted_trip(_extract_json_object(llm_output_str))
