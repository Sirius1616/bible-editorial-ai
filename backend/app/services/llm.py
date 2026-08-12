import httpx

from app.core.config import settings

OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions"

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


async def generate_draft(
    passage: str, title: str, content_type: str, style_guide: str = "", translation: str = ""
) -> tuple[str, bool]:
    if not settings.OPENAI_API_KEY:
        return build_mock_draft(passage, title, content_type, style_guide), True

    prompt = build_draft_prompt(passage, title, content_type, style_guide, translation)

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                OPENAI_CHAT_URL,
                headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
                json={
                    "model": "gpt-4o-mini",
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 500,
                },
            )
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPStatusError as exc:
        status_code = exc.response.status_code
        if status_code == 401:
            raise RuntimeError(
                "OpenAI rejected the API key (401). Check OPENAI_API_KEY."
            ) from exc
        if status_code == 429:
            raise RuntimeError(
                "OpenAI rate limit reached (429). Try again in a moment."
            ) from exc
        raise RuntimeError(
            f"OpenAI returned an error ({status_code}). Try again later."
        ) from exc
    except httpx.RequestError as exc:
        raise RuntimeError("Could not reach OpenAI. Check your network connection.") from exc

    return data["choices"][0]["message"]["content"].strip(), False
