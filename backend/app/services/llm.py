import json
import re

import httpx

from app.core.config import settings

ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_MODEL = "claude-3-5-haiku-20241022"

CONTENT_TYPE_GUIDANCE = {
    "study_note": (
        "Explain the passage's meaning, historical context, and key themes with "
        "theological care (about 200-300 words)."
    ),
    "devotional": (
        "Write a warm, personal devotional that connects the passage to everyday life "
        "with a short reflective application (about 150-250 words)."
    ),
}


def build_draft_prompt(
    passage: str, title: str, content_type: str, style_guide: str, translation: str = ""
) -> str:
    guidance = CONTENT_TYPE_GUIDANCE.get(
        content_type, "Write clearly and concisely (about 150-300 words)."
    )
    parts = [
        "You are an editorial assistant for a Christian publishing house.",
        f'Write a {content_type} titled "{title}" based on the Bible passage '
        f'{passage or "provided below"}.',
        f"Content type guidance: {guidance}",
        "Requirements:",
        "- Stay faithful to the passage; do not fabricate details not supported by it.",
        "- Avoid placeholders, headings, or a signature.",
        "- Follow the project style guide exactly where it applies.",
    ]
    if translation:
        parts.append(f"- Use the {translation} translation wording when quoting Scripture.")
    if style_guide:
        parts.append(f"\nStyle guide:\n{style_guide}")
    return "\n".join(parts) + "\n"


def build_mock_draft(
    passage: str, title: str, content_type: str, style_guide: str
) -> str:
    focus = (
        "the passage's central theme and how it holds together"
        if content_type == "study_note"
        else "a personal reflection that makes the passage feel close to daily life"
    )
    body = (
        f"{title} opens a doorway into {passage or 'this passage'}. "
        f"Readers benefit most when they slow down long enough to notice "
        f"{focus}."
    )
    body += (
        " The context matters: what the original audience heard shapes how "
        "we apply the words today, and a careful reading honors both the "
        "text and the reader."
    )
    body += (
        " Practically, this points to a simple habit — sit with the text, "
        "ask what it reveals about God and about us, and let the answer "
        "shape the day ahead."
    )
    if style_guide:
        body += f" Draft follows the project style guide: {style_guide}"
    return body


async def _call_anthropic(prompt: str, system: str = "", max_tokens: int = 500) -> str:
    headers = {
        "x-api-key": settings.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    body: dict = {
        "model": ANTHROPIC_MODEL,
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}],
    }
    if system:
        body["system"] = system

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(ANTHROPIC_URL, headers=headers, json=body)
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPStatusError as exc:
        status_code = exc.response.status_code
        if status_code == 401:
            raise RuntimeError(
                "Anthropic rejected the API key (401). Check ANTHROPIC_API_KEY."
            ) from exc
        if status_code == 429:
            raise RuntimeError(
                "Anthropic rate limit reached (429). Try again in a moment."
            ) from exc
        raise RuntimeError(
            f"Anthropic returned an error ({status_code}). Try again later."
        ) from exc
    except httpx.RequestError as exc:
        raise RuntimeError("Could not reach Anthropic. Check your network connection.") from exc

    return data["content"][0]["text"].strip()


async def generate_draft(
    passage: str, title: str, content_type: str, style_guide: str = "", translation: str = ""
) -> tuple[str, bool]:
    if not settings.ANTHROPIC_API_KEY:
        return build_mock_draft(passage, title, content_type, style_guide), True

    prompt = build_draft_prompt(passage, title, content_type, style_guide, translation)
    text = await _call_anthropic(prompt)
    return text, False


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


def build_style_check_prompt(body: str, style_guide: str) -> str:
    return (
        "You are an editorial style reviewer for a Christian publishing house. "
        "Review the provided manuscript against the project style guide and return "
        "strict JSON only, no prose, in this shape:\n"
        '{"score": <integer 0-100>, "issues": [{"snippet": <short exact phrase from the text>, '
        '"reason": <what violates the style guide and why>, "severity": <"high"|"medium"|"low">}]}\n'
        "Only flag clear violations, with a concrete reason tied to the style guide.\n\n"
        f"Style guide:\n{style_guide or '(none provided — use general editorial best practice)'}\n\n"
        f"Manuscript:\n{body}\n"
    )


def build_mock_style_issues(body: str, style_guide: str) -> dict:
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


async def check_style_guide(
    body: str, style_guide: str = ""
) -> tuple[dict, bool]:
    if not settings.ANTHROPIC_API_KEY:
        return build_mock_style_issues(body, style_guide), True

    prompt = build_style_check_prompt(body, style_guide)
    content = await _call_anthropic(prompt)

    try:
        parsed = json.loads(content)
    except json.JSONDecodeError as exc:
        start = content.find("{")
        end = content.rfind("}")
        if start == -1 or end <= start:
            raise RuntimeError(
                "Anthropic returned an unparsable style-check response. Try again."
            ) from exc
        parsed = json.loads(content[start : end + 1])
    issues = parsed.get("issues", []) if isinstance(parsed, dict) else []
    score = int(parsed.get("score", 100)) if isinstance(parsed, dict) else 100
    return {"score": max(0, min(100, score)), "issues": issues}, False
