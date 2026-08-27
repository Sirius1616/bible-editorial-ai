"""Notification service — helper to create notifications on events."""

from sqlalchemy.orm import Session

from app.models.notification import Notification


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
    return notif
