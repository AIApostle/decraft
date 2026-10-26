from collections.abc import Sequence

from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send


class OriginAllowlistMiddleware:
    def __init__(self, app: ASGIApp, allowed_origins: Sequence[str]) -> None:
        self.app = app
        self.allowed_origins = frozenset(allowed_origins)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        origin = next(
            (value.decode("latin-1") for name, value in scope["headers"] if name == b"origin"),
            None,
        )
        if origin is not None and origin not in self.allowed_origins:
            response = JSONResponse(
                status_code=403,
                content={"detail": "This request origin is not allowed."},
            )
            await response(scope, receive, send)
            return

        await self.app(scope, receive, send)
