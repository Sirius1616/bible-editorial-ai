from unittest.mock import patch

import pytest
from fastapi import HTTPException, Request
from fastapi.testclient import TestClient

from app.core.ratelimit import FixedWindowRateLimiter


def make_request(client_ip: str = "1.2.3.4", forwarded: str | None = None):
    scope = {
        "type": "http",
        "method": "POST",
        "path": "/",
        "client": (client_ip, 1234),
        "server": ("testserver", 80),
        "query_string": b"",
    }
    headers = []
    if forwarded:
        headers.append((b"x-forwarded-for", forwarded.encode()))
    return Request({"type": "http", "headers": headers, **scope})


def test_fixed_window_allows_five_then_blocks(client: TestClient) -> None:
    client.post(
        "/api/v1/auth/register",
        json={"email": "fixed@test.ai", "password": "test-password-1", "full_name": "Fixed Test"},
    )
    for i in range(5):
        response = client.post(
            "/api/v1/auth/login",
            json={"email": "fixed@test.ai", "password": "wrong"},
        )
        assert response.status_code == 401, f"attempt {i + 1} should be 401"
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "fixed@test.ai", "password": "wrong"},
    )
    assert response.status_code == 429
    assert "Retry-After" in response.headers


def test_sixth_correct_password_is_still_blocked_in_same_window(client: TestClient) -> None:
    """The hard-lock guarantee: a correct credential cannot bypass a full window."""
    client.post(
        "/api/v1/auth/register",
        json={"email": "locked@test.ai", "password": "test-password-1", "full_name": "Locked Test"},
    )
    for _ in range(5):
        client.post("/api/v1/auth/login", json={"email": "locked@test.ai", "password": "wrong"})
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "locked@test.ai", "password": "test-password-1"},
    )
    assert response.status_code == 429


def test_valid_login_within_limit(client: TestClient) -> None:
    client.post(
        "/api/v1/auth/register",
        json={"email": "ok@test.ai", "password": "test-password-1", "full_name": "Ok Test"},
    )
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "ok@test.ai", "password": "test-password-1"},
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_counters_are_per_ip() -> None:
    limiter = FixedWindowRateLimiter(max_requests=2, window_seconds=60)
    assert limiter.check(make_request("10.0.0.1")) is None
    assert limiter.check(make_request("10.0.0.1")) is None
    with pytest.raises(HTTPException) as exc:
        limiter.check(make_request("10.0.0.1"))
    assert exc.value.status_code == 429
    assert limiter.check(make_request("10.0.0.2")) is None


def test_client_ip_uses_forwarded_header_when_present() -> None:
    header = make_request("10.0.0.1", forwarded="203.0.113.9, 10.0.0.1")
    assert FixedWindowRateLimiter._client_ip(header) == "203.0.113.9"
    assert FixedWindowRateLimiter._client_ip(make_request("10.0.0.1")) == "10.0.0.1"


def test_invalid_email_runs_same_password_check(client: TestClient) -> None:
    """Constant-time guard: unknown emails must still run bcrypt."""
    with patch("app.api.v1.auth.verify_password", return_value=False) as mock_verify:
        response = client.post(
            "/api/v1/auth/login",
            json={"email": "does-not-exist@test.ai", "password": "whatever"},
        )
    assert response.status_code == 401
    mock_verify.assert_called_once()
    assert len(mock_verify.call_args.args) == 2