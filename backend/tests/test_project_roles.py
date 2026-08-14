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
        json={"name": "Roles Project", "description": "d", "translation": "ESV"},
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


def _add_project_member(client, token: str, project_id: int, user_id: int, role: str) -> None:
    response = client.post(
        f"/api/v1/projects/{project_id}/members",
        headers=auth_header(token),
        json={"user_id": user_id, "role": role},
    )
    assert response.status_code == 201


def test_project_creator_is_admin_member(client, token) -> None:
    headers = auth_header(token)
    project_id = _create_project(client, token)

    project = client.get(f"/api/v1/projects/{project_id}", headers=headers).json()
    assert project["my_role"] == "admin"
    assert project["member_count"] == 1

    members = client.get(f"/api/v1/projects/{project_id}/members", headers=headers).json()
    assert len(members) == 1
    assert members[0]["role"] == "admin"


def test_add_member_and_role_permissions(client, token) -> None:
    headers = auth_header(token)
    project_id = _create_project(client, token)

    reviewer_token = _register(client, "reviewer@test.ai", "Reviewer User")
    reviewer_id = _get_user_id(client, reviewer_token)
    _add_workspace_member(client, token, reviewer_token, "reviewer@test.ai")
    _add_project_member(client, token, project_id, reviewer_id, "reviewer")

    reviewer_headers = auth_header(reviewer_token)

    item = client.post(
        f"/api/v1/projects/{project_id}/items",
        headers=headers,
        json={"title": "Grace Alone", "passage": "Ephesians 2:8", "content_type": "study_note"},
    )
    assert item.status_code == 201
    item_id = item.json()["id"]

    assert (
        client.post(
            f"/api/v1/projects/{project_id}/items",
            headers=reviewer_headers,
            json={"title": "Blocked", "content_type": "study_note"},
        ).status_code
        == 403
    )
    assert (
        client.post(
            f"/api/v1/projects/{project_id}/items/{item_id}/versions",
            headers=reviewer_headers,
            json={"body": "nope"},
        ).status_code
        == 403
    )
    assert (
        client.get(
            f"/api/v1/projects/{project_id}/items/{item_id}/export", headers=reviewer_headers
        ).status_code
        == 403
    )
    comment = client.post(
        f"/api/v1/projects/{project_id}/items/{item_id}/comments",
        headers=reviewer_headers,
        json={"body": "Looks good"},
    )
    assert comment.status_code == 201

    transition = client.post(
        f"/api/v1/projects/{project_id}/items/{item_id}/transition",
        headers=reviewer_headers,
        json={"status": "in_progress"},
    )
    assert transition.status_code == 200
    review = client.post(
        f"/api/v1/projects/{project_id}/items/{item_id}/review",
        headers=reviewer_headers,
        json={"action": "approve"},
    )
    assert review.status_code == 200
    assert review.json()["status"] == "ready"


def test_editor_cannot_review_or_manage_roles(client, token) -> None:
    headers = auth_header(token)
    project_id = _create_project(client, token)

    editor_token = _register(client, "editor2@test.ai", "Editor Two")
    editor_id = _get_user_id(client, editor_token)
    _add_workspace_member(client, token, editor_token, "editor2@test.ai")

    item = client.post(
        f"/api/v1/projects/{project_id}/items",
        headers=headers,
        json={"title": "Faith", "passage": "Hebrews 11:1", "content_type": "devotional"},
    )
    item_id = item.json()["id"]

    editor_headers = auth_header(editor_token)

    created = client.post(
        f"/api/v1/projects/{project_id}/items",
        headers=editor_headers,
        json={"title": "By Works", "content_type": "study_note"},
    )
    assert created.status_code == 201

    assert (
        client.post(
            f"/api/v1/projects/{project_id}/items/{item_id}/transition",
            headers=editor_headers,
            json={"status": "in_review"},
        ).status_code
        == 403
    )
    assert (
        client.post(
            f"/api/v1/projects/{project_id}/items/{item_id}/review",
            headers=editor_headers,
            json={"action": "approve"},
        ).status_code
        == 403
    )
    assert (
        client.post(
            f"/api/v1/projects/{project_id}/members",
            headers=editor_headers,
            json={"user_id": editor_id, "role": "editor"},
        ).status_code
        == 403
    )


