from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.v1.projects import get_accessible_project
from app.db.session import get_db
from app.models.content import ContentItem, ContentVersion
from app.models.project import Project
from app.models.user import User
from app.schemas.content import StyleCheckIn, StyleCheckOut
from app.services.llm import check_style_guide

router = APIRouter(prefix="/projects/{project_id}/items", tags=["style"])


@router.post("/{item_id}/style-check", response_model=StyleCheckOut)
async def style_check(
    project_id: int,
    item_id: int,
    payload: StyleCheckIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    project: Project = get_accessible_project(project_id, user, db)
    item = db.get(ContentItem, item_id)
    if item is None or item.project_id != project.id:
        raise HTTPException(status_code=404, detail="Content item not found")

    body = payload.body
    if body is None:
        latest = db.scalar(
            select(ContentVersion)
            .where(ContentVersion.content_item_id == item.id)
            .order_by(ContentVersion.version_number.desc())
        )
        body = latest.body if latest else ""

    try:
        result, demo = await check_style_guide(body or "", project.style_guide or "")
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    return {**result, "demo": demo}
