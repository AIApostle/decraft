import logging

import httpx
from fastapi import Depends, HTTPException, Request, Response, status
from supabase import Client
from supabase_auth.errors import AuthError

from backend.api.cookies import ACCESS_COOKIE, REFRESH_COOKIE, clear_session_cookies, set_session_cookies
from backend.api.dependencies.supabase import get_settings, get_supabase_client
from backend.core.config import Settings

logger = logging.getLogger(__name__)


def get_current_user(
    request: Request,
    response: Response,
    client: Client = Depends(get_supabase_client),
    settings: Settings = Depends(get_settings),
) -> object:
    access_token = request.cookies.get(ACCESS_COOKIE)
    refresh_token = request.cookies.get(REFRESH_COOKIE)
    if not access_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sign in to continue.")

    try:
        result = client.auth.get_user(access_token)
        user = result.user if result else None
    except AuthError:
        user = None
    except httpx.HTTPError:
        logger.exception("Supabase session validation failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="We couldn't verify your session. Try again.",
        ) from None

    if user is not None:
        client.postgrest.auth(access_token)
        request.state.access_token = access_token
        request.state.refresh_token = refresh_token
        return user
    if not refresh_token:
        clear_session_cookies(response, settings)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session has expired. Sign in again.",
        )

    try:
        refreshed = client.auth.refresh_session(refresh_token)
    except AuthError:
        clear_session_cookies(response, settings)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session has expired. Sign in again.",
        ) from None
    except httpx.HTTPError:
        logger.exception("Supabase session refresh failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="We couldn't verify your session. Try again.",
        ) from None

    if not refreshed.session or not refreshed.user:
        clear_session_cookies(response, settings)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session has expired. Sign in again.",
        )
    set_session_cookies(response, refreshed.session, settings)
    client.postgrest.auth(refreshed.session.access_token)
    request.state.access_token = refreshed.session.access_token
    request.state.refresh_token = refreshed.session.refresh_token
    return refreshed.user
