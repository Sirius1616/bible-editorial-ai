from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/qa", tags=["qa"])


@router.post("/{item_id}/run")
def run_qa(item_id: int) -> dict:
    raise HTTPException(status_code=501, detail="Not implemented yet")
