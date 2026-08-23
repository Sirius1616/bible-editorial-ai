import pytest

from tests.conftest import auth_header


def _create_project(client, token: str) -> int:
    response = client.post(
        "/api/v1/projects",
        headers=auth_header(token),
        json={
            "name": "Style Project",
            "translation": "NIV",
            "style_guide": "Use plain language. Address the reader as 'you'. No exclamations.",
        },
    )
    return response.json()["id"]


def _create_item(client, token: str, project_id: int) -> int:
    response = client.post(
        f"/api/v1/projects/{project_id}/items",
        headers=auth_header(token),
        json={"title": "Grace", "content_type": "study_note"},
    )
    return response.json()["id"]


def test_style_check_uses_latest_version_body(client, token) -> None:
    headers = auth_header(token)
    project_id = _create_project(client, token)
    item_id = _create_item(client, token, project_id)

    client.post(
        f"/api/v1/projects/{project_id}/items/{item_id}/versions",
        headers=headers,
        json={"body": "I think this verse is really great!", "change_note": "draft"},
    )

    response = client.post(
        f"/api/v1/projects/{project_id}/items/{item_id}/style-check",
        headers=headers,
        json={},
    )
    assert response.status_code == 200
    result = response.json()
    assert result["score"] < 100
    assert result["demo"] is True
    issues = result["issues"]
    assert issues
    severities = {issue["severity"] for issue in issues}
    assert severities <= {"high", "medium", "low"}
    assert any("first-person" in issue["reason"].lower() for issue in issues)


def test_style_check_accepts_explicit_body(client, token) -> None:
    headers = auth_header(token)
    project_id = _create_project(client, token)
    item_id = _create_item(client, token, project_id)

    response = client.post(
        f"/api/v1/projects/{project_id}/items/{item_id}/style-check",
        headers=headers,
        json={"body": "The verse is fine."},
    )
    assert response.status_code == 200
    assert response.json()["score"] == 100
    assert response.json()["issues"] == []


def test_style_check_missing_item_is_404(client, token) -> None:
    headers = auth_header(token)
    project_id = _create_project(client, token)

    response = client.post(
        f"/api/v1/projects/{project_id}/items/999/style-check",
        headers=headers,
        json={"body": "x"},
    )
    assert response.status_code == 404


def test_build_style_check_prompt_includes_context() -> None:
    from app.services.llm import build_style_check_prompt

    prompt = build_style_check_prompt("Sample manuscript.", "Use 'you'. Max 250 words.")
    assert "Use 'you'. Max 250 words." in prompt
    assert "Sample manuscript." in prompt
    assert "json" in prompt.lower()


def test_mock_style_issues_clean_text_scores_100() -> None:
    from app.services.llm import build_mock_style_issues

    result = build_mock_style_issues("The verse is fine.", "Use plain language.")
    assert result["score"] == 100
    assert result["issues"] == []
