import unittest.mock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine

from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def disable_email(monkeypatch):
    """Never hit real SMTP during tests."""
    import smtplib

    fake_server = unittest.mock.MagicMock()
    fake_server.__enter__ = unittest.mock.MagicMock(return_value=fake_server)
    fake_server.__exit__ = unittest.mock.MagicMock(return_value=False)
    monkeypatch.setattr(smtplib, "SMTP", unittest.mock.MagicMock(return_value=fake_server))



@pytest.fixture()
def client() -> TestClient:
    Base.metadata.create_all(bind=engine)
    yield TestClient(app)
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def token(client: TestClient) -> str:
    payload = {
        "email": "editor@test.ai",
        "password": "test-password-1",
        "full_name": "Test Editor",
    }
    client.post("/api/v1/auth/register", json=payload)
    response = client.post("/api/v1/auth/login", json=payload)
    return response.json()["access_token"]


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
