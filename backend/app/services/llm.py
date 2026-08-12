import httpx

from app.core.config import settings

OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions"


def build_draft_prompt(passage: str, title: str, content_type: str, style_guide: str) -> str:
    return f"""You are an editorial assistant for a Christian publishing house.

Write a {content_type} with the title "{title}" based on the Bible passage {passage or "provided below"}.

Requirements:
- Write in a clear, devotional yet theologically careful tone.
- Do not fabricate details that are not in the passage.
- Keep it concise (150-300 words).
- If a style guide is provided, follow it exactly.

{('Style guide:\n' + style_guide) if style_guide else ''}
"""


async def generate_draft(
    passage: str, title: str, content_type: str, style_guide: str = ""
) -> str:
    if not settings.OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not configured")

    prompt = build_draft_prompt(passage, title, content_type, style_guide)

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
        return data["choices"][0]["message"]["content"].strip()
