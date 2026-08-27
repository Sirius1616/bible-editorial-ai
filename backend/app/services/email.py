"""Email service — sends transactional emails via n8n webhook."""

import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


def trigger_n8n_email(*, to: str, subject: str, html: str) -> bool:
    """POST to the n8n email webhook. n8n receives the payload and sends the email."""
    if not settings.email_enabled:
        logger.info("SMTP not configured — skipping email to %s", to)
        return False

    url = f"{settings.N8N_INTERNAL_URL}/webhook/send-email"
    payload = {
        "to": to,
        "subject": subject,
        "html": html,
    }
    try:
        with httpx.Client(timeout=10) as client:
            resp = client.post(url, json=payload)
            resp.raise_for_status()
        logger.info("n8n webhook triggered for email to %s", to)
        return True
    except Exception:
        logger.exception("Failed to trigger n8n email webhook for %s", to)
        return False


def send_invite_email(*, to: str, workspace_name: str, inviter_name: str, invite_link: str) -> bool:
    return trigger_n8n_email(
        to=to,
        subject=f"You're invited to {workspace_name} on Bible Editorial AI",
        html=f"""
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
            <h2 style="color: #2563eb;">Bible Editorial AI</h2>
            <p><strong>{inviter_name}</strong> has invited you to join the workspace
            <strong>{workspace_name}</strong>.</p>
            <p>Click the button below to accept:</p>
            <p style="text-align: center; margin: 1.5rem 0;">
                <a href="{invite_link}" style="background: #2563eb; color: #fff;
                padding: 0.7rem 1.5rem; border-radius: 6px; text-decoration: none;
                font-weight: 600;">Accept Invitation</a>
            </p>
            <p style="color: #6b7280; font-size: 0.85rem;">This link expires in 7 days.
            If you didn't expect this email, you can ignore it.</p>
        </div>
        """,
    )


def send_notification_email(*, to: str, message: str, link: str | None = None) -> bool:
    link_html = ""
    if link:
        link_html = f'<p><a href="{link}">View item</a></p>'

    return trigger_n8n_email(
        to=to,
        subject="Bible Editorial AI — New notification",
        html=f"""
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
            <h2 style="color: #2563eb;">Bible Editorial AI</h2>
            <p>{message}</p>
            {link_html}
        </div>
        """,
    )
