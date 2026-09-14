from unittest.mock import patch
from urllib.parse import parse_qs

from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.ratelimit import limiter

RATE = int(settings.LOGIN_RATE_LIMIT.split("/", 1)[0])


def _register(client: TestClient) -> None:
    client.post(
        "/api/v1/auth/register",
        json={
            "email": "rate@test.ai",
            "password": "test-password-1",
            "full_name": "Rate Tester",
        },
    )


def test_login_rate_limited_after_max_attempts(client: TestClient) -> None:
    limiter.enabled = True
    _register(client)
    for _ in range(RATE):
        response = client.post(
            "/api/v1/auth/login",
            json={"email": "rate@test.ai", "password": "wrong-password"},
        )
        assert response.status_code == 401
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "rate@test.ai", "password": "wrong-password"},
    )
    assert response.status_code == 429


def test_login_valid_within_limit(client: TestClient) -> None:
    limiter.enabled = True
    _register(client)
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "rate@test.ai", "password": "test-password-1"},
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_invalid_email_runs_same_password_check(client: TestClient) -> None:
    """Constant-time guard: unknown emails must still run bcrypt."""
    with patch("app.api.v1.auth.verify_password") as mock_verify:
        mock_verify.return_value = False
        response = client.post(
            "/api/v1/auth/login",
            json={"email": "does-not-exist@test.ai", "password": "whatever"},
        )
    assert response.status_code == 401
    mock_verify.assert_called_once()
    assert len(mock_verify.call_args.args) == 2