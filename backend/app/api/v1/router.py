from fastapi import APIRouter

from app.api.v1 import drafts, exports, projects, qa, review

api_router = APIRouter()
api_router.include_router(projects.router)
api_router.include_router(drafts.router)
api_router.include_router(review.router)
api_router.include_router(qa.router)
api_router.include_router(exports.router)
