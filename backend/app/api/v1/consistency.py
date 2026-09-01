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
from app.schemas.content import ConsistencyIn, ConsistencyOut
from app.services.llm import run_consistency_check

router = APIRouter(prefix="/projects/{project_id}/items", tags=["consistency"])


def _latest_bodies(db: Session, project_id: int) -> list[str]:
    pairs = db.execute(
        select(
            ContentVersion.content_item_id,
            ContentVersion.version_number,
            ContentVersion.body,
        )
        .where(ContentVersion.content_item_id.in_(
            select(ContentItem.id).where(ContentItem.project_id == project_id)
        ))
        .order_by(
            ContentVersion.content_item_id.desc(),
            ContentVersion.version_number.desc(),
        )
    ).all()

    seen: set[int] = set()
    bodies: list[str] = []
    for item_id, _version, body in pairs:
        if item_id not in seen:
            seen.add(item_id)
            if body:
                bodies.append(body)
    return bodies


@router.post("/{item_id}/consistency", response_model=ConsistencyOut)
async def consistency_check(
    project_id: int,
    item_id: int,
    payload: ConsistencyIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    project: Project = get_accessible_project(project_id, user, db)
    ensure_project_role(db, project, user, PROJECT_COMMENT_ROLES)
    item = db.get(ContentItem, item_id)
    if item is None or item.project_id != project.id:
        raise HTTPException(status_code=404, detail="Content item not found")

    cross_refs: list[str] = payload.cross_refs
    if cross_refs is None:
        latest = db.scalar(
            select(ContentVersion)
            .where(ContentVersion.content_item_id == item.id)
            .order_by(ContentVersion.version_number.desc())
        )
        cross_refs = list(latest.cross_refs or []) if latest else []

    body = payload.body
    if body is None:
        latest = db.scalar(
            select(ContentVersion)
            .where(ContentVersion.content_item_id == item.id)
            .order_by(ContentVersion.version_number.desc())
        )
        body = latest.body if latest else ""

    project_bodies = _latest_bodies(db, project.id)
    project_bodies = [b for b in project_bodies if b != (body or "")]

    try:
        result, demo = await run_consistency_check(
            body=body or "",
            cross_refs=cross_refs,
            translation=project.translation or "",
            project_bodies=project_bodies,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    return {**result, "demo": demo}