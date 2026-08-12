from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/exports", tags=["exports"])


@router.post("/{item_id}")
def export_item(item_id: int, payload: dict) -> dict:
    raise HTTPException(status_code=501, detail="Not implemented yet")
