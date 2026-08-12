from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text, func
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
    verse_start_book: Mapped[str | None] = mapped_column(String(50), nullable=True)
    verse_start_chapter: Mapped[int | None] = mapped_column(Integer, nullable=True)
    verse_start_verse: Mapped[int | None] = mapped_column(Integer, nullable=True)
    verse_end_book: Mapped[str | None] = mapped_column(String(50), nullable=True)
    verse_end_chapter: Mapped[int | None] = mapped_column(Integer, nullable=True)
    verse_end_verse: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    @property
    def verse_start(self) -> dict | None:
        if (
            self.verse_start_book
            and self.verse_start_chapter is not None
            and self.verse_start_verse is not None
        ):
            return {
                "book": self.verse_start_book,
                "chapter": self.verse_start_chapter,
                "verse": self.verse_start_verse,
            }
        return None

    @property
    def verse_end(self) -> dict | None:
        if (
            self.verse_end_book
            and self.verse_end_chapter is not None
            and self.verse_end_verse is not None
        ):
            return {
                "book": self.verse_end_book,
                "chapter": self.verse_end_chapter,
                "verse": self.verse_end_verse,
            }
        return None

    def verse_label(self) -> str | None:
        start = self.verse_start
        end = self.verse_end
        if not start:
            return self.passage or None
        if end and (end["book"], end["chapter"]) == (start["book"], start["chapter"]):
            if end["verse"] == start["verse"]:
                return f"{start['book']} {start['chapter']}:{start['verse']}"
            return f"{start['book']} {start['chapter']}:{start['verse']}-{end['verse']}"
        if end:
            return (
                f"{start['book']} {start['chapter']}:{start['verse']}-"
                f"{end['book']} {end['chapter']}:{end['verse']}"
            )
        return f"{start['book']} {start['chapter']}:{start['verse']}"

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
    footnotes: Mapped[list | None] = mapped_column(JSON, nullable=True, default=list)
    cross_refs: Mapped[list | None] = mapped_column(JSON, nullable=True, default=list)
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
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("comments.id"), nullable=True)
    body: Mapped[str] = mapped_column(Text)
    resolved: Mapped[bool] = mapped_column(default=False)
    anchor_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    anchor_start: Mapped[str | None] = mapped_column(Text, nullable=True)
    anchor_end: Mapped[str | None] = mapped_column(Text, nullable=True)
    anchor_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    content_item: Mapped["ContentItem"] = relationship(back_populates="comments")
    parent: Mapped["Comment | None"] = relationship(
        back_populates="replies", remote_side=[id]
    )
    replies: Mapped[list["Comment"]] = relationship(
        back_populates="parent", cascade="all, delete-orphan"
    )


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
