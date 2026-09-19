from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    APP_NAME: str = "Bible Editorial AI"
    ENVIRONMENT: str = "development"
    SECRET_KEY: str = "change-me-in-production-change-me-in-production-1234"
    DATABASE_URL: str = "postgresql+psycopg://editorial:editorial@localhost:5432/editorial"

    @field_validator("DATABASE_URL")
    @classmethod
    def normalize_database_url(cls, v: str) -> str:
        """Accept psycopg2-style URLs (Railway gives postgresql://) and
        normalize them to the psycopg3 dialect SQLAlchemy needs."""
        if v.startswith("postgresql://"):
            return v.replace("postgresql://", "postgresql+psycopg://", 1)
        return v

    @field_validator("SECRET_KEY")
    @classmethod
    def enforce_secret_key_strength(cls, v: str, info) -> str:
        """Refuse to boot with the placeholder key in production — a weak JWT
        secret lets anyone forge admin tokens. Dev/test keep a usable default."""
        environment = info.data.get("ENVIRONMENT", "development") or "development"
        is_placeholder = "change-me" in v or v in {"", "your-secret-key-here"}
        if environment == "production" and (len(v) < 32 or is_placeholder):
            raise ValueError(
                "SECRET_KEY must be ≥32 bytes and non-placeholder in production; "
                "set a strong value (e.g. `openssl rand -hex 32`) in the host env."
            )
        return v

    ANTHROPIC_API_KEY: str = ""
    BIBLE_API_KEY: str = ""
    BIBLE_TRANSLATIONS: str = "ESV,NIV,KJV,NASB,NLT"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    INVITE_EXPIRE_MINUTES: int = 60 * 24 * 7

    CORS_ORIGINS: str = "http://localhost:3000"
    FRONTEND_URL: str = "http://localhost:3000"

    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    SMTP_FROM: str = "noreply@bibleeditorial.ai"

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    @property
    def bible_translations(self) -> list[str]:
        return [name.strip().upper() for name in self.BIBLE_TRANSLATIONS.split(",") if name.strip()]

    @property
    def email_enabled(self) -> bool:
        return bool(self.SMTP_HOST)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
