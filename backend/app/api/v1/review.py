from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.v1.projects import get_owned_project
from app.db.session import get_db
from app.models.content import ContentItem
from app.models.user import User
from app.schemas.content import ContentItemOut

router = APIRouter(prefix="/projects/{project_id}/items/{item_id}/review", tags=["review"])


@router.post("", response_model=ContentItemOut)
def review_item(
    project_id: int,
    item_id: int,
    payload: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ContentItem:
    project = get_owned_project(project_id, user, db)
    item = db.get(ContentItem, item_id)
    if item is None or item.project_id != project.id:
        raise HTTPException(status_code=404, detail="Content item not found")

    action = payload.get("action")
    if action not in {"approve", "reject"}:
        raise HTTPException(status_code=400, detail="action must be 'approve' or 'reject'")

    item.status = "approved" if action == "approve" else "rejected"
    db.commit()
    db.refresh(item)
    return item
