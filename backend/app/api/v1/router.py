from fastapi import APIRouter

from app.api.v1 import (
    auth,
    content,
    drafts,
    exports,
    notifications,
    projects,
    qa,
    review,
    style,
    translations,
    workspaces,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(projects.router)
api_router.include_router(content.router)
api_router.include_router(drafts.router)
api_router.include_router(review.router)
api_router.include_router(qa.router)
api_router.include_router(exports.router)
api_router.include_router(style.router)
api_router.include_router(translations.router)
api_router.include_router(workspaces.router)
api_router.include_router(workspaces.invites_router)
api_router.include_router(notifications.router)
