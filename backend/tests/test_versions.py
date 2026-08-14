from tests.conftest import auth_header


def _create_item_with_versions(client, token: str) -> tuple[int, int]:
    headers = auth_header(token)
    project = client.post(
        "/api/v1/projects",
        headers=headers,
        json={"name": "Versions Project", "translation": "ESV"},
    )
    project_id = project.json()["id"]
    item = client.post(
        f"/api/v1/projects/{project_id}/items",
        headers=headers,
        json={"title": "Grace", "content_type": "study_note"},
    )
    item_id = item.json()["id"]
    version = client.post(
        f"/api/v1/projects/{project_id}/items/{item_id}/versions",
        headers=headers,
        json={"body": "God so loved the world.", "change_note": "draft one"},
    )
    return project_id, item_id, version.json()["id"]


def test_delete_version_removes_it(client, token) -> None:
    headers = auth_header(token)
    project_id, item_id, version_id = _create_item_with_versions(client, token)

    response = client.delete(
        f"/api/v1/projects/{project_id}/items/{item_id}/versions/{version_id}",
        headers=headers,
    )
    assert response.status_code == 204

    versions = client.get(
        f"/api/v1/projects/{project_id}/items/{item_id}/versions",
        headers=headers,
    ).json()
    assert [v["version_number"] for v in versions] == [1]


def test_delete_missing_version_returns_404(client, token) -> None:
    headers = auth_header(token)
    project_id, item_id, _ = _create_item_with_versions(client, token)

    response = client.delete(
        f"/api/v1/projects/{project_id}/items/{item_id}/versions/999",
        headers=headers,
    )
    assert response.status_code == 404


def test_delete_only_version_returns_400(client, token) -> None:
    headers = auth_header(token)
    project = client.post(
        "/api/v1/projects",
        headers=headers,
        json={"name": "Versions Project", "translation": "ESV"},
    )
    project_id = project.json()["id"]
    item = client.post(
        f"/api/v1/projects/{project_id}/items",
        headers=headers,
        json={"title": "Solo", "content_type": "study_note"},
    )
    item_id = item.json()["id"]
    version_id = client.get(
        f"/api/v1/projects/{project_id}/items/{item_id}/versions",
        headers=headers,
    ).json()[0]["id"]

    response = client.delete(
        f"/api/v1/projects/{project_id}/items/{item_id}/versions/{version_id}",
        headers=headers,
    )
    assert response.status_code == 400
