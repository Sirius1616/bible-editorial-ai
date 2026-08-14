from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import InvalidTokenError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import get_db
from app.models.project import Project, ProjectMember
from app.models.user import User
from app.models.workspace import WorkspaceMember

bearer_scheme = HTTPBearer(auto_error=False)

EDITOR_ROLES = {"owner", "admin", "member"}
MANAGER_ROLES = {"owner", "admin"}
OWNER_ROLE = {"owner"}

PROJECT_ADMIN_ROLES = {"admin"}
PROJECT_EDIT_ROLES = {"admin", "editor"}
PROJECT_REVIEW_ROLES = {"admin", "reviewer"}
PROJECT_COMMENT_ROLES = {"admin", "editor", "reviewer", "proofreader"}
PROJECT_EXPORT_ROLES = {"admin", "editor"}

WORKSPACE_ROLE_FALLBACK = {
    "owner": "admin",
    "admin": "admin",
    "member": "editor",
    "viewer": "viewer",
}


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    try:
        user_id = decode_token(credentials.credentials)
    except InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user


def get_membership(db: Session, workspace_id: int, user_id: int) -> WorkspaceMember | None:
    return db.scalar(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id,
        )
    )


def ensure_member(db: Session, workspace_id: int, user_id: int) -> WorkspaceMember:
    member = get_membership(db, workspace_id, user_id)
    if member is None:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return member


def ensure_role(
    db: Session, workspace_id: int, user_id: int, allowed: set[str]
) -> WorkspaceMember:
    member = ensure_member(db, workspace_id, user_id)
    if member.role not in allowed:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return member


def ensure_editor(db: Session, workspace_id: int, user_id: int) -> WorkspaceMember:
    return ensure_role(db, workspace_id, user_id, EDITOR_ROLES)


def get_project_membership(
    db: Session, project_id: int, user_id: int
) -> ProjectMember | None:
    return db.scalar(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
    )


def get_effective_project_role(db: Session, project: Project, user: User) -> str:
    membership = get_project_membership(db, project.id, user.id)
    if membership is not None:
        return membership.role
    if project.workspace_id is None:
        return "admin"
    workspace_member = get_membership(db, project.workspace_id, user.id)
    if workspace_member is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return WORKSPACE_ROLE_FALLBACK.get(workspace_member.role, "viewer")


def ensure_project_role(
    db: Session, project: Project, user: User, allowed: set[str]
) -> str:
    role = get_effective_project_role(db, project, user)
    if role not in allowed:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return role
