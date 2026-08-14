import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import (
    ensure_member,
    ensure_role,
    get_current_user,
    get_membership,
)
from app.core.config import settings
from app.core.security import create_access_token, hash_password
from app.db.session import get_db
from app.models.project import Project
from app.models.user import User
from app.models.workspace import Invitation, Workspace, WorkspaceMember
from app.schemas.user import Token
from app.schemas.workspace import (
    InvitationOut,
    InviteAccept,
    InviteCreate,
    InviteInfoOut,
    InviteRegister,
    MemberRoleUpdate,
    TransferIn,
    WorkspaceCreate,
    WorkspaceDetailOut,
    WorkspaceMemberOut,
    WorkspaceOut,
    WorkspaceUpdate,
)

router = APIRouter(prefix="/workspaces", tags=["workspaces"])
invites_router = APIRouter(prefix="/invites", tags=["invites"])

MANAGER_ROLES = {"owner", "admin"}
OWNER_ROLE = {"owner"}


def _member_out(member: WorkspaceMember) -> dict:
    return {
        "id": member.id,
        "user_id": member.user_id,
        "role": member.role,
        "email": member.user.email,
        "full_name": member.user.full_name,
        "created_at": member.created_at,
    }


def _workspace_out(workspace: Workspace, user: User) -> dict:
    members = workspace.members
    me = next((m for m in members if m.user_id == user.id), None)
    return {
        "id": workspace.id,
        "name": workspace.name,
        "owner_id": workspace.owner_id,
        "created_at": workspace.created_at,
        "member_count": len(members),
        "my_role": me.role if me else "",
    }


def _invitation_out(invite: Invitation) -> dict:
    return {
        "id": invite.id,
        "workspace_id": invite.workspace_id,
        "email": invite.email,
        "role": invite.role,
        "token": invite.token,
        "created_at": invite.created_at,
        "expires_at": invite.expires_at,
        "accepted_at": invite.accepted_at,
        "join_url": f"/invite/{invite.token}",
    }


def _as_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _is_valid(invite: Invitation) -> bool:
    if invite.accepted_at is not None:
        return False
    if invite.expires_at is not None and _as_utc(invite.expires_at) < datetime.now(
        timezone.utc
    ):
        return False
    return True


def _get_valid_invite(db: Session, token: str) -> Invitation:
    invite = db.scalar(select(Invitation).where(Invitation.token == token))
    if invite is None:
        raise HTTPException(status_code=404, detail="Invitation not found")
    if not _is_valid(invite):
        raise HTTPException(status_code=400, detail="Invitation expired or already used")
    return invite


def _accept(db: Session, invite: Invitation, user: User) -> Workspace:
    if invite.email.lower() != user.email.lower():
        raise HTTPException(
            status_code=400,
            detail="This invitation was sent to a different email address",
        )
    existing = get_membership(db, invite.workspace_id, user.id)
    if existing is not None:
        raise HTTPException(status_code=409, detail="Already a member of this workspace")
    db.add(
        WorkspaceMember(
            workspace_id=invite.workspace_id, user_id=user.id, role=invite.role
        )
    )
    invite.accepted_at = datetime.now(timezone.utc)
    db.commit()
    return db.get(Workspace, invite.workspace_id)


