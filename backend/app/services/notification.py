"""Notification service — helper to create notifications on events."""

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.notification import Notification
from app.models.user import User
from app.services.email import send_notification_email


def create_notification(
    db: Session,
    *,
    user_id: int,
    project_id: int | None = None,
    content_item_id: int | None = None,
    type: str,
    message: str,
) -> Notification:
    notif = Notification(
        user_id=user_id,
        project_id=project_id,
        content_item_id=content_item_id,
        type=type,
        message=message,
        read=False,
    )
    db.add(notif)
    db.flush()

    if settings.email_enabled:
        user = db.get(User, user_id)
        if user and user.email:
            link = None
            if project_id and content_item_id:
                link = f"{settings.FRONTEND_URL}/projects/{project_id}/items/{content_item_id}"
            send_notification_email(to=user.email, message=message, link=link)

    return notif
