from tests.conftest import auth_header


def test_register(client, token) -> None:
    response = client.get("/api/v1/auth/me", headers=auth_header(token))
    assert response.status_code == 200
    assert response.json()["email"] == "editor@test.ai"


def test_login_wrong_password(client) -> None:
    payload = {
        "email": "editor@test.ai",
        "password": "test-password-1",
        "full_name": "Test Editor",
    }
    client.post("/api/v1/auth/register", json=payload)
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "editor@test.ai", "password": "wrong-password"},
    )
    assert response.status_code == 401


def test_requires_auth(client) -> None:
    response = client.get("/api/v1/projects")
    assert response.status_code == 401
