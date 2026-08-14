from tests.conftest import auth_header


def _register(client, email: str, name: str = "Someone", password: str = "test-password-1") -> dict:
    payload = {"email": email, "password": password, "full_name": name}
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    login = client.post("/api/v1/auth/login", json=payload)
    return auth_header(login.json()["access_token"])


def _create_project(client, headers: dict, workspace_id: int | None = None) -> int:
    body = {"name": "Test Project", "description": "d", "translation": "ESV"}
    if workspace_id is not None:
        body["workspace_id"] = workspace_id
    response = client.post("/api/v1/projects", json=body, headers=headers)
    assert response.status_code == 201
    return response.json()


def test_register_creates_personal_workspace(client, token) -> None:
    headers = auth_header(token)
    response = client.get("/api/v1/workspaces", headers=headers)
    assert response.status_code == 200
    workspaces = response.json()
    assert len(workspaces) == 1
    assert workspaces[0]["my_role"] == "owner"
    assert workspaces[0]["member_count"] == 1


def test_workspace_creation_and_delete(client, token) -> None:
    headers = auth_header(token)
    response = client.post("/api/v1/workspaces", json={"name": "Acme Press"}, headers=headers)
    assert response.status_code == 201
    workspace_id = response.json()["id"]
    assert response.json()["my_role"] == "owner"

    response = client.patch(
        f"/api/v1/workspaces/{workspace_id}", json={"name": "Acme Publishing"}, headers=headers
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Acme Publishing"

    project = _create_project(client, headers, workspace_id=workspace_id)
    response = client.delete(f"/api/v1/workspaces/{workspace_id}", headers=headers)
    assert response.status_code == 400
    assert "projects" in response.json()["detail"]

    response = client.delete(f"/api/v1/projects/{project['id']}", headers=headers)
    assert response.status_code == 204
    response = client.delete(f"/api/v1/workspaces/{workspace_id}", headers=headers)
    assert response.status_code == 204
    assert client.get(f"/api/v1/workspaces/{workspace_id}", headers=headers).status_code == 404


def test_two_users_cannot_see_each_others_data(client, token) -> None:
    headers_a = auth_header(token)
    headers_b = _register(client, "other@test.ai", "Other User")

    project = _create_project(client, headers_a)

    listed = client.get("/api/v1/projects", headers=headers_b).json()
    assert listed == []
    assert client.get(f"/api/v1/projects/{project['id']}", headers=headers_b).status_code == 404
    assert client.get(f"/api/v1/workspaces/{project['workspace_id']}", headers=headers_b).status_code == 404

    item = client.post(
        f"/api/v1/projects/{project['id']}/items",
        headers=headers_a,
        json={"title": "Study Note", "passage": "John 3:16", "content_type": "study_note"},
    ).json()
    assert client.get(
        f"/api/v1/projects/{project['id']}/items/{item['id']}", headers=headers_b
    ).status_code == 404


def test_invite_and_accept_flow(client, token) -> None:
    headers_a = auth_header(token)
    headers_b = _register(client, "invitee@test.ai", "Invitee")

    workspaces = client.get("/api/v1/workspaces", headers=headers_a).json()
    workspace_id = workspaces[0]["id"]

    response = client.post(
        f"/api/v1/workspaces/{workspace_id}/invites",
        json={"email": "invitee@test.ai", "role": "member"},
        headers=headers_a,
    )
    assert response.status_code == 201
    invite = response.json()
    assert invite["join_url"] == f"/invite/{invite['token']}"

    response = client.post(
        "/api/v1/invites/accept",
        json={"token": invite["token"]},
        headers=headers_b,
    )
    assert response.status_code == 200
    assert response.json()["member_count"] == 2

    detail = client.get(f"/api/v1/workspaces/{workspace_id}", headers=headers_b).json()
    assert detail["my_role"] == "member"
    emails = {m["email"] for m in detail["members"]}
    assert emails == {"editor@test.ai", "invitee@test.ai"}


def test_invite_accept_requires_matching_email(client, token) -> None:
    headers_a = auth_header(token)
    headers_b = _register(client, "wrong@test.ai", "Wrong")

    workspace_id = client.get("/api/v1/workspaces", headers=headers_a).json()[0]["id"]
    invite = client.post(
        f"/api/v1/workspaces/{workspace_id}/invites",
        json={"email": "intended@test.ai", "role": "viewer"},
        headers=headers_a,
    ).json()

    response = client.post(
        "/api/v1/invites/accept", json={"token": invite["token"]}, headers=headers_b
    )
    assert response.status_code == 400
    assert "different email" in response.json()["detail"]


def test_invite_role_is_applied_and_viewer_is_read_only(client, token) -> None:
    headers_a = auth_header(token)
    headers_b = _register(client, "viewer@test.ai", "Viewer")

    workspace_id = client.get("/api/v1/workspaces", headers=headers_a).json()[0]["id"]
    project = _create_project(client, headers_a, workspace_id=workspace_id)

    invite = client.post(
        f"/api/v1/workspaces/{workspace_id}/invites",
        json={"email": "viewer@test.ai", "role": "viewer"},
        headers=headers_a,
    ).json()
    client.post("/api/v1/invites/accept", json={"token": invite["token"]}, headers=headers_b)

    assert client.get(f"/api/v1/projects/{project['id']}", headers=headers_b).status_code == 200
    response = client.post(
        "/api/v1/projects",
        json={"name": "Blocked", "workspace_id": workspace_id},
        headers=headers_b,
    )
    assert response.status_code == 403
    response = client.post(
        f"/api/v1/projects/{project['id']}/items",
        json={"title": "Blocked item", "content_type": "study_note"},
        headers=headers_b,
    )
    assert response.status_code == 403


def test_register_with_invite_token(client) -> None:
    headers_a = _register(client, "owner@test.ai", "Owner")
    workspace_id = client.get("/api/v1/workspaces", headers=headers_a).json()[0]["id"]
    invite = client.post(
        f"/api/v1/workspaces/{workspace_id}/invites",
        json={"email": "newb@test.ai", "role": "admin"},
        headers=headers_a,
    ).json()

    info = client.get(f"/api/v1/invites/{invite['token']}")
    assert info.status_code == 200
    assert info.json()["email"] == "newb@test.ai"
    assert info.json()["workspace_name"] == "Owner's Workspace"

    response = client.post(
        f"/api/v1/invites/{invite['token']}/register",
        json={"email": "newb@test.ai", "password": "newb-password-1", "full_name": "New Bee"},
    )
    assert response.status_code == 201
    headers_b = auth_header(response.json()["access_token"])
    detail = client.get(f"/api/v1/workspaces/{workspace_id}", headers=headers_b).json()
    assert detail["my_role"] == "admin"


def test_duplicate_invite_rejected_and_revoked(client, token) -> None:
    headers_a = auth_header(token)
    workspace_id = client.get("/api/v1/workspaces", headers=headers_a).json()[0]["id"]

    invite = client.post(
        f"/api/v1/workspaces/{workspace_id}/invites",
        json={"email": "dup@test.ai", "role": "member"},
        headers=headers_a,
    ).json()
    duplicate = client.post(
        f"/api/v1/workspaces/{workspace_id}/invites",
        json={"email": "dup@test.ai", "role": "member"},
        headers=headers_a,
    )
    assert duplicate.status_code == 409

    response = client.delete(
        f"/api/v1/workspaces/{workspace_id}/invites/{invite['token']}", headers=headers_a
    )
    assert response.status_code == 204
    assert client.get(f"/api/v1/invites/{invite['token']}").status_code == 404


def test_role_change_and_remove_member(client, token) -> None:
    headers_a = auth_header(token)
    headers_b = _register(client, "rolechange@test.ai", "Role Change")
    workspace_id = client.get("/api/v1/workspaces", headers=headers_a).json()[0]["id"]

    invite = client.post(
        f"/api/v1/workspaces/{workspace_id}/invites",
        json={"email": "rolechange@test.ai", "role": "member"},
        headers=headers_a,
    ).json()
    client.post("/api/v1/invites/accept", json={"token": invite["token"]}, headers=headers_b)

    member_id = client.get(
        f"/api/v1/workspaces/{workspace_id}/members", headers=headers_a
    ).json()[1]["user_id"]
    response = client.patch(
        f"/api/v1/workspaces/{workspace_id}/members/{member_id}",
        json={"role": "admin"},
        headers=headers_a,
    )
    assert response.status_code == 200
    assert response.json()["role"] == "admin"

    # admin can invite
    response = client.post(
        f"/api/v1/workspaces/{workspace_id}/invites",
        json={"email": "extra@test.ai", "role": "member"},
        headers=headers_b,
    )
    assert response.status_code == 201

    # owner removes the member -> they lose access
    response = client.delete(
        f"/api/v1/workspaces/{workspace_id}/members/{member_id}", headers=headers_a
    )
    assert response.status_code == 204
    assert client.get(f"/api/v1/workspaces/{workspace_id}", headers=headers_b).status_code == 404


def test_ownership_transfer(client, token) -> None:
    headers_a = auth_header(token)
    headers_b = _register(client, "heir@test.ai", "Heir")
    workspace_id = client.get("/api/v1/workspaces", headers=headers_a).json()[0]["id"]

    invite = client.post(
        f"/api/v1/workspaces/{workspace_id}/invites",
        json={"email": "heir@test.ai", "role": "member"},
        headers=headers_a,
    ).json()
    client.post("/api/v1/invites/accept", json={"token": invite["token"]}, headers=headers_b)
    heir_id = client.get(
        f"/api/v1/workspaces/{workspace_id}/members", headers=headers_a
    ).json()[1]["user_id"]

    response = client.post(
        f"/api/v1/workspaces/{workspace_id}/transfer",
        json={"user_id": heir_id},
        headers=headers_a,
    )
    assert response.status_code == 200
    assert response.json()["owner_id"] == heir_id

    # former owner kept access as admin, but can no longer transfer
    detail = client.get(f"/api/v1/workspaces/{workspace_id}", headers=headers_a).json()
    assert {m["role"] for m in detail["members"] if m["user_id"] != heir_id} == {"admin"}
    response = client.post(
        f"/api/v1/workspaces/{workspace_id}/transfer",
        json={"user_id": heir_id},
        headers=headers_a,
    )
    assert response.status_code == 403

    # new owner can manage
    owner_me = client.get(
        f"/api/v1/workspaces/{workspace_id}/members", headers=headers_b
    ).json()
    assert next(m for m in owner_me if m["user_id"] == heir_id)["role"] == "owner"


def test_only_managers_can_invite(client, token) -> None:
    headers_a = auth_header(token)
    headers_b = _register(client, "member@test.ai", "Member")
    workspace_id = client.get("/api/v1/workspaces", headers=headers_a).json()[0]["id"]

    invite = client.post(
        f"/api/v1/workspaces/{workspace_id}/invites",
        json={"email": "member@test.ai", "role": "member"},
        headers=headers_a,
    ).json()
    client.post("/api/v1/invites/accept", json={"token": invite["token"]}, headers=headers_b)

    response = client.post(
        f"/api/v1/workspaces/{workspace_id}/invites",
        json={"email": "nobody@test.ai", "role": "member"},
        headers=headers_b,
    )
    assert response.status_code == 403


def test_cannot_remove_workspace_owner(client, token) -> None:
    headers = auth_header(token)
    workspace_id = client.get("/api/v1/workspaces", headers=headers).json()[0]["id"]
    owner_id = client.get(f"/api/v1/workspaces/{workspace_id}", headers=headers).json()["owner_id"]
    response = client.delete(
        f"/api/v1/workspaces/{workspace_id}/members/{owner_id}", headers=headers
    )
    assert response.status_code == 400
