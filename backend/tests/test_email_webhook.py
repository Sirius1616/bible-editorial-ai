"""Tests for the n8n email webhook integration."""

from unittest.mock import patch

from app.services.email import send_invite_email, send_notification_email, trigger_n8n_email


def test_email_disabled_when_no_smtp() -> None:
    with patch("app.services.email.settings") as mock_settings:
        mock_settings.email_enabled = False
        mock_settings.N8N_INTERNAL_URL = "http://n8n:5678"
        result = send_invite_email(
            to="test@test.ai",
            workspace_name="Workspace",
            inviter_name="Inviter",
            invite_link="http://localhost:3000/invite/abc",
        )
        assert result is False


def test_trigger_n8n_email_calls_webhook() -> None:
    with patch("app.services.email.settings") as mock_settings:
        mock_settings.email_enabled = True
        mock_settings.N8N_INTERNAL_URL = "http://n8n:5678"
        mock_client = patch("app.services.email.httpx.Client")
        mock_ctx = mock_client.start()
        mock_ctx.return_value.__enter__.return_value.post.return_value.raise_for_status.return_value = None

        try:
            result = trigger_n8n_email(
                to="test@test.ai",
                subject="Test subject",
                html="<p>Hello</p>",
            )
        finally:
            mock_client.stop()

        assert result is True
        mock_ctx.return_value.__enter__.return_value.post.assert_called_once_with(
            "http://n8n:5678/webhook/send-email",
            json={
                "to": "test@test.ai",
                "subject": "Test subject",
                "html": "<p>Hello</p>",
            },
        )
