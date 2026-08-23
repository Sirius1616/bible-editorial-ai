from app.core.config import settings
import httpx
import json

ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_MODEL = "claude-3-5-haiku-20241022"

CONTENT_TYPE_GUIDANCE: dict[str, str] = {
  "study_note": "write for a study session, with academic or instructional tone you'll explain with meaning explanation and theology embeded with ~200 words",
  "devotional": "this should be for everyday life, with a tone that is warm and not too acedemically inclined with ~300 words"
}

def build_draft_prompt(
        passage: str, title: str, content_type: str, style_guide: str, translation: str
) -> str:
    return f"""Role: You are a bible publisher or a publishing house
                Rule: - Do not fabricate content but let it be around the {passage}
                      - There should be no heading and follow the style  guide instructions
                
                Write a {content_type} with a title: {title} around {passage}, and 
                should follow {CONTENT_TYPE_GUIDANCE[content_type]} style and using the following translation {translation} and the {style_guide}
                      """

def build_mock_draft(
    passage: str, title: str, content_type: str, style_guide: str
) -> str:
    """Return a placeholder draft when no API key is set."""
    return f"This is a demo draft for {title} about {passage}. No API key set."


def build_mock_style_issues(body: str, style_guide: str) -> dict:
    """Return a placeholder style check when no API key is set."""
    return {"score": 100, "issues": []}


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

