"""Tests for the notifications API."""

from fastapi.testclient import TestClient

from app.models import Notification
from tests.conftest import TestingSessionLocal, auth_header


def _register(client: TestClient, email: str, name: str) -> str:
    payload = {"email": email, "password": "password123", "full_name": name}
    client.post("/api/v1/auth/register", json=payload)
    response = client.post("/api/v1/auth/login", json=payload)
    return response.json()["access_token"]


def test_list_notifications_empty(client: TestClient) -> None:
    token = _register(client, "user1@test.ai", "User One")
    response = client.get("/api/v1/notifications", headers=auth_header(token))
    assert response.status_code == 200
    assert response.json() == []


def test_unread_count_empty(client: TestClient) -> None:
    token = _register(client, "user1@test.ai", "User One")
    response = client.get("/api/v1/notifications/unread-count", headers=auth_header(token))
    assert response.status_code == 200
    assert response.json()["count"] == 0


def test_notification_lifecycle(client: TestClient) -> None:
    token = _register(client, "user1@test.ai", "User One")
    me = client.get("/api/v1/auth/me", headers=auth_header(token)).json()

    db = TestingSessionLocal()
    notif = Notification(
        user_id=me["id"],
        project_id=1,
        content_item_id=10,
        type="assignment",
        message="You were assigned to Faith and Works",
        read=False,
    )
    db.add(notif)
    db.commit()

    # List shows it
    response = client.get("/api/v1/notifications", headers=auth_header(token))
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["type"] == "assignment"
    assert data[0]["read"] is False

    # Unread count is 1
    response = client.get("/api/v1/notifications/unread-count", headers=auth_header(token))
    assert response.json()["count"] == 1

    # Mark as read
    response = client.post(f"/api/v1/notifications/{notif.id}/read", headers=auth_header(token))
    assert response.json()["ok"] is True

    # Unread count is now 0
    response = client.get("/api/v1/notifications/unread-count", headers=auth_header(token))
    assert response.json()["count"] == 0

    db.close()


def test_mark_all_read(client: TestClient) -> None:
    token = _register(client, "user1@test.ai", "User One")
    me = client.get("/api/v1/auth/me", headers=auth_header(token)).json()

    db = TestingSessionLocal()
    for i in range(3):
        db.add(Notification(
            user_id=me["id"], type="comment", message=f"Comment {i}", read=False,
        ))
    db.commit()

    response = client.get("/api/v1/notifications/unread-count", headers=auth_header(token))
    assert response.json()["count"] == 3

    response = client.post("/api/v1/notifications/read-all", headers=auth_header(token))
    assert response.json()["ok"] is True

    response = client.get("/api/v1/notifications/unread-count", headers=auth_header(token))
    assert response.json()["count"] == 0

    db.close()


def test_notifications_are_per_user(client: TestClient) -> None:
    token1 = _register(client, "user1@test.ai", "User One")
    token2 = _register(client, "user2@test.ai", "User Two")
    me1 = client.get("/api/v1/auth/me", headers=auth_header(token1)).json()
    me2 = client.get("/api/v1/auth/me", headers=auth_header(token2)).json()

    db = TestingSessionLocal()
    db.add(Notification(user_id=me1["id"], type="assignment", message="For user 1", read=False))
    db.add(Notification(user_id=me2["id"], type="assignment", message="For user 2", read=False))
    db.commit()

    # User 1 sees only their notification
    response = client.get("/api/v1/notifications", headers=auth_header(token1))
    assert len(response.json()) == 1
    assert response.json()[0]["message"] == "For user 1"

    # User 2 sees only their notification
    response = client.get("/api/v1/notifications", headers=auth_header(token2))
    assert len(response.json()) == 1
    assert response.json()[0]["message"] == "For user 2"

    db.close()


