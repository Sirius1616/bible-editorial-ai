from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, default="")
    translation: Mapped[str] = mapped_column(String(100), default="ESV")
    style_guide: Mapped[str | None] = mapped_column(Text, default="")
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    workspace_id: Mapped[int | None] = mapped_column(
        ForeignKey("workspaces.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    owner: Mapped["User"] = relationship(back_populates="projects")  # noqa: F821
    workspace: Mapped["Workspace | None"] = relationship(  # noqa: F821
        back_populates="projects"
    )
    content_items: Mapped[list["ContentItem"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )

    @property
    def workspace_name(self) -> str | None:
        return self.workspace.name if self.workspace else None
