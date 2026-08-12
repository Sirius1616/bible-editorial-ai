from tests.conftest import auth_header


def _create_project_with_style_guide(client, token: str) -> int:
    response = client.post(
        "/api/v1/projects",
        headers=auth_header(token),
        json={
            "name": "Guided Project",
            "description": "d",
            "translation": "NIV",
            "style_guide": "Use plain language. Address the reader as 'you'. Max 250 words.",
        },
    )
    assert response.status_code == 201
    return response.json()["id"]


def _create_item(client, token: str, project_id: int, content_type: str = "study_note") -> int:
    response = client.post(
        f"/api/v1/projects/{project_id}/items",
        headers=auth_header(token),
        json={
            "title": "Grace in Action",
            "passage": "Ephesians 2:8-10",
            "content_type": content_type,
        },
    )
    assert response.status_code == 201
    return response.json()["id"]


def test_draft_demo_mode_study_note(client, token) -> None:
    headers = auth_header(token)
    project_id = _create_project_with_style_guide(client, token)
    item_id = _create_item(client, token, project_id)

    response = client.post(
        f"/api/v1/projects/{project_id}/items/{item_id}/draft", headers=headers
    )
    assert response.status_code == 201
    version = response.json()
    assert version["body"]
    assert "Ephesians 2:8-10" in version["body"]
    assert version["change_note"] == "AI-generated draft (demo mode)"


def test_draft_demo_mode_devotional(client, token) -> None:
    headers = auth_header(token)
    project_id = _create_project_with_style_guide(client, token)
    item_id = _create_item(client, token, project_id, content_type="devotional")

    response = client.post(
        f"/api/v1/projects/{project_id}/items/{item_id}/draft", headers=headers
    )
    assert response.status_code == 201
    version = response.json()
    assert version["body"]
    assert "Grace in Action" in version["body"]


def test_draft_increments_version_number(client, token) -> None:
    headers = auth_header(token)
    project_id = _create_project_with_style_guide(client, token)
    item_id = _create_item(client, token, project_id)

    first = client.post(
        f"/api/v1/projects/{project_id}/items/{item_id}/draft", headers=headers
    )
    second = client.post(
        f"/api/v1/projects/{project_id}/items/{item_id}/draft", headers=headers
    )
    assert first.json()["version_number"] == 2
    assert second.json()["version_number"] == 3


def test_build_draft_prompt_includes_context() -> None:
    from app.services.llm import build_draft_prompt

    prompt = build_draft_prompt(
        passage="Romans 8:28",
        title="All Things",
        content_type="devotional",
        style_guide="Use 'you'.",
        translation="ESV",
    )
    assert "Romans 8:28" in prompt
    assert '"All Things"' in prompt
    assert "devotional" in prompt
    assert "Style guide:\nUse 'you'." in prompt
    assert "ESV" in prompt