def test_workspace_member_without_project_role_falls_back_to_editor(client, token) -> None:
    headers = auth_header(token)
    project_id = _create_project(client, token)

    member_token = _register(client, "fallback@test.ai", "Fallback Member")
    _add_workspace_member(client, token, member_token, "fallback@test.ai")

    member_headers = auth_header(member_token)
    project = client.get(f"/api/v1/projects/{project_id}", headers=member_headers).json()
    assert project["my_role"] == "editor"

    created = client.post(
        f"/api/v1/projects/{project_id}/items",
        headers=member_headers,
        json={"title": "No Rules", "passage": "1 John 4:19", "content_type": "study_note"},
    )
    assert created.status_code == 201
    item_id = created.json()["id"]
    assert (
        client.post(
            f"/api/v1/projects/{project_id}/items/{item_id}/transition",
            headers=member_headers,
            json={"status": "in_progress"},
        ).status_code
        == 403
    )


def test_viewer_is_read_only(client, token) -> None:
    headers = auth_header(token)
    project_id = _create_project(client, token)

    viewer_token = _register(client, "viewer@test.ai", "Viewer User")
    viewer_id = _get_user_id(client, viewer_token)
    _add_workspace_member(client, token, viewer_token, "viewer@test.ai")
    _add_project_member(client, token, project_id, viewer_id, "viewer")

    viewer_headers = auth_header(viewer_token)
    project = client.get(f"/api/v1/projects/{project_id}", headers=viewer_headers)
    assert project.status_code == 200
    assert project.json()["my_role"] == "viewer"

    item = client.post(
        f"/api/v1/projects/{project_id}/items",
        headers=headers,
        json={"title": "View Only", "passage": "Psalm 23:1", "content_type": "devotional"},
    )
    item_id = item.json()["id"]
    assert (
        client.get(f"/api/v1/projects/{project_id}/items", headers=viewer_headers).status_code
        == 200
    )
    assert (
        client.post(
            f"/api/v1/projects/{project_id}/items",
            headers=viewer_headers,
            json={"title": "Denied", "content_type": "study_note"},
        ).status_code
        == 403
    )
    assert (
        client.post(
            f"/api/v1/projects/{project_id}/items/{item_id}/comments",
            headers=viewer_headers,
            json={"body": "hi"},
        ).status_code
        == 403
    )
    assert (
        client.post(
            f"/api/v1/projects/{project_id}/items/{item_id}/transition",
            headers=viewer_headers,
            json={"status": "in_progress"},
        ).status_code
        == 403
    )
    assert (
        client.patch(
            f"/api/v1/projects/{project_id}",
            headers=viewer_headers,
            json={"description": "nope"},
        ).status_code
        == 403
    )


def test_admin_can_manage_roles_and_guard_last_admin(client, token) -> None:
    headers = auth_header(token)
    project_id = _create_project(client, token)

    user_token = _register(client, "rolemgmt@test.ai", "Role Mgmt")
    user_id = _get_user_id(client, user_token)
    _add_workspace_member(client, token, user_token, "rolemgmt@test.ai")
    _add_project_member(client, token, project_id, user_id, "editor")

    updated = client.patch(
        f"/api/v1/projects/{project_id}/members/{user_id}",
        headers=headers,
        json={"role": "reviewer"},
    )
    assert updated.status_code == 200
    assert updated.json()["role"] == "reviewer"

    members = client.get(f"/api/v1/projects/{project_id}/members", headers=headers).json()
    assert {m["user_id"]: m["role"] for m in members}[user_id] == "reviewer"

    assert (
        client.patch(
            f"/api/v1/projects/{project_id}/members/{user_id}",
            headers=headers,
            json={"role": "viewer"},
        ).status_code
        == 200
    )

    removed = client.delete(
        f"/api/v1/projects/{project_id}/members/{user_id}", headers=headers
    )
    assert removed.status_code == 204
    members = client.get(f"/api/v1/projects/{project_id}/members", headers=headers).json()
    assert len(members) == 1

    me = client.get("/api/v1/auth/me", headers=headers).json()
    demote = client.patch(
        f"/api/v1/projects/{project_id}/members/{me['id']}",
        headers=headers,
        json={"role": "editor"},
    )
    assert demote.status_code == 400
    remove_self = client.delete(
        f"/api/v1/projects/{project_id}/members/{me['id']}", headers=headers
    )
    assert remove_self.status_code == 400


def test_cannot_add_user_outside_workspace(client, token) -> None:
    headers = auth_header(token)
    project_id = _create_project(client, token)

    outsider_token = _register(client, "outsider@test.ai", "Outsider")
    outsider_id = _get_user_id(client, outsider_token)

    response = client.post(
        f"/api/v1/projects/{project_id}/members",
        headers=headers,
        json={"user_id": outsider_id, "role": "viewer"},
    )
    assert response.status_code == 400


def _get_user_id(client, token: str) -> int:
    return client.get("/api/v1/auth/me", headers=auth_header(token)).json()["id"]
