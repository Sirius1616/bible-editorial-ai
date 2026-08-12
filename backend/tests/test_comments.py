from tests.conftest import auth_header


def _create_item(client, token: str) -> tuple[int, int]:
    headers = auth_header(token)
    project = client.post(
        "/api/v1/projects",
        headers=headers,
        json={"name": "Comment Project", "translation": "ESV"},
    )
    project_id = project.json()["id"]
    item = client.post(
        f"/api/v1/projects/{project_id}/items",
        headers=headers,
        json={"title": "Grace", "content_type": "study_note"},
    )
    return project_id, item.json()["id"]


def test_comment_anchors_and_threads(client, token) -> None:
    headers = auth_header(token)
    project_id, item_id = _create_item(client, token)

    anchored = client.post(
        f"/api/v1/projects/{project_id}/items/{item_id}/comments",
        headers=headers,
        json={
            "body": "Check the Greek here.",
            "anchor_type": "text",
            "anchor_start": "0",
            "anchor_end": "5",
            "anchor_text": "Grace",
        },
    )
    assert anchored.status_code == 201
    comment = anchored.json()
    assert comment["anchor_type"] == "text"
    assert comment["anchor_start"] == "0"
    assert comment["anchor_text"] == "Grace"
    assert comment["resolved"] is False
    assert comment["parent_id"] is None

    verse_comment = client.post(
        f"/api/v1/projects/{project_id}/items/{item_id}/comments",
        headers=headers,
        json={
            "body": "Verify against the NIV.",
            "anchor_type": "verse",
            "anchor_start": "John 1:14",
        },
    ).json()

    reply = client.post(
        f"/api/v1/projects/{project_id}/items/{item_id}/comments",
        headers=headers,
        json={"body": "Done — matches NIV.", "parent_id": comment["id"]},
    )
    assert reply.status_code == 201
    assert reply.json()["parent_id"] == comment["id"]

    invalid_reply = client.post(
        f"/api/v1/projects/{project_id}/items/{item_id}/comments",
        headers=headers,
        json={"body": "nested too deep", "parent_id": reply.json()["id"]},
    )
    assert invalid_reply.status_code == 400

    resolved = client.patch(
        f"/api/v1/projects/{project_id}/items/{item_id}/comments/{comment['id']}",
        headers=headers,
        json={"resolved": True},
    )
    assert resolved.json()["resolved"] is True

    comments = client.get(
        f"/api/v1/projects/{project_id}/items/{item_id}/comments", headers=headers
    ).json()
    by_id = {c["id"]: c for c in comments}
    assert by_id[verse_comment["id"]]["anchor_type"] == "verse"
    assert by_id[reply.json()["id"]]["parent_id"] == comment["id"]
    assert by_id[comment["id"]]["resolved"] is True
    assert len(comments) == 3


def test_comment_requires_valid_parent(client, token) -> None:
    headers = auth_header(token)
    project_id, item_id = _create_item(client, token)

    response = client.post(
        f"/api/v1/projects/{project_id}/items/{item_id}/comments",
        headers=headers,
        json={"body": "orphan reply", "parent_id": 999},
    )
    assert response.status_code == 404