def _add_workspace_member(client, admin_token: str, member_token: str, email: str) -> int:
    workspaces = client.get("/api/v1/workspaces", headers=auth_header(admin_token)).json()
    workspace_id = next(w["id"] for w in workspaces if w["my_role"] == "owner")
    invite = client.post(
        f"/api/v1/workspaces/{workspace_id}/invites",
        headers=auth_header(admin_token),
        json={"email": email, "role": "member"},
    )
    assert invite.status_code == 201
    accepted = client.post(
        "/api/v1/invites/accept",
        headers=auth_header(member_token),
        json={"token": invite.json()["token"]},
    )
    assert accepted.status_code == 200
    return workspace_id


def _add_project_member(client, token: str, project_id: int, user_id: int, role: str = "editor") -> None:
    response = client.post(
        f"/api/v1/projects/{project_id}/members",
        headers=auth_header(token),
        json={"user_id": user_id, "role": role},
    )
    assert response.status_code == 201


def test_assignment_creates_notification(client: TestClient) -> None:
    token = _register(client, "admin@test.ai", "Admin User")
    assignee_token = _register(client, "assignee@test.ai", "Assignee User")
    assignee_me = client.get("/api/v1/auth/me", headers=auth_header(assignee_token)).json()
    _add_workspace_member(client, token, assignee_token, "assignee@test.ai")

    workspaces = client.get("/api/v1/workspaces", headers=auth_header(token)).json()
    ws_id = next(w["id"] for w in workspaces if w["my_role"] == "owner")
    project = client.post(
        "/api/v1/projects", json={"name": "Test", "workspace_id": ws_id}, headers=auth_header(token)
    ).json()
    project_id = project["id"]

    _add_project_member(client, token, project_id, assignee_me["id"])

    item_resp = client.post(
        f"/api/v1/projects/{project_id}/items",
        json={"title": "Faith and Works", "content_type": "study_note", "assignee_id": assignee_me["id"]},
        headers=auth_header(token),
    )
    assert item_resp.status_code == 201, item_resp.text
    item = item_resp.json()
    assert item["assignee_id"] == assignee_me["id"]

    response = client.get("/api/v1/notifications", headers=auth_header(assignee_token))
    notifs = response.json()
    assert len(notifs) == 1
    assert notifs[0]["type"] == "assignment"
    assert "Faith and Works" in notifs[0]["message"]
    assert notifs[0]["read"] is False

    response = client.get("/api/v1/notifications", headers=auth_header(token))
    assert response.json() == []


def test_transition_creates_notification(client: TestClient) -> None:
    token = _register(client, "admin@test.ai", "Admin User")
    assignee_token = _register(client, "worker@test.ai", "Worker User")
    assignee_me = client.get("/api/v1/auth/me", headers=auth_header(assignee_token)).json()
    _add_workspace_member(client, token, assignee_token, "worker@test.ai")

    workspaces = client.get("/api/v1/workspaces", headers=auth_header(token)).json()
    ws_id = next(w["id"] for w in workspaces if w["my_role"] == "owner")
    project = client.post(
        "/api/v1/projects", json={"name": "Test", "workspace_id": ws_id}, headers=auth_header(token)
    ).json()
    project_id = project["id"]

    _add_project_member(client, token, project_id, assignee_me["id"])

    item_resp = client.post(
        f"/api/v1/projects/{project_id}/items",
        json={"title": "Psalm 23", "content_type": "study_note", "assignee_id": assignee_me["id"]},
        headers=auth_header(token),
    )
    assert item_resp.status_code == 201, item_resp.text
    item = item_resp.json()

    client.post("/api/v1/notifications/read-all", headers=auth_header(assignee_token))

    client.post(
        f"/api/v1/projects/{project_id}/items/{item['id']}/transition",
        json={"status": "in_progress"},
        headers=auth_header(token),
    )

    response = client.get("/api/v1/notifications", headers=auth_header(assignee_token))
    notifs = response.json()
    status_notifs = [n for n in notifs if n["type"] == "status_change"]
    assert len(status_notifs) == 1
    assert "in_progress" in status_notifs[0]["message"]
