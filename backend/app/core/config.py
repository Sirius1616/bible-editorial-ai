from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    APP_NAME: str = "Bible Editorial AI"
    ENVIRONMENT: str = "development"
    SECRET_KEY: str = "change-me-in-production-change-me-in-production-1234"
    DATABASE_URL: str = "postgresql+psycopg://editorial:editorial@localhost:5432/editorial"
    ANTHROPIC_API_KEY: str = ""
    BIBLE_API_KEY: str = ""
    BIBLE_TRANSLATIONS: str = "ESV,NIV,KJV,NASB,NLT"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    INVITE_EXPIRE_MINUTES: int = 60 * 24 * 7

    CORS_ORIGINS: str = "http://localhost:3000"

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    @property
    def bible_translations(self) -> list[str]:
        return [name.strip().upper() for name in self.BIBLE_TRANSLATIONS.split(",") if name.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
