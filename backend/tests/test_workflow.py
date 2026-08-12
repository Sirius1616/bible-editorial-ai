from tests.conftest import auth_header


def _project_with_item(client, token: str, content_type: str = "study_note") -> tuple[int, int]:
    response = client.post(
        "/api/v1/projects",
        headers=auth_header(token),
        json={"name": "Workflow Project", "description": "d", "translation": "ESV"},
    )
    project_id = response.json()["id"]
    item_response = client.post(
        f"/api/v1/projects/{project_id}/items",
        headers=auth_header(token),
        json={"title": "Grace", "passage": "Ephesians 2:8", "content_type": content_type},
    )
    return project_id, item_response.json()["id"]


def _transition(client, token: str, project_id: int, item_id: int, status: str, note: str | None = None):
    return client.post(
        f"/api/v1/projects/{project_id}/items/{item_id}/transition",
        headers=auth_header(token),
        json={"status": status, "note": note},
    )


def test_full_lifecycle_transitions(client, token) -> None:
    headers = auth_header(token)
    project_id, item_id = _project_with_item(client, token)

    assert _transition(client, token, project_id, item_id, "in_progress").json()["status"] == "in_progress"
    assert _transition(client, token, project_id, item_id, "in_review").json()["status"] == "in_review"
    assert _transition(client, token, project_id, item_id, "qa").json()["status"] == "qa"
    assert _transition(client, token, project_id, item_id, "ready").json()["status"] == "ready"

    history = client.get(
        f"/api/v1/projects/{project_id}/items/{item_id}/history", headers=headers
    ).json()
    assert [h["to_status"] for h in history] == [
        "in_progress",
        "in_review",
        "qa",
        "ready",
    ]


def test_invalid_transition_rejected(client, token) -> None:
    project_id, item_id = _project_with_item(client, token)

    response = _transition(client, token, project_id, item_id, "ready")
    assert response.status_code == 400
    assert "Cannot move" in response.json()["detail"]


def test_review_reject_archives_with_history(client, token) -> None:
    headers = auth_header(token)
    project_id, item_id = _project_with_item(client, token)

    response = client.post(
        f"/api/v1/projects/{project_id}/items/{item_id}/review",
        headers=headers,
        json={"action": "reject"},
    )
    assert response.json()["status"] == "archived"

    history = client.get(
        f"/api/v1/projects/{project_id}/items/{item_id}/history", headers=headers
    ).json()
    assert history[-1]["from_status"] == "assigned"
    assert history[-1]["to_status"] == "archived"
    assert history[-1]["note"] == "rejected"


def test_transition_records_note(client, token) -> None:
    headers = auth_header(token)
    project_id, item_id = _project_with_item(client, token)

    _transition(client, token, project_id, item_id, "in_progress", note="Starting this week")

    history = client.get(
        f"/api/v1/projects/{project_id}/items/{item_id}/history", headers=headers
    ).json()
    assert history[0]["note"] == "Starting this week"


def test_due_date_create_and_update(client, token) -> None:
    headers = auth_header(token)
    response = client.post(
        "/api/v1/projects",
        headers=headers,
        json={"name": "Due Project", "description": "d", "translation": "ESV"},
    )
    project_id = response.json()["id"]
    item_response = client.post(
        f"/api/v1/projects/{project_id}/items",
        headers=headers,
        json={
            "title": "Due Item",
            "passage": "Psalm 1:1",
            "content_type": "devotional",
            "due_date": "2026-09-01T09:00:00Z",
        },
    )
    assert item_response.status_code == 201
    assert item_response.json()["due_date"] == "2026-09-01T09:00:00"
    item_id = item_response.json()["id"]

    updated = client.patch(
        f"/api/v1/projects/{project_id}/items/{item_id}",
        headers=headers,
        json={"due_date": None},
    )
    assert updated.json()["due_date"] is None
