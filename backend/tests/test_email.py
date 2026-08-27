"""Tests for the SMTP email service."""

from unittest.mock import MagicMock, patch

from app.services.email import send_invite_email, send_notification_email


def test_email_disabled_when_no_smtp() -> None:
    with patch("app.services.email.settings") as mock_settings:
        mock_settings.email_enabled = False
        result = send_invite_email(
            to="test@test.ai",
            workspace_name="Workspace",
            inviter_name="Inviter",
            invite_link="http://localhost:3000/invite/abc",
        )
        assert result is False


def test_email_sends_via_smtp() -> None:
    with patch("app.services.email.settings") as mock_settings, patch(
        "app.services.email.smtplib.SMTP"
    ) as mock_smtp:
        mock_settings.email_enabled = True
        mock_settings.SMTP_HOST = "smtp.test.com"
        mock_settings.SMTP_PORT = 587
        mock_settings.SMTP_USER = "user"
        mock_settings.SMTP_PASS = "pass"
        mock_settings.SMTP_FROM = "from@test.com"

        server = MagicMock()
        mock_smtp.return_value.__enter__.return_value = server

        result = send_notification_email(
            to="test@test.ai",
            message="You were assigned to Faith and Works",
            link="http://localhost:3000/projects/1/items/2",
        )

        assert result is True
        mock_smtp.assert_called_once_with("smtp.test.com", 587, timeout=15)
        server.send_message.assert_called_once()
