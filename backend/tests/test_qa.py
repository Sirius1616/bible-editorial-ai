import pytest

from app.core.config import settings
from tests.conftest import auth_header


def _create_anchored_item(client, token):
    headers = auth_header(token)
    response = client.post(
        "/api/v1/projects",
        headers=headers,
        json={"name": "QA Project", "translation": "ESV"},
    )
    project_id = response.json()["id"]
    item_response = client.post(
        f"/api/v1/projects/{project_id}/items",
        headers=headers,
        json={
            "title": "God So Loved the World",
            "content_type": "study_note",
            "verse_start": {"book": "John", "chapter": 3, "verse": 16},
            "verse_end": {"book": "John", "chapter": 3, "verse": 17},
        },
    )
    assert item_response.status_code == 201
    return project_id, item_response.json()["id"]


def _add_version(client, token, project_id, item_id, body):
    response = client.post(
        f"/api/v1/projects/{project_id}/items/{item_id}/versions",
        headers=auth_header(token),
        json={"body": body, "change_note": "draft"},
    )
    assert response.status_code == 201
    return response.json()


def test_scripture_qa_demo_mode_flags_quote_error(client, token, monkeypatch) -> None:
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "")
    headers = auth_header(token)
    project_id, item_id = _create_anchored_item(client, token)

    body = (
        "Grace is God's gift. As the passage puts it, "
        "\"For God so loved the world that he gave his only begotten Son...\" "
        "salvation is by grace alone."
    )

    response = client.post(
        f"/api/v1/projects/{project_id}/items/{item_id}/qa",
        headers=headers,
        json={"body": body},
    )
    assert response.status_code == 200
    result = response.json()
    assert result["demo"] is True
    assert result["reference"] == "John 3:16-17"
    assert 0 <= result["score"] <= 100
    assert result["issues"] == []


def test_scripture_qa_demo_uses_default_body(client, token, monkeypatch) -> None:
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "")
    headers = auth_header(token)
    project_id, item_id = _create_anchored_item(client, token)
    _add_version(
        client,
        token,
        project_id,
        item_id,
        "Grace is God's gift. He said \"he gave his only begotten son\" — by grace alone.",
    )

    response = client.post(
        f"/api/v1/projects/{project_id}/items/{item_id}/qa",
        headers=headers,
        json={},
    )
    assert response.status_code == 200
    result = response.json()
    assert result["demo"] is True
    assert result["reference"] == "John 3:16-17"


def test_scripture_qa_requires_verse_anchor(client, token, monkeypatch) -> None:
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "")
    headers = auth_header(token)
    response = client.post(
        "/api/v1/projects",
        headers=headers,
        json={"name": "QA Project 2", "translation": "ESV"},
    )
    project_id = response.json()["id"]
    item_response = client.post(
        f"/api/v1/projects/{project_id}/items",
        headers=headers,
        json={"title": "No anchor", "content_type": "study_note"},
    )
    item_id = item_response.json()["id"]

    response = client.post(
        f"/api/v1/projects/{project_id}/items/{item_id}/qa",
        headers=headers,
        json={},
    )
    assert response.status_code == 400
    assert "verse anchor" in response.json()["detail"]


@pytest.mark.parametrize("quote,expected_score", [
    ("God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.", 100),
    ("And so John was thrown into a deep dark prison for many long years.", 0),
])
def test_scripture_qa_demo_detects_known_quote_errors(
    client, token, monkeypatch, quote: str, expected_score: int
) -> None:
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "")
    headers = auth_header(token)
    project_id, item_id = _create_anchored_item(client, token)
    _add_version(
        client,
        token,
        project_id,
        item_id,
        f"The writer says \"{quote}\" so the invitation stands.",
    )

    response = client.post(
        f"/api/v1/projects/{project_id}/items/{item_id}/qa",
        headers=headers,
        json={},
    )
    assert response.status_code == 200
    result = response.json()
    if expected_score == 100:
        assert result["issues"] == []
        assert result["score"] == 100
    else:
        assert len(result["issues"]) >= 1
        assert result["issues"][0]["reference"] == "John 3:16-17"