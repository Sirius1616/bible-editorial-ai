from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/review", tags=["review"])


@router.post("/{item_id}/approve")
def approve_item(item_id: int) -> dict:
    raise HTTPException(status_code=501, detail="Not implemented yet")
