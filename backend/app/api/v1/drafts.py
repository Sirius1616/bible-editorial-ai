from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/drafts", tags=["drafts"])


@router.post("")
def generate_draft(payload: dict) -> dict:
    raise HTTPException(status_code=501, detail="Not implemented yet")
