from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ContentItemCreate(BaseModel):
    title: str
    passage: str = ""
    content_type: str = "study_note"


class ContentItemUpdate(BaseModel):
    title: str | None = None
    passage: str | None = None
    content_type: str | None = None


class ContentItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    title: str
    passage: str | None
    content_type: str
    status: str
    created_at: datetime
    updated_at: datetime


class ContentVersionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    content_item_id: int
    version_number: int
    body: str
    change_note: str | None
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
