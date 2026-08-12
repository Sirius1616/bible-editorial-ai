from datetime import datetime

from pydantic import BaseModel, ConfigDict


class VerseAnchor(BaseModel):
    book: str
    chapter: int
    verse: int


class ContentItemCreate(BaseModel):
    title: str
    passage: str = ""
    content_type: str = "study_note"
    due_date: datetime | None = None
    verse_start: VerseAnchor | None = None
    verse_end: VerseAnchor | None = None


class ContentItemUpdate(BaseModel):
    title: str | None = None
    passage: str | None = None
    content_type: str | None = None
    due_date: datetime | None = None
    verse_start: VerseAnchor | None = None
    verse_end: VerseAnchor | None = None


class ContentItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    title: str
    passage: str | None
    content_type: str
    status: str
    due_date: datetime | None
    verse_start: VerseAnchor | None
    verse_end: VerseAnchor | None
    created_at: datetime
    updated_at: datetime


class DiffSegment(BaseModel):
    op: str
    text: str


class VersionDiffOut(BaseModel):
    from_version: int
    to_version: int
    word_diff: list[DiffSegment]
    line_diff: list[DiffSegment]


class ContentVersionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    content_item_id: int
    version_number: int
    body: str
    change_note: str | None
    footnotes: list | None
    cross_refs: list | None
    created_at: datetime


class CommentCreate(BaseModel):
    body: str


class CommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    content_item_id: int
    author_id: int | None
    body: str
    created_at: datetime


class TransitionIn(BaseModel):
    status: str
    note: str | None = None


class StatusHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    content_item_id: int
    from_status: str
    to_status: str
    note: str | None
    changed_by: int | None
    created_at: datetime
