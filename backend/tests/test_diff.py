from tests.conftest import auth_header


def _create_item_with_versions(client, token: str) -> tuple[int, int]:
    headers = auth_header(token)
    project = client.post(
        "/api/v1/projects",
        headers=headers,
        json={"name": "Diff Project", "translation": "ESV"},
    )
    project_id = project.json()["id"]
    item = client.post(
        f"/api/v1/projects/{project_id}/items",
        headers=headers,
        json={"title": "Grace", "content_type": "study_note"},
    )
    item_id = item.json()["id"]
    client.post(
        f"/api/v1/projects/{project_id}/items/{item_id}/versions",
        headers=headers,
        json={"body": "God so loved the world."},
    )
    client.post(
        f"/api/v1/projects/{project_id}/items/{item_id}/versions",
        headers=headers,
        json={"body": "God so loved the entire world."},
    )
    return project_id, item_id


def test_diff_shows_known_edit(client, token) -> None:
    headers = auth_header(token)
    project_id, item_id = _create_item_with_versions(client, token)

    response = client.get(
        f"/api/v1/projects/{project_id}/items/{item_id}/versions/diff",
        params={"from_version": 2, "to_version": 3},
        headers=headers,
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["from_version"] == 2
    assert payload["to_version"] == 3

    inserts = [s for s in payload["word_diff"] if s["op"] == "insert"]
    deletes = [s for s in payload["word_diff"] if s["op"] == "delete"]
    equals = [s for s in payload["word_diff"] if s["op"] == "equal"]
    assert any(s["text"] == "entire" for s in inserts)
    assert not deletes
    assert any(s["text"] == "God so loved the" for s in equals)
    assert len(payload["line_diff"]) > 0

    reverse = client.get(
        f"/api/v1/projects/{project_id}/items/{item_id}/versions/diff",
        params={"from_version": 3, "to_version": 2},
        headers=headers,
    )
    reverse_deletes = [s for s in reverse.json()["word_diff"] if s["op"] == "delete"]
    assert any(s["text"] == "entire" for s in reverse_deletes)


def test_diff_missing_version_returns_404(client, token) -> None:
    headers = auth_header(token)
    project_id, item_id = _create_item_with_versions(client, token)

    response = client.get(
        f"/api/v1/projects/{project_id}/items/{item_id}/versions/diff",
        params={"from_version": 2, "to_version": 99},
        headers=headers,
    )
    assert response.status_code == 404
