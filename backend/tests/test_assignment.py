from tests.conftest import auth_header


def _register(client, email: str, full_name: str, password: str = "test-password-1") -> str:
    client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "full_name": full_name},
    )
    login = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return login.json()["access_token"]


def _create_project(client, token: str) -> int:
    response = client.post(
        "/api/v1/projects",
        headers=auth_header(token),
        json={"name": "Assign Project", "description": "d", "translation": "ESV"},
    )
    assert response.status_code == 201
    return response.json()["id"]


def _create_item(client, token: str, project_id: int) -> int:
    response = client.post(
        f"/api/v1/projects/{project_id}/items",
        headers=auth_header(token),
        json={"title": "Grace", "content_type": "study_note"},
    )
    assert response.status_code == 201
    return response.json()["id"]


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


def test_create_item_with_assignee(client, token) -> None:
    project_id = _create_project(client, token)
    member_token = _register(client, "assignee@test.ai", "Assignee User")
    member_me = client.get("/api/v1/auth/me", headers=auth_header(member_token)).json()
    _add_workspace_member(client, token, member_token, "assignee@test.ai")
    _add_project_member(client, token, project_id, member_me["id"])

    response = client.post(
        f"/api/v1/projects/{project_id}/items",
        headers=auth_header(token),
        json={"title": "Grace", "content_type": "study_note", "assignee_id": member_me["id"]},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["assignee_id"] == member_me["id"]
    assert data["assignee_name"] == "Assignee User"


def test_update_item_assignee(client, token) -> None:
    project_id = _create_project(client, token)
    member_token = _register(client, "worker@test.ai", "Worker User")
    member_me = client.get("/api/v1/auth/me", headers=auth_header(member_token)).json()
    _add_workspace_member(client, token, member_token, "worker@test.ai")
    _add_project_member(client, token, project_id, member_me["id"])

    item_id = _create_item(client, token, project_id)

    response = client.patch(
        f"/api/v1/projects/{project_id}/items/{item_id}",
        headers=auth_header(token),
        json={"assignee_id": member_me["id"]},
    )
    assert response.status_code == 200
    assert response.json()["assignee_id"] == member_me["id"]
    assert response.json()["assignee_name"] == "Worker User"


def test_assign_to_non_member_rejected(client, token) -> None:
    project_id = _create_project(client, token)
    outsider_token = _register(client, "outsider@test.ai", "Outsider")
    outsider_me = client.get("/api/v1/auth/me", headers=auth_header(outsider_token)).json()

    item_id = _create_item(client, token, project_id)

    response = client.patch(
        f"/api/v1/projects/{project_id}/items/{item_id}",
        headers=auth_header(token),
        json={"assignee_id": outsider_me["id"]},
    )
    assert response.status_code == 400


def test_unassign_item(client, token) -> None:
    project_id = _create_project(client, token)
    member_token = _register(client, "temp@test.ai", "Temp User")
    member_me = client.get("/api/v1/auth/me", headers=auth_header(member_token)).json()
    _add_workspace_member(client, token, member_token, "temp@test.ai")
    _add_project_member(client, token, project_id, member_me["id"])

    item_id = _create_item(client, token, project_id)

    client.patch(
        f"/api/v1/projects/{project_id}/items/{item_id}",
        headers=auth_header(token),
        json={"assignee_id": member_me["id"]},
    )

    response = client.patch(
        f"/api/v1/projects/{project_id}/items/{item_id}",
        headers=auth_header(token),
        json={"assignee_id": None},
    )
    assert response.status_code == 200
    assert response.json()["assignee_id"] is None
    assert response.json()["assignee_name"] is None


def test_list_items_shows_assignee(client, token) -> None:
    project_id = _create_project(client, token)
    member_token = _register(client, "shown@test.ai", "Shown User")
    member_me = client.get("/api/v1/auth/me", headers=auth_header(member_token)).json()
    _add_workspace_member(client, token, member_token, "shown@test.ai")
    _add_project_member(client, token, project_id, member_me["id"])

    item_id = _create_item(client, token, project_id)
    client.patch(
        f"/api/v1/projects/{project_id}/items/{item_id}",
        headers=auth_header(token),
        json={"assignee_id": member_me["id"]},
    )

    response = client.get(
        f"/api/v1/projects/{project_id}/items",
        headers=auth_header(token),
    )
    assert response.status_code == 200
    items = response.json()
    assigned = [i for i in items if i["id"] == item_id]
    assert len(assigned) == 1
    assert assigned[0]["assignee_id"] == member_me["id"]
    assert assigned[0]["assignee_name"] == "Shown User"
