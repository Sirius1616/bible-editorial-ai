from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

MemberRole = Literal["owner", "admin", "member", "viewer"]


class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class WorkspaceUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class WorkspaceMemberOut(BaseModel):
    id: int
    user_id: int
    role: str
    email: EmailStr
    full_name: str
    created_at: datetime


class WorkspaceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    owner_id: int
    created_at: datetime
    member_count: int = 0
    my_role: str = ""


class WorkspaceDetailOut(WorkspaceOut):
    members: list[WorkspaceMemberOut] = []


class MemberRoleUpdate(BaseModel):
    role: MemberRole


class TransferIn(BaseModel):
    user_id: int


class InviteCreate(BaseModel):
    email: EmailStr
    role: MemberRole = "member"


class InvitationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    workspace_id: int
    email: EmailStr
    role: str
    token: str
    created_at: datetime
    expires_at: datetime | None
    accepted_at: datetime | None
    join_url: str = ""


class InviteAccept(BaseModel):
    token: str


class InviteRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=1)


class InviteInfoOut(BaseModel):
    workspace_name: str
    email: EmailStr
    role: str
