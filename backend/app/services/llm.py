from app.core.config import settings


async def generate_draft(prompt: str) -> str:
    if not settings.OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not configured")
    raise NotImplementedError
