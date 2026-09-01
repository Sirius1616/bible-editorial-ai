from app.core.config import settings
from app.services.bible_books import parse_reference, validate_reference
from tests.conftest import auth_header


def test_parse_reference_single_book() -> None:
    parsed = parse_reference("John 3:16")
    assert parsed == {"book": "John", "chapter": 3, "verse": 16, "end_verse": None}


def test_parse_reference_multiword_book_and_range() -> None:
    parsed = parse_reference("1 John 4:9-10")
    assert parsed["book"] == "1 John"
    assert parsed["chapter"] == 4
    assert parsed["verse"] == 9
    assert parsed["end_verse"] == 10


def test_parse_reference_unknown_book() -> None:
    assert parse_reference("Zzz 1:1") is None


def test_validate_reference_catches_bad_chapter() -> None:
    result = validate_reference("John 99:1")
    assert result["valid"] is False
    assert "chapters" in result["reason"]


def test_validate_reference_catches_bad_verse() -> None:
    result = validate_reference("John 3:0")
    assert result["valid"] is False


def test_validate_reference_rejects_unparseable() -> None:
    result = validate_reference("hello there")
    assert result["valid"] is False


def test_consistency_demo_flags_broken_cross_refs(client, token, monkeypatch) -> None:
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "")
    headers = auth_header(token)
    response = client.post(
        "/api/v1/projects",
        headers=headers,
        json={"name": "Consistency Project", "translation": "ESV"},
    )
    project_id = response.json()["id"]
    item_response = client.post(
        f"/api/v1/projects/{project_id}/items",
        headers=headers,
        json={"title": "Grace Alone", "content_type": "study_note"},
    )
    item_id = item_response.json()["id"]

    version_response = client.post(
        f"/api/v1/projects/{project_id}/items/{item_id}/versions",
        headers=headers,
        json={
            "body": "God so loved the world that He gave His only Son. God's grace is the gift.",
            "change_note": "first draft",
            "cross_refs": ["John 3:16", "Zzz 12:3", "John 3:0", "1 John 4:9"],
        },
    )
    assert version_response.status_code == 201

    response = client.post(
        f"/api/v1/projects/{project_id}/items/{item_id}/consistency",
        headers=headers,
        json={},
    )
    assert response.status_code == 200
    result = response.json()
    assert result["demo"] is True
    assert result["references_checked"] == 4
    assert result["ref_issues"] == [
        {"reference": "Zzz 12:3", "reason": "Reference does not match a Bible book (e.g. 'John 3:16').", "severity": "high"},
        {"reference": "John 3:0", "reason": "Verse must be a positive number.", "severity": "high"},
    ]
    assert 0 <= result["score"] <= 100


def test_consistency_demo_flags_terminology_drift(client, token, monkeypatch) -> None:
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "")
    headers = auth_header(token)
    response = client.post(
        "/api/v1/projects",
        headers=headers,
        json={"name": "Consistency Project 2", "translation": "ESV"},
    )
    project_id = response.json()["id"]
    item_response = client.post(
        f"/api/v1/projects/{project_id}/items",
        headers=headers,
        json={"title": "Who is Jesus", "content_type": "devotional"},
    )
    item_id = item_response.json()["id"]

    response = client.post(
        f"/api/v1/projects/{project_id}/items/{item_id}/consistency",
        headers=headers,
        json={
            "body": "Jesus is the way. jesus is the truth. Christ is the life. christ forgives.",
        },
    )
    assert response.status_code == 200
    result = response.json()
    assert result["demo"] is True
    terms = {i["term"] for i in result["term_issues"]}
    assert "Jesus" in terms
    assert "Christ" in terms


def test_consistency_requires_project_access(client, token, monkeypatch) -> None:
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "")
    headers = auth_header(token)
    response = client.post(
        f"/api/v1/projects/999/items/1/consistency",
        headers=headers,
        json={},
    )
    assert response.status_code == 404