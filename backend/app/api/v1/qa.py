from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import (
    PROJECT_COMMENT_ROLES,
    ensure_project_role,
    get_current_user,
)
from app.api.v1.projects import get_accessible_project
from app.db.session import get_db
from app.models.content import ContentItem, ContentVersion
from app.models.project import Project
from app.models.user import User
from app.schemas.content import QACheckIn, QAOut
from app.services.llm import run_scripture_qa

router = APIRouter(prefix="/projects/{project_id}/items", tags=["qa"])


@router.post("/{item_id}/qa", response_model=QAOut)
async def scripture_qa(
    project_id: int,
    item_id: int,
    payload: QACheckIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    project: Project = get_accessible_project(project_id, user, db)
    ensure_project_role(db, project, user, PROJECT_COMMENT_ROLES)
    item = db.get(ContentItem, item_id)
    if item is None or item.project_id != project.id:
        raise HTTPException(status_code=404, detail="Content item not found")

    if not (item.verse_start_book and item.verse_start_chapter and item.verse_start_verse):
        raise HTTPException(
            status_code=400,
            detail="This item needs a verse anchor before it can be QA-checked",
        )

    body = payload.body
    if body is None:
        latest = db.scalar(
            select(ContentVersion)
            .where(ContentVersion.content_item_id == item.id)
            .order_by(ContentVersion.version_number.desc())
        )
        body = latest.body if latest else ""

    try:
        result, demo = await run_scripture_qa(
            body=body or "",
            book=item.verse_start_book,
            chapter=item.verse_start_chapter,
            start_verse=item.verse_start_verse,
            end_verse=item.verse_end_verse if (
                item.verse_end_book == item.verse_start_book
                and item.verse_end_chapter == item.verse_start_chapter
            ) else None,
            translation=project.translation or "",
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    return {**result, "demo": demo}