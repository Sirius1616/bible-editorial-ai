from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.v1.projects import get_accessible_project
from app.db.session import get_db
from app.models.content import ContentItem
from app.models.project import Project
from app.models.user import User
from app.schemas.content import TranslationComparisonOut
from app.services.translation import fetch_passage

router = APIRouter(prefix="/projects/{project_id}/items", tags=["translations"])


@router.get("/{item_id}/translations", response_model=TranslationComparisonOut)
async def get_translations(
    project_id: int,
    item_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    project: Project = get_accessible_project(project_id, user, db)
    item = db.get(ContentItem, item_id)
    if item is None or item.project_id != project.id:
        raise HTTPException(status_code=404, detail="Content item not found")

    if not (item.verse_start_book and item.verse_start_chapter and item.verse_start_verse):
        raise HTTPException(
            status_code=400,
            detail="Anchor this item to a passage before comparing translations.",
        )

    end_verse = None
    if (
        item.verse_end_book
        and item.verse_end_book == item.verse_start_book
        and item.verse_end_chapter == item.verse_start_chapter
    ):
        end_verse = item.verse_end_verse

    try:
        result, _demo = await fetch_passage(
            item.verse_start_book,
            item.verse_start_chapter,
            item.verse_start_verse,
            end_verse,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    return result
