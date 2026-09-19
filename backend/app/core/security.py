import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.core.config import settings

ALGORITHM = "HS256"
TOKEN_ISSUER = "bible-editorial-ai-backend"
TOKEN_AUDIENCE = "bible-editorial-ai-api"

DUMMY_PASSWORD_HASH = bcrypt.hashpw(
    b"dummy-password-for-constant-time-comparison", bcrypt.gensalt()
).decode("utf-8")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: int, expires_minutes: int | None = None) -> str:
    minutes = expires_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=minutes),
        "jti": secrets.token_urlsafe(16),
        "iss": TOKEN_ISSUER,
        "aud": TOKEN_AUDIENCE,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> int:
    payload = jwt.decode(
        token,
        settings.SECRET_KEY,
        algorithms=[ALGORITHM],
        audience=TOKEN_AUDIENCE,
        issuer=TOKEN_ISSUER,
        options={"require": ["sub", "exp", "iat", "aud", "iss", "jti"]},
    )
    return int(payload["sub"])
