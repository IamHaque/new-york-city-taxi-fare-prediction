import json
import requests
from scripts.config import OLLAMA_URL, OLLAMA_MODEL_NAME, TRIP_PARSER_PROMPT_TEMPLATE

def parse_trip_description_via_llm(user_text):
    """Sends user text to local Ollama server to extract structured trip attributes."""
    prompt = TRIP_PARSER_PROMPT_TEMPLATE.format(user_text=user_text)

    response = requests.post(OLLAMA_URL, json={
        "model": OLLAMA_MODEL_NAME,
        "prompt": prompt,
        "stream": False
    })
    response.raise_for_status()

    llm_output_str = response.json().get('response', '{}')

    # Defensively parse the JSON returned by the LLM
    try:
        parsed_data = json.loads(llm_output_str)
    except json.JSONDecodeError:
        # Fallback or stripped extraction if model includes minor markdown blocks
        cleaned_output = llm_output_str.replace("```json", "").replace("```", "").strip()
        parsed_data = json.loads(cleaned_output)

    return parsed_data
