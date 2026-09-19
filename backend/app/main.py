import secrets

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.v1.router import api_router
from app.core.config import settings


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Apply baseline hardening response headers to every reply (SPA + API)."""

    HEADERS = {
        "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "no-referrer",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Resource-Policy": "same-origin",
    }

    async def dispatch(self, request: Request, call_next) -> Response:
        response: Response = await call_next(request)
        for header, value in self.HEADERS.items():
            response.headers.setdefault(header, value)
        return response


def create_app() -> FastAPI:
    docs_enabled = settings.ENVIRONMENT != "production"
    app = FastAPI(
        title=settings.APP_NAME,
        version="0.1.0",
        description="AI-assisted editorial production platform for Bible publishers.",
        docs_url="/docs" if docs_enabled else None,
        redoc_url="/redoc" if docs_enabled else None,
        openapi_url="/openapi.json" if docs_enabled else None,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(SecurityHeadersMiddleware)

    app.include_router(api_router, prefix="/api/v1")

    @app.get("/health", tags=["system"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
