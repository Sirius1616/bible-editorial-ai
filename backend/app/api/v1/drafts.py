from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.v1.projects import get_owned_project
from app.db.session import get_db
from app.models.content import ContentItem, ContentVersion
from app.models.project import Project
from app.models.user import User
from app.schemas.content import ContentVersionOut
from app.services.llm import generate_draft

router = APIRouter(prefix="/projects/{project_id}/items/{item_id}/draft", tags=["drafts"])


@router.post("", response_model=ContentVersionOut, status_code=status.HTTP_201_CREATED)
async def create_draft(
    project_id: int,
    item_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ContentVersion:
    project: Project = get_owned_project(project_id, user, db)
    item = db.get(ContentItem, item_id)
    if item is None or item.project_id != project.id:
        raise HTTPException(status_code=404, detail="Content item not found")

    try:
        body = await generate_draft(
            passage=item.passage or "",
            title=item.title,
            content_type=item.content_type,
            style_guide=project.style_guide or "",
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    latest = db.scalar(
        select(ContentVersion)
        .where(ContentVersion.content_item_id == item.id)
        .order_by(ContentVersion.version_number.desc())
    )
    next_number = (latest.version_number + 1) if latest else 1
    version = ContentVersion(
        content_item_id=item.id,
        version_number=next_number,
        body=body,
        change_note="AI-generated draft",
        created_by=user.id,
    )
    db.add(version)
    db.commit()
    db.refresh(version)
    return version
