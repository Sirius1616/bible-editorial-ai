from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ProjectCreate(BaseModel):
    name: str
    description: str = ""
    translation: str = "ESV"
    style_guide: str = ""
    workspace_id: int | None = None


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    translation: str | None = None
    style_guide: str | None = None


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    translation: str
    style_guide: str | None
    owner_id: int
    workspace_id: int | None
    workspace_name: str | None = None
    created_at: datetime
