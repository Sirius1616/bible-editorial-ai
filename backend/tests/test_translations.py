import pytest

from tests.conftest import auth_header


def _create_anchored_item(client, token: str) -> tuple[int, int]:
    headers = auth_header(token)
    response = client.post(
        "/api/v1/projects",
        headers=headers,
        json={"name": "Translation Project", "translation": "ESV"},
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


def test_translations_demo_mode_from_bundled_dataset(client, token) -> None:
    headers = auth_header(token)
    project_id, item_id = _create_anchored_item(client, token)

    response = client.get(
        f"/api/v1/projects/{project_id}/items/{item_id}/translations", headers=headers
    )
    assert response.status_code == 200
    result = response.json()
    assert result["reference"] == "John 3:16-17"
    assert result["demo"] is True
    assert result["note"]

    by_name = {entry["name"]: entry for entry in result["translations"]}
    assert by_name["KJV"]["available"] is True
    assert "For God so loved the world" in by_name["KJV"]["text"]
    assert by_name["WEB"]["available"] is True
    assert "eternal life" in by_name["WEB"]["text"]
    for name in ("ESV", "NIV", "NASB", "NLT"):
        assert by_name[name]["available"] is False
        assert by_name[name]["text"] is None


def test_translations_requires_verse_anchor(client, token) -> None:
    headers = auth_header(token)
    project_response = client.post(
        "/api/v1/projects",
        headers=headers,
        json={"name": "No Anchor Project", "translation": "KJV"},
    )
    project_id = project_response.json()["id"]
    item_response = client.post(
        f"/api/v1/projects/{project_id}/items",
        headers=headers,
        json={"title": "Ungrounded", "content_type": "devotional"},
    )
    item_id = item_response.json()["id"]

    response = client.get(
        f"/api/v1/projects/{project_id}/items/{item_id}/translations", headers=headers
    )
    assert response.status_code == 400
    assert "Anchor this item" in response.json()["detail"]


def test_translations_missing_item_is_404(client, token) -> None:
    headers = auth_header(token)
    response = client.post(
        "/api/v1/projects",
        headers=headers,
        json={"name": "NotFound Project", "translation": "KJV"},
    )
    project_id = response.json()["id"]

    response = client.get(
        f"/api/v1/projects/{project_id}/items/999/translations", headers=headers
    )
    assert response.status_code == 404


def test_translations_real_mode_uses_apibible(
    client, token, monkeypatch
) -> None:
    from app.services import translation as translation_service

    monkeypatch.setattr(translation_service.settings, "BIBLE_API_KEY", "test-key")
    calls: list[str] = []

    async def fake_apibible(_client, name, reference):
        calls.append(f"{name}:{reference}")
        return f"Real text for {name}"

    monkeypatch.setattr(translation_service, "_fetch_apibible", fake_apibible)

    headers = auth_header(token)
    project_id, item_id = _create_anchored_item(client, token)
    response = client.get(
        f"/api/v1/projects/{project_id}/items/{item_id}/translations", headers=headers
    )
    assert response.status_code == 200
    result = response.json()
    assert result["demo"] is False
    assert result["note"] is None
    assert calls == ["ESV:John 3:16-17", "NIV:John 3:16-17", "KJV:John 3:16-17", "NASB:John 3:16-17", "NLT:John 3:16-17"]
    by_name = {entry["name"]: entry for entry in result["translations"]}
    assert all(entry["available"] for entry in result["translations"])
    assert by_name["ESV"]["text"] == "Real text for ESV"


def test_passage_reference_formats() -> None:
    from app.services.translation import passage_reference

    assert passage_reference("John", 3, 16) == "John 3:16"
    assert passage_reference("John", 3, 16, 17) == "John 3:16-17"
    assert passage_reference("John", 3, 16, 16) == "John 3:16"


def test_demo_comparison_builds_all_slots() -> None:
    from app.services.translation import demo_comparison

    result = demo_comparison("John 3:16", "kjv text", "web text")
    names = [entry["name"] for entry in result["translations"]]
    assert names == ["KJV", "WEB", "ESV", "NIV", "NASB", "NLT"]
    assert result["demo"] is True
    assert result["translations"][0]["text"] == "kjv text"
