from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import (
    PROJECT_ADMIN_ROLES,
    ensure_editor,
    ensure_member,
    ensure_project_role,
    get_current_user,
    get_effective_project_role,
    get_membership,
    get_project_membership,
)
from app.db.session import get_db
from app.models.project import Project, ProjectMember
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember
from app.schemas.project import (
    ProjectCreate,
    ProjectMemberAdd,
    ProjectMemberOut,
    ProjectMemberRoleUpdate,
    ProjectOut,
    ProjectUpdate,
)

router = APIRouter(prefix="/projects", tags=["projects"])


def get_accessible_project(project_id: int, user: User, db: Session) -> Project:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    ensure_member(db, project.workspace_id, user.id)
    return project


def _project_out(project: Project, user: User, db: Session) -> dict:
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "translation": project.translation,
        "style_guide": project.style_guide,
        "owner_id": project.owner_id,
        "workspace_id": project.workspace_id,
        "workspace_name": project.workspace_name,
        "created_at": project.created_at,
        "member_count": project.member_count,
        "my_role": get_effective_project_role(db, project, user),
    }


def _member_out(member: ProjectMember) -> dict:
    return {
        "id": member.id,
        "user_id": member.user_id,
        "role": member.role,
        "email": member.user.email,
        "full_name": member.user.full_name,
        "created_at": member.created_at,
    }


def _ensure_admin_remains(db: Session, project: Project, user: User) -> None:
    admins = db.scalars(
        select(ProjectMember).where(
            ProjectMember.project_id == project.id,
            ProjectMember.role == "admin",
        )
    ).all()
    if len(admins) == 1 and admins[0].user_id == user.id:
        raise HTTPException(
            status_code=400,
            detail="You are the only admin. Promote another member before changing your role.",
        )


def default_workspace(db: Session, user: User) -> Workspace:
    owned = db.scalar(
        select(Workspace)
        .join(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
        .where(WorkspaceMember.user_id == user.id, WorkspaceMember.role == "owner")
        .order_by(Workspace.id)
    )
    if owned is not None:
        return owned
    fallback = db.scalar(
        select(Workspace)
        .join(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
        .where(WorkspaceMember.user_id == user.id)
        .order_by(Workspace.id)
    )
    if fallback is None:
        raise HTTPException(status_code=400, detail="No workspace available")
    return fallback


@router.get("", response_model=list[ProjectOut])
def list_projects(
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> list[dict]:
    workspace_ids = db.scalars(
        select(WorkspaceMember.workspace_id).where(WorkspaceMember.user_id == user.id)
    ).all()
    projects = db.scalars(
        select(Project).where(Project.workspace_id.in_(workspace_ids))
    ).all()
    return [_project_out(p, user, db) for p in projects]


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    if payload.workspace_id is None:
        workspace = default_workspace(db, user)
    else:
        ensure_editor(db, payload.workspace_id, user.id)
        workspace = db.get(Workspace, payload.workspace_id)
    data = payload.model_dump(exclude={"workspace_id"})
    project = Project(**data, owner_id=user.id, workspace_id=workspace.id)
    db.add(project)
    db.flush()
    db.add(ProjectMember(project_id=project.id, user_id=user.id, role="admin"))
    db.commit()
    db.refresh(project)
    return _project_out(project, user, db)


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(
    project_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    project = get_accessible_project(project_id, user, db)
    return _project_out(project, user, db)


@router.patch("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: int,
    payload: ProjectUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    project = get_accessible_project(project_id, user, db)
    ensure_project_role(db, project, user, PROJECT_ADMIN_ROLES)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    return _project_out(project, user, db)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    project = get_accessible_project(project_id, user, db)
    ensure_project_role(db, project, user, PROJECT_ADMIN_ROLES)
    db.delete(project)
    db.commit()


@router.get("/{project_id}/members", response_model=list[ProjectMemberOut])
def list_project_members(
    project_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict]:
    get_accessible_project(project_id, user, db)
    members = db.scalars(
        select(ProjectMember)
        .where(ProjectMember.project_id == project_id)
        .order_by(ProjectMember.id)
    ).all()
    return [_member_out(m) for m in members]


@router.post("/{project_id}/members", response_model=ProjectMemberOut, status_code=status.HTTP_201_CREATED)
def add_project_member(
    project_id: int,
    payload: ProjectMemberAdd,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    project = get_accessible_project(project_id, user, db)
    ensure_project_role(db, project, user, PROJECT_ADMIN_ROLES)
    if get_membership(db, project.workspace_id, payload.user_id) is None:
        raise HTTPException(
            status_code=400,
            detail="User is not a member of this workspace",
        )
    if get_project_membership(db, project_id, payload.user_id) is not None:
        raise HTTPException(status_code=409, detail="User is already a project member")
    member = ProjectMember(
        project_id=project_id, user_id=payload.user_id, role=payload.role
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return _member_out(member)


@router.patch("/{project_id}/members/{user_id}", response_model=ProjectMemberOut)
def update_project_member_role(
    project_id: int,
    user_id: int,
    payload: ProjectMemberRoleUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    project = get_accessible_project(project_id, user, db)
    ensure_project_role(db, project, user, PROJECT_ADMIN_ROLES)
    member = get_project_membership(db, project_id, user_id)
    if member is None:
        raise HTTPException(status_code=404, detail="Project member not found")
    if member.user_id == user.id and payload.role != "admin":
        _ensure_admin_remains(db, project, user)
    member.role = payload.role
    db.commit()
    db.refresh(member)
    return _member_out(member)


@router.delete("/{project_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_project_member(
    project_id: int,
    user_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    project = get_accessible_project(project_id, user, db)
    ensure_project_role(db, project, user, PROJECT_ADMIN_ROLES)
    member = get_project_membership(db, project_id, user_id)
    if member is None:
        raise HTTPException(status_code=404, detail="Project member not found")
    if member.user_id == user.id:
        _ensure_admin_remains(db, project, user)
    db.delete(member)
    db.commit()
