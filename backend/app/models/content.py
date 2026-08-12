from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ContentItem(Base):
    __tablename__ = "content_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    title: Mapped[str] = mapped_column(String(255))
    passage: Mapped[str | None] = mapped_column(String(100), default="")
    content_type: Mapped[str] = mapped_column(String(50), default="study_note")
    status: Mapped[str] = mapped_column(String(50), default="assigned")
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    project: Mapped["Project"] = relationship(back_populates="content_items")  # noqa: F821
    versions: Mapped[list["ContentVersion"]] = relationship(
        back_populates="content_item",
        cascade="all, delete-orphan",
        order_by="ContentVersion.version_number",
    )
    comments: Mapped[list["Comment"]] = relationship(
        back_populates="content_item", cascade="all, delete-orphan"
    )
    status_history: Mapped[list["StatusHistory"]] = relationship(
        back_populates="content_item", cascade="all, delete-orphan"
    )


class ContentVersion(Base):
    __tablename__ = "content_versions"

    id: Mapped[int] = mapped_column(primary_key=True)
    content_item_id: Mapped[int] = mapped_column(ForeignKey("content_items.id"))
    version_number: Mapped[int] = mapped_column(default=1)
    body: Mapped[str] = mapped_column(Text, default="")
    change_note: Mapped[str | None] = mapped_column(Text, default="")
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    content_item: Mapped["ContentItem"] = relationship(back_populates="versions")


class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[int] = mapped_column(primary_key=True)
    content_item_id: Mapped[int] = mapped_column(ForeignKey("content_items.id"))
    author_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    content_item: Mapped["ContentItem"] = relationship(back_populates="comments")


class StatusHistory(Base):
    __tablename__ = "status_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    content_item_id: Mapped[int] = mapped_column(ForeignKey("content_items.id"))
    from_status: Mapped[str] = mapped_column(String(50))
    to_status: Mapped[str] = mapped_column(String(50))
    note: Mapped[str | None] = mapped_column(Text, default="")
    changed_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    content_item: Mapped["ContentItem"] = relationship(back_populates="status_history")
