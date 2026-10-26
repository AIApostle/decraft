from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routes.auth import router as auth_router
from backend.api.routes.profile import router as profile_router
from backend.api.routes.projects import router as projects_router
from backend.core.config import Settings


def create_app(settings: Settings | None = None) -> FastAPI:
    app = FastAPI(title="Decraft API", version="0.1.0")
    app.state.settings = settings or Settings()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=app.state.settings.allowed_frontend_origins,
        allow_credentials=True,
        allow_methods=["DELETE", "GET", "OPTIONS", "PATCH", "POST"],
        allow_headers=["Content-Type"],
    )
    app.include_router(auth_router)
    app.include_router(profile_router)
    app.include_router(projects_router)

    @app.get("/health", tags=["health"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app
