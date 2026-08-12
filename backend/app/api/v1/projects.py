from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("")
def list_projects() -> list[dict]:
    return []


@router.post("")
def create_project(payload: dict) -> dict:
    raise HTTPException(status_code=501, detail="Not implemented yet")
