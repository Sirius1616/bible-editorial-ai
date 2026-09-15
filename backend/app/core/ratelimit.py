import time

from fastapi import HTTPException, Request, status


class FixedWindowRateLimiter:
    """Per-IP, fixed-window rate limiter with hard 60-second buckets.

    Standard semantics: at most ``max_requests`` requests per client IP in any
    aligned ``window_seconds`` bucket. Once a bucket is full, every further
    request from that IP gets HTTP 429 until the bucket rolls over.
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
        ip = self._client_ip(request)
        now = int(time.monotonic())
        self._prune(now)

        bucket = now // self.window_seconds
        key = (ip, bucket)
        count = self._hits.get(key, 0)

        if count >= self.max_requests:
            retry_after = max(1, self.window_seconds - (now % self.window_seconds))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Try again in a minute.",
                headers={"Retry-After": str(retry_after)},
            )

        self._hits[key] = count + 1

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


limiter = FixedWindowRateLimiter()


def rate_limit_client(request: Request) -> None:
    """FastAPI dependency: reject the request once the IP's window is full."""
    limiter.check(request)