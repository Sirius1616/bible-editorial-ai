from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import (
    PROJECT_REVIEW_ROLES,
    ensure_project_role,
    get_current_user,
)
from app.api.v1.projects import get_accessible_project
from app.db.session import get_db
from app.models.content import ContentItem, StatusHistory
from app.models.user import User
from app.schemas.content import ContentItemOut, StatusHistoryOut, TransitionIn
from app.services.notification import create_notification

router = APIRouter(prefix="/projects/{project_id}/items/{item_id}", tags=["workflow"])

ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    "assigned": {"in_progress", "archived"},
    "in_progress": {"assigned", "in_review", "archived"},
    "in_review": {"in_progress", "qa", "ready", "archived"},
    "qa": {"in_review", "ready", "archived"},
    "ready": {"in_review", "archived"},
    "archived": {"assigned"},
}


def get_owned_item(project_id: int, item_id: int, user: User, db: Session) -> ContentItem:
    project = get_accessible_project(project_id, user, db)
    item = db.get(ContentItem, item_id)
    if item is None or item.project_id != project_id:
        raise HTTPException(status_code=404, detail="Content item not found")
    return item


def apply_transition(
    item: ContentItem,
    to_status: str,
    user: User,
    db: Session,
    note: str | None = None,
    force: bool = False,
) -> ContentItem:
    if not force and to_status not in ALLOWED_TRANSITIONS.get(item.status, set()):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot move item from '{item.status}' to '{to_status}'",
        )
    db.add(
        StatusHistory(
            content_item_id=item.id,
            from_status=item.status,
            to_status=to_status,
            note=note,
            changed_by=user.id,
        )
    )
    from_status_label = item.status
    item.status = to_status
    db.flush()
    if item.assignee_id and item.assignee_id != user.id:
        create_notification(
            db,
            user_id=item.assignee_id,
            project_id=item.project_id,
            content_item_id=item.id,
            type="status_change",
            message=f'"{item.title}" moved from {from_status_label} to {to_status}',
        )
    db.commit()
    db.refresh(item)
    return item


@router.post("/transition", response_model=ContentItemOut)
def transition_item(
    project_id: int,
    item_id: int,
    payload: TransitionIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ContentItem:
    project = get_accessible_project(project_id, user, db)
    ensure_project_role(db, project, user, PROJECT_REVIEW_ROLES)
    item = get_owned_item(project_id, item_id, user, db)
    return apply_transition(item, payload.status, user, db, payload.note)


@router.get("/history", response_model=list[StatusHistoryOut])
def list_status_history(
    project_id: int,
    item_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[StatusHistory]:
    get_owned_item(project_id, item_id, user, db)
    return list(
        db.scalars(
            select(StatusHistory)
            .where(StatusHistory.content_item_id == item_id)
            .order_by(StatusHistory.created_at)
        )
    )


@router.post("/review", response_model=ContentItemOut)
def review_item(
    project_id: int,
    item_id: int,
    payload: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ContentItem:
    project = get_accessible_project(project_id, user, db)
    ensure_project_role(db, project, user, PROJECT_REVIEW_ROLES)
    item = get_owned_item(project_id, item_id, user, db)
    action = payload.get("action")
    if action not in {"approve", "reject"}:
        raise HTTPException(status_code=400, detail="action must be 'approve' or 'reject'")

    to_status = "ready" if action == "approve" else "archived"
    return apply_transition(
        item,
        to_status,
        user,
        db,
        note="approved" if action == "approve" else "rejected",
        force=True,
    )
