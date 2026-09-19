import time

from fastapi import Depends, HTTPException, Request, status

from app.api.deps import get_current_user
from app.models.user import User


class FixedWindowRateLimiter:
    """Per-key, fixed-window rate limiter with hard 60-second buckets.

    Standard semantics: at most ``max_requests`` requests per key in any
    aligned ``window_seconds`` bucket. Once a bucket is full, every further
    request for that key gets HTTP 429 until the bucket rolls over.

    The default key is the client IP. It is derived from the first value of
    ``X-Forwarded-For``; in front of a trusted proxy (Railway) that value is
    the real client address because the proxy rewrites the header. Callers
    may pass an explicit key (e.g. ``user:{id}``) for authenticated routes.
    """

    def __init__(self, max_requests: int = 5, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._hits: dict[tuple[str, int], int] = {}
        self._last_prune = 0

    def reset(self) -> None:
        """Clear all counters (used by tests, never by the app)."""
        self._hits.clear()

    def check(self, request: Request) -> None:
        self._check_key(self._client_ip(request))

    def check_key(self, key: str) -> None:
        self._check_key(key)

    def _check_key(self, key: str) -> None:
        now = int(time.monotonic())
        self._prune(now)

        bucket = now // self.window_seconds
        count = self._hits.get((key, bucket), 0)

        if count >= self.max_requests:
            retry_after = max(1, self.window_seconds - (now % self.window_seconds))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Try again in a minute.",
                headers={"Retry-After": str(retry_after)},
            )

        self._hits[(key, bucket)] = count + 1

    def _prune(self, now: int) -> None:
        if now - self._last_prune < self.window_seconds:
            return
        self._last_prune = now
        cutoff_bucket = (now // self.window_seconds) - 1
        self._hits = {k: v for k, v in self._hits.items() if k[1] >= cutoff_bucket}

    @staticmethod
    def _client_ip(request: Request) -> str:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"


login_limiter = FixedWindowRateLimiter(max_requests=5, window_seconds=60)
register_limiter = FixedWindowRateLimiter(max_requests=10, window_seconds=60)
draft_limiter = FixedWindowRateLimiter(max_requests=20, window_seconds=60)
style_limiter = FixedWindowRateLimiter(max_requests=20, window_seconds=60)


def rate_limit_client(request: Request) -> None:
    """Reject login once the client IP's window is full."""
    login_limiter.check(request)


def rate_limit_register(request: Request) -> None:
    """Throttle account creation per client IP (prevents mass sign-ups)."""
    register_limiter.check(request)


def rate_limit_draft(
    request: Request, user: User = Depends(get_current_user)
) -> None:
    """Throttle AI draft generation per authenticated user (billing guard)."""
    draft_limiter.check(request)
    draft_limiter.check_key(f"user:{user.id}")


def rate_limit_style(
    request: Request, user: User = Depends(get_current_user)
) -> None:
    """Throttle style-check/QA/consistency calls per authenticated user."""
    style_limiter.check(request)
    style_limiter.check_key(f"user:{user.id}")