from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.v1.projects import get_owned_project
from app.db.session import get_db
from app.models.content import Comment, ContentItem, ContentVersion
from app.models.project import Project
from app.models.user import User
from app.schemas.content import (
    CommentCreate,
    CommentOut,
    ContentItemCreate,
    ContentItemOut,
    ContentItemUpdate,
    ContentVersionOut,
    VersionDiffOut,
)
from app.services.diff import diff_bodies

router = APIRouter(prefix="/projects/{project_id}/items", tags=["content"])


def flatten_verse_anchor(anchor) -> dict:
    if anchor is None:
        return {}
    return {
        "book": anchor.book,
        "chapter": anchor.chapter,
        "verse": anchor.verse,
    }


def apply_verse_anchor(item: ContentItem, payload) -> None:
    start = payload.verse_start
    end = payload.verse_end
    item.verse_start_book = start.book if start else None
    item.verse_start_chapter = start.chapter if start else None
    item.verse_start_verse = start.verse if start else None
    item.verse_end_book = end.book if end else None
    item.verse_end_chapter = end.chapter if end else None
    item.verse_end_verse = end.verse if end else None
    label = item.verse_label()
    if label and not payload.passage:
        item.passage = label


def get_owned_item(project: Project, item_id: int, db: Session) -> ContentItem:
    item = db.get(ContentItem, item_id)
    if item is None or item.project_id != project.id:
        raise HTTPException(status_code=404, detail="Content item not found")
    return item


@router.get("", response_model=list[ContentItemOut])
def list_items(
    project_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ContentItem]:
    get_owned_project(project_id, user, db)
    return list(
        db.scalars(select(ContentItem).where(ContentItem.project_id == project_id))
    )


@router.post("", response_model=ContentItemOut, status_code=status.HTTP_201_CREATED)
def create_item(
    project_id: int,
    payload: ContentItemCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ContentItem:
    get_owned_project(project_id, user, db)
    data = payload.model_dump(exclude={"verse_start", "verse_end", "passage"})
    if payload.passage:
        data["passage"] = payload.passage
    item = ContentItem(project_id=project_id, **data)
    apply_verse_anchor(item, payload)
    if not item.passage:
        item.passage = item.verse_label() or ""
    db.add(item)
    db.flush()
    db.add(ContentVersion(content_item_id=item.id, version_number=1, body="", created_by=user.id))
    db.commit()
    db.refresh(item)
    return item


@router.get("/{item_id}", response_model=ContentItemOut)
def get_item(
    project_id: int,
    item_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ContentItem:
    project = get_owned_project(project_id, user, db)
    return get_owned_item(project, item_id, db)


@router.patch("/{item_id}", response_model=ContentItemOut)
def update_item(
    project_id: int,
    item_id: int,
    payload: ContentItemUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ContentItem:
    project = get_owned_project(project_id, user, db)
    item = get_owned_item(project, item_id, db)
    if payload.model_fields_set & {"verse_start", "verse_end"}:
        apply_verse_anchor(item, payload)
    for field, value in payload.model_dump(exclude_unset=True, exclude={"verse_start", "verse_end"}).items():
        setattr(item, field, value)
    if not item.passage:
        item.passage = item.verse_label() or ""
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(
    project_id: int,
    item_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    project = get_owned_project(project_id, user, db)
    item = get_owned_item(project, item_id, db)
    db.delete(item)
    db.commit()


@router.post("/{item_id}/versions", response_model=ContentVersionOut, status_code=status.HTTP_201_CREATED)
def add_version(
    project_id: int,
    item_id: int,
    payload: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ContentVersion:
    project = get_owned_project(project_id, user, db)
    item = get_owned_item(project, item_id, db)
    latest = db.scalar(
        select(ContentVersion)
        .where(ContentVersion.content_item_id == item.id)
        .order_by(ContentVersion.version_number.desc())
    )
    next_number = (latest.version_number + 1) if latest else 1
    version = ContentVersion(
        content_item_id=item.id,
        version_number=next_number,
        body=payload.get("body", ""),
        change_note=payload.get("change_note", ""),
        footnotes=payload.get("footnotes") or [],
        cross_refs=payload.get("cross_refs") or [],
        created_by=user.id,
    )
    db.add(version)
    db.commit()
    db.refresh(version)
    return version


@router.get("/{item_id}/versions", response_model=list[ContentVersionOut])
def list_versions(
    project_id: int,
    item_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ContentVersion]:
    project = get_owned_project(project_id, user, db)
    get_owned_item(project, item_id, db)
    return list(
        db.scalars(
            select(ContentVersion)
            .where(ContentVersion.content_item_id == item_id)
            .order_by(ContentVersion.version_number)
        )
    )


@router.get("/{item_id}/versions/diff", response_model=VersionDiffOut)
def diff_versions(
    project_id: int,
    item_id: int,
    from_version: int,
    to_version: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    project = get_owned_project(project_id, user, db)
    get_owned_item(project, item_id, db)
    versions = list(
        db.scalars(
            select(ContentVersion)
            .where(
                ContentVersion.content_item_id == item_id,
                ContentVersion.version_number.in_([from_version, to_version]),
            )
        )
    )
    if len(versions) != 2:
        raise HTTPException(
            status_code=404, detail="One or both versions not found"
        )
    by_number = {v.version_number: v for v in versions}
    return {
        "from_version": from_version,
        "to_version": to_version,
        **diff_bodies(by_number[from_version].body or "", by_number[to_version].body or ""),
    }


@router.post("/{item_id}/comments", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
def add_comment(
    project_id: int,
    item_id: int,
    payload: CommentCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Comment:
    project = get_owned_project(project_id, user, db)
    get_owned_item(project, item_id, db)
    comment = Comment(content_item_id=item_id, author_id=user.id, body=payload.body)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


@router.get("/{item_id}/comments", response_model=list[CommentOut])
def list_comments(
    project_id: int,
    item_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Comment]:
    project = get_owned_project(project_id, user, db)
    get_owned_item(project, item_id, db)
    return list(
        db.scalars(
            select(Comment)
            .where(Comment.content_item_id == item_id)
            .order_by(Comment.created_at)
        )
    )
