from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import EDITOR_ROLES, ensure_editor, ensure_member, get_current_user
from app.db.session import get_db
from app.models.project import Project
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember
from app.schemas.project import ProjectCreate, ProjectOut, ProjectUpdate

router = APIRouter(prefix="/projects", tags=["projects"])


def get_accessible_project(project_id: int, user: User, db: Session) -> Project:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    ensure_member(db, project.workspace_id, user.id)
    return project


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
) -> list[Project]:
    workspace_ids = db.scalars(
        select(WorkspaceMember.workspace_id).where(WorkspaceMember.user_id == user.id)
    ).all()
    return list(
        db.scalars(
            select(Project).where(Project.workspace_id.in_(workspace_ids))
        )
    )


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Project:
    if payload.workspace_id is None:
        workspace = default_workspace(db, user)
    else:
        ensure_editor(db, payload.workspace_id, user.id)
        workspace = db.get(Workspace, payload.workspace_id)
    data = payload.model_dump(exclude={"workspace_id"})
    project = Project(**data, owner_id=user.id, workspace_id=workspace.id)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(
    project_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Project:
    return get_accessible_project(project_id, user, db)


@router.patch("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: int,
    payload: ProjectUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Project:
    project = get_accessible_project(project_id, user, db)
    ensure_editor(db, project.workspace_id, user.id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    project = get_accessible_project(project_id, user, db)
    ensure_editor(db, project.workspace_id, user.id)
    db.delete(project)
    db.commit()
