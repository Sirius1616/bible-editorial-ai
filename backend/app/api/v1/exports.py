from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import PROJECT_EXPORT_ROLES, ensure_project_role, get_current_user
from app.api.v1.projects import get_accessible_project
from app.db.session import get_db
from app.models.content import ContentItem, ContentVersion
from app.models.user import User
from app.services.export import export_docx, export_markdown

router = APIRouter(prefix="/projects/{project_id}/items/{item_id}/export", tags=["exports"])


@router.get("")
def export_item(
    project_id: int,
    item_id: int,
    format: str = "md",
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    project = get_accessible_project(project_id, user, db)
    ensure_project_role(db, project, user, PROJECT_EXPORT_ROLES)
    item = db.get(ContentItem, item_id)
    if item is None or item.project_id != project.id:
        raise HTTPException(status_code=404, detail="Content item not found")

    latest = db.scalar(
        select(ContentVersion)
        .where(ContentVersion.content_item_id == item.id)
        .order_by(ContentVersion.version_number.desc())
    )
    body = latest.body if latest else ""
    passage = item.verse_label() or item.passage or ""
    footnotes = latest.footnotes if latest else []
    cross_refs = latest.cross_refs if latest else []
    if format == "docx":
        filename = f"{item.title.replace(' ', '_').lower()}.docx"
        return Response(
            content=export_docx(item.title, body, passage, footnotes, cross_refs, item.status),
            media_type=(
                "application/vnd.openxmlformats-officedocument."
                "wordprocessingml.document"
            ),
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    if format != "md":
        raise HTTPException(status_code=400, detail="Unsupported export format")
    filename = f"{item.title.replace(' ', '_').lower()}.md"
    return Response(
        content=export_markdown(item.title, body, passage, footnotes, cross_refs, item.status),
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
