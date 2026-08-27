from app.core.config import settings
import re
import httpx
import json

ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_MODEL = "claude-3-5-haiku-20241022"

CONTENT_TYPE_GUIDANCE: dict[str, str] = {
  "study_note": "write for a study session, with academic or instructional tone you'll explain with meaning explanation and theology embeded with ~200 words",
  "devotional": "this should be for everyday life, with a tone that is warm and not too acedemically inclined with ~300 words"
}

STYLE_RULES: list[tuple[str, str, int, str]] = [
    (
        r"\bI(?:'m|'ll|'ve)?\b|\bme\b|\bmy\b|\bmine\b",
        "Avoid first-person voice; keep the tone objective and centered on the text.",
        15,
        "high",
    ),
    (
        r"\b(very|really|extremely|quite|totally|absolutely)\b",
        "Weak intensifier — prefer a precise word instead of 'very/really/quite'.",
        8,
        "medium",
    ),
    (
        r"\bin order to\b",
        "Wordy — 'in order to' can usually be trimmed to 'to'.",
        4,
        "low",
    ),
    (
        r"\bdue to the fact that\b",
        "Wordy — replace with 'because'.",
        4,
        "low",
    ),
    (
        r"\b(TODO|lorem|PLACEHOLDER|insert text here)\b",
        "Placeholder text left in the draft.",
        15,
        "high",
    ),
]


def _find_snippet(body: str, pattern: str) -> str | None:
    match = re.search(pattern, body, flags=re.IGNORECASE)
    if match is None:
        return None
    start = max(0, match.start() - 15)
    end = min(len(body), match.end() + 25)
    return body[start:end].strip()

def build_draft_prompt(
        passage: str, title: str, content_type: str, style_guide: str, translation: str
) -> str:
    guidance = CONTENT_TYPE_GUIDANCE.get(content_type, "Write clearly and concisely.")
    return f"""You are a bible publisher or a publishing house.

Do not fabricate content but let it be around the {passage}.
No heading. Follow the style guide instructions.

Write a {content_type} with a title: {title} around {passage}.
Follow this style: {guidance}
Use this translation: {translation}
Style guide: {style_guide}
"""

def build_mock_draft(
    passage: str, title: str, content_type: str, style_guide: str
) -> str:
    """Return a placeholder draft when no API key is set."""
    return f"This is a demo draft for {title} about {passage}. No API key set."


def build_mock_style_issues(body: str, style_guide: str) -> dict:
    """Return rule-based style check when no API key is set."""
    issues = []
    for pattern, reason, weight, severity in STYLE_RULES:
        snippet = _find_snippet(body, pattern)
        if snippet:
            issues.append(
                {"snippet": snippet, "reason": reason, "severity": severity}
            )
    if "!" in body and style_guide and "exclam" not in style_guide.lower():
        idx = body.find("!")
        issues.append(
            {
                "snippet": body[max(0, idx - 30) : min(len(body), idx + 1)].strip(),
                "reason": "Exclamation point in editorial prose; keep the tone measured.",
                "severity": "medium",
            }
        )
    score = max(0, 100 - sum(weight for pattern, _, weight, _ in STYLE_RULES if _find_snippet(body, pattern)))
    if "!" in body and style_guide and "exclam" not in style_guide.lower():
        score = max(0, score - 8)
    return {"score": score, "issues": issues}


async def generate_draft(
    passage: str, title: str, content_type: str, style_guide: str = "", translation: str = ""
) -> tuple[str, bool]:
    """Generate an editorial draft.

    Returns (text, is_demo). If is_demo is True, the text is a placeholder.
    """
    if not settings.ANTHROPIC_API_KEY:
        return build_mock_draft(passage, title, content_type, style_guide), True

    prompt = build_draft_prompt(passage, title, content_type, style_guide, translation)
    async with httpx.AsyncClient(timeout=60) as client:
        try:
            response = await client.post(
                url = ANTHROPIC_URL,
                headers={
                    "x-api-key": settings.ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": ANTHROPIC_MODEL,
                    "max_tokens": 500,
                    "messages": [{"role": "user", "content": prompt}]
                }
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            print(f"API error: {e.response.status_code} : {e.response.text}")
            return "Draft generation failed due to API error", True
        except httpx.RequestError as e:
            print(f"Network error: {e}")
            return "Draft generation failed due to Network error", True
        data = response.json()
        text = data["content"][0]["text"]
    return text, False


def build_style_check_prompt(body: str, style_guide: str) -> str:
    return f"""You are an editorial style checker for a Bible publishing house.
    
    Review the following manuscript against these style rules:
    {style_guide}

    Manuscript:
    {body}

    check for violations and return ONLY a JSON object with this exact format:
    {{"score": 0-100, "issues": [{{"snippet": "the offending text", "reason": "why it violates",
    "severity": "high|medium|low"}}]}}

    Score 100 means perfect. Deduct for each violation. Return ONLY the JSON, nothing else"""


async def check_style_guide(
    body: str, style_guide: str = ""
) -> tuple[dict, bool]:
    """Check a manuscript against the style guide.

    Returns (result_dict, is_demo). result_dict has keys "score" and "issues".
    """
    if not settings.ANTHROPIC_API_KEY:
        return build_mock_style_issues(body, style_guide), True
    prompt = build_style_check_prompt(body=body, style_guide=style_guide)
    async with httpx.AsyncClient(timeout=60) as client:
        try:
            response = await client.post(
                url = ANTHROPIC_URL,
                headers = {
                    "x-api-key": settings.ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json = {
                    "model": ANTHROPIC_MODEL,
                    "max_tokens": 500,
                    "messages": [{"role": "user", "content": prompt}]
                }
            )
            response.raise_for_status()
            data = response.json()
            text = data["content"][0]["text"]
            result = json.loads(text)
        except httpx.HTTPStatusError as e:
            print(f"API error: {e.response.status_code}, {e.response.text}")
            return {"score": 0, "issues": ["API error"]}, True
        except httpx.RequestError as e:
            print(f"Network Error: {e}")
            return {"score": 0, "issues": ["Request error"]}, True
    return result, False