@router.get("", response_model=list[WorkspaceOut])
def list_workspaces(
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> list[dict]:
    memberships = db.scalars(
        select(WorkspaceMember).where(WorkspaceMember.user_id == user.id)
    ).all()
    return [_workspace_out(m.workspace, user) for m in memberships]


@router.post("", response_model=WorkspaceOut, status_code=status.HTTP_201_CREATED)
def create_workspace(
    payload: WorkspaceCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    workspace = Workspace(name=payload.name, owner_id=user.id)
    db.add(workspace)
    db.flush()
    db.add(WorkspaceMember(workspace_id=workspace.id, user_id=user.id, role="owner"))
    db.commit()
    db.refresh(workspace)
    return _workspace_out(workspace, user)


@router.get("/{workspace_id}", response_model=WorkspaceDetailOut)
def get_workspace(
    workspace_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    member = ensure_member(db, workspace_id, user.id)
    workspace = member.workspace
    return {
        **_workspace_out(workspace, user),
        "members": [_member_out(m) for m in sorted(workspace.members, key=lambda m: m.id)],
    }


@router.patch("/{workspace_id}", response_model=WorkspaceOut)
def update_workspace(
    workspace_id: int,
    payload: WorkspaceUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    ensure_role(db, workspace_id, user.id, MANAGER_ROLES)
    workspace = ensure_member(db, workspace_id, user.id).workspace
    workspace.name = payload.name
    db.commit()
    db.refresh(workspace)
    return _workspace_out(workspace, user)


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workspace(
    workspace_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    ensure_role(db, workspace_id, user.id, OWNER_ROLE)
    workspace = ensure_member(db, workspace_id, user.id).workspace
    if db.scalar(
        select(Project.id).where(Project.workspace_id == workspace_id).limit(1)
    ):
        raise HTTPException(
            status_code=400,
            detail="Cannot delete a workspace that still has projects",
        )
    db.delete(workspace)
    db.commit()


@router.get("/{workspace_id}/members", response_model=list[WorkspaceMemberOut])
def list_members(
    workspace_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict]:
    member = ensure_member(db, workspace_id, user.id)
    return [
        _member_out(m) for m in sorted(member.workspace.members, key=lambda m: m.id)
    ]


@router.patch("/{workspace_id}/members/{user_id}", response_model=WorkspaceMemberOut)
def update_member_role(
    workspace_id: int,
    user_id: int,
    payload: MemberRoleUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    ensure_role(db, workspace_id, user.id, MANAGER_ROLES)
    workspace = ensure_member(db, workspace_id, user.id).workspace
    if payload.role == "owner":
        raise HTTPException(
            status_code=400,
            detail="Use the transfer endpoint to change the workspace owner",
        )
    member = get_membership(db, workspace_id, user_id)
    if member is None:
        raise HTTPException(status_code=404, detail="Member not found")
    if member.user_id == workspace.owner_id:
        raise HTTPException(
            status_code=400, detail="Cannot change the workspace owner's role"
        )
    member.role = payload.role
    db.commit()
    db.refresh(member)
    return _member_out(member)


@router.delete("/{workspace_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    workspace_id: int,
    user_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    ensure_role(db, workspace_id, user.id, MANAGER_ROLES)
    workspace = ensure_member(db, workspace_id, user.id).workspace
    member = get_membership(db, workspace_id, user_id)
    if member is None:
        raise HTTPException(status_code=404, detail="Member not found")
    if member.user_id == workspace.owner_id:
        raise HTTPException(
            status_code=400, detail="Cannot remove the workspace owner"
        )
    db.delete(member)
    db.commit()


@router.post("/{workspace_id}/transfer", response_model=WorkspaceDetailOut)
def transfer_ownership(
    workspace_id: int,
    payload: TransferIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    ensure_role(db, workspace_id, user.id, OWNER_ROLE)
    workspace = ensure_member(db, workspace_id, user.id).workspace
    target = get_membership(db, workspace_id, payload.user_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Member not found")
    previous_owner = get_membership(db, workspace_id, workspace.owner_id)
    workspace.owner_id = payload.user_id
    target.role = "owner"
    if previous_owner is not None and previous_owner.role == "owner":
        previous_owner.role = "admin"
    db.commit()
    db.refresh(workspace)
    return {
        **_workspace_out(workspace, user),
        "members": [_member_out(m) for m in sorted(workspace.members, key=lambda m: m.id)],
    }


@router.post("/{workspace_id}/invites", response_model=InvitationOut, status_code=status.HTTP_201_CREATED)
def create_invite(
    workspace_id: int,
    payload: InviteCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    ensure_role(db, workspace_id, user.id, MANAGER_ROLES)
    member = get_membership(db, workspace_id, user.id)
    workspace = member.workspace
    if db.scalar(
        select(WorkspaceMember.id)
        .join(User, WorkspaceMember.user_id == User.id)
        .where(
            WorkspaceMember.workspace_id == workspace_id,
            User.email == payload.email,
        )
    ):
        raise HTTPException(status_code=409, detail="This user is already a member")
    if db.scalar(
        select(Invitation.id).where(
            Invitation.workspace_id == workspace_id,
            Invitation.email == payload.email,
            Invitation.accepted_at.is_(None),
        )
    ):
        raise HTTPException(status_code=409, detail="Invitation already pending for this email")
    invite = Invitation(
        workspace_id=workspace_id,
        email=str(payload.email),
        role=payload.role,
        token=secrets.token_urlsafe(24),
        created_by=user.id,
        expires_at=datetime.now(timezone.utc)
        + timedelta(minutes=settings.INVITE_EXPIRE_MINUTES),
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)
    return _invitation_out(invite)


@router.get("/{workspace_id}/invites", response_model=list[InvitationOut])
def list_invites(
    workspace_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict]:
    ensure_role(db, workspace_id, user.id, MANAGER_ROLES)
    invites = db.scalars(
        select(Invitation)
        .where(Invitation.workspace_id == workspace_id)
        .order_by(Invitation.created_at.desc())
    ).all()
    return [_invitation_out(i) for i in invites]


@router.delete("/{workspace_id}/invites/{token}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_invite(
    workspace_id: int,
    token: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    ensure_role(db, workspace_id, user.id, MANAGER_ROLES)
    invite = db.scalar(
        select(Invitation).where(
            Invitation.workspace_id == workspace_id, Invitation.token == token
        )
    )
    if invite is None:
        raise HTTPException(status_code=404, detail="Invitation not found")
    db.delete(invite)
    db.commit()


@invites_router.get("/{token}", response_model=InviteInfoOut)
def invite_info(token: str, db: Session = Depends(get_db)) -> dict:
    invite = _get_valid_invite(db, token)
    return {
        "workspace_name": invite.workspace.name,
        "email": invite.email,
        "role": invite.role,
    }


@invites_router.post("/{token}/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register_with_invite(
    token: str,
    payload: InviteRegister,
    db: Session = Depends(get_db),
) -> Token:
    invite = _get_valid_invite(db, token)
    if invite.email.lower() != payload.email.lower():
        raise HTTPException(
            status_code=400,
            detail="This invitation was sent to a different email address",
        )
    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing is not None:
        raise HTTPException(
            status_code=409,
            detail="Email already registered — log in and accept the invitation",
        )
    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
    )
    db.add(user)
    db.flush()
    db.add(
        WorkspaceMember(
            workspace_id=invite.workspace_id, user_id=user.id, role=invite.role
        )
    )
    invite.accepted_at = datetime.now(timezone.utc)
    db.commit()
    return Token(access_token=create_access_token(user.id))


@invites_router.post("/accept", response_model=WorkspaceDetailOut)
def accept_invite(
    payload: InviteAccept,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    invite = _get_valid_invite(db, payload.token)
    workspace = _accept(db, invite, user)
    return {
        **_workspace_out(workspace, user),
        "members": [_member_out(m) for m in sorted(workspace.members, key=lambda m: m.id)],
    }
