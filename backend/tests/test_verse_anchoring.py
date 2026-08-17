from io import BytesIO

from docx import Document

from tests.conftest import auth_header

VERSE_ANCHOR = {
    "verse_start": {"book": "John", "chapter": 3, "verse": 16},
    "verse_end": {"book": "John", "chapter": 3, "verse": 17},
}


def _create_anchored_item(client, token: str) -> tuple[int, int]:
    headers = auth_header(token)
    response = client.post(
        "/api/v1/projects",
        headers=headers,
        json={"name": "Anchor Project", "translation": "ESV"},
    )
    project_id = response.json()["id"]

    item_response = client.post(
        f"/api/v1/projects/{project_id}/items",
        headers=headers,
        json={
            "title": "God So Loved the World",
            "content_type": "study_note",
            **VERSE_ANCHOR,
        },
    )
    assert item_response.status_code == 201
    return project_id, item_response.json()["id"]


def test_create_item_with_verse_anchor(client, token) -> None:
    headers = auth_header(token)
    project_id, item_id = _create_anchored_item(client, token)

    response = client.get(
        f"/api/v1/projects/{project_id}/items/{item_id}", headers=headers
    )
    item = response.json()
    assert item["verse_start"] == {"book": "John", "chapter": 3, "verse": 16}
    assert item["verse_end"] == {"book": "John", "chapter": 3, "verse": 17}
    assert item["passage"] == "John 3:16-17"


def test_update_item_verse_anchor(client, token) -> None:
    headers = auth_header(token)
    project_id, item_id = _create_anchored_item(client, token)

    response = client.patch(
        f"/api/v1/projects/{project_id}/items/{item_id}",
        headers=headers,
        json={"verse_start": {"book": "John", "chapter": 3, "verse": 17}},
    )
    item = response.json()
    assert item["verse_start"]["verse"] == 17
    assert item["verse_end"] is None
    assert item["passage"] == "John 3:17"


def test_version_footnotes_and_cross_refs_export(client, token) -> None:
    headers = auth_header(token)
    project_id, item_id = _create_anchored_item(client, token)

    version_response = client.post(
        f"/api/v1/projects/{project_id}/items/{item_id}/versions",
        headers=headers,
        json={
            "body": "God so loved the world that he gave his only Son.",
            "change_note": "added references",
            "footnotes": [{"number": 1, "text": "Greek: monogenes, only-begotten."}],
            "cross_refs": ["John 1:14", "1 John 4:9"],
        },
    )
    assert version_response.status_code == 201
    version = version_response.json()
    assert version["footnotes"][0]["text"].startswith("Greek")
    assert version["cross_refs"] == ["John 1:14", "1 John 4:9"]

    md = client.get(
        f"/api/v1/projects/{project_id}/items/{item_id}/export", headers=headers
    )
    assert md.status_code == 200
    assert "John 3:16-17" in md.text
    assert "## Footnotes" in md.text
    assert "only-begotten" in md.text
    assert "## See Also" in md.text
    assert "John 1:14" in md.text
    assert "1 John 4:9" in md.text

    docx_response = client.get(
        f"/api/v1/projects/{project_id}/items/{item_id}/export",
        params={"format": "docx"},
        headers=headers,
    )
    document = Document(BytesIO(docx_response.content))
    texts = [p.text for p in document.paragraphs]
    assert any("John 3:16-17" in t for t in texts)
    assert any("Footnotes" in t for t in texts)
    assert any("only-begotten" in t for t in texts)
    assert any("See Also" in t for t in texts)
    assert any("John 1:14" in t for t in texts)
