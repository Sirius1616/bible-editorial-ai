from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr

ProjectMemberRole = Literal["admin", "editor", "reviewer", "proofreader", "viewer"]


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
    member_count: int = 0
    my_role: str = ""


class ProjectMemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    role: ProjectMemberRole
    email: EmailStr
    full_name: str
    created_at: datetime


class ProjectDetailOut(ProjectOut):
    members: list[ProjectMemberOut] = []


class ProjectMemberAdd(BaseModel):
    user_id: int
    role: ProjectMemberRole = "editor"


class ProjectMemberRoleUpdate(BaseModel):
    role: ProjectMemberRole
