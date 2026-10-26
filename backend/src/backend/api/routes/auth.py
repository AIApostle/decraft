import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from postgrest.exceptions import APIError
from supabase import Client
from supabase_auth.errors import AuthError, AuthWeakPasswordError

from backend.api.cookies import ACCESS_COOKIE, REFRESH_COOKIE, clear_session_cookies, set_session_cookies
from backend.api.dependencies.current_user import get_current_user
from backend.api.dependencies.supabase import get_settings, get_supabase_client
from backend.core.config import Settings
from backend.repositories.profiles import get_profile
from backend.schemas.auth import AuthResponse, LoginRequest, SignUpRequest
from backend.services.auth import sign_in, sign_out, sign_up, serialize_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def sign_up_route(
    payload: SignUpRequest,
    response: Response,
    client: Client = Depends(get_supabase_client),
    settings: Settings = Depends(get_settings),
) -> AuthResponse:
    try:
        result = sign_up(client, payload)
    except AuthWeakPasswordError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Choose a stronger password and try again.",
        ) from None
    except AuthError:
        logger.info("Supabase rejected a sign-up request")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="We couldn't create the account. Check the details and try again.",
        ) from None
    except httpx.HTTPError:
        logger.exception("Supabase sign-up request failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The account service is temporarily unavailable. Try again.",
        ) from None

    if result.user is None:
        logger.error("Supabase signup returned no user")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="We couldn't complete account creation. Please try again.",
        )
    if result.session is None:
        logger.error("Supabase signup returned no session; check email auto-confirm configuration")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Your account was created, but we couldn't sign you in. Please try signing in.",
        )

    set_session_cookies(response, result.session, settings)
    return AuthResponse(user=serialize_user(result.user))


@router.post("/login", response_model=AuthResponse)
def log_in(
    payload: LoginRequest,
    response: Response,
    client: Client = Depends(get_supabase_client),
    settings: Settings = Depends(get_settings),
) -> AuthResponse:
    try:
        result = sign_in(client, payload)
    except AuthError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email or password is incorrect.",
        ) from None
    except httpx.HTTPError:
        logger.exception("Supabase sign-in request failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The account service is temporarily unavailable. Try again.",
        ) from None

    if result.user is None or result.session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email or password is incorrect.",
        )

    set_session_cookies(response, result.session, settings)
    return AuthResponse(user=serialize_user(result.user))


@router.get("/me", response_model=AuthResponse)
def read_current_user(
    user: object = Depends(get_current_user),
    client: Client = Depends(get_supabase_client),
) -> AuthResponse:
    try:
        profile = get_profile(client, str(getattr(user, "id")))
    except (APIError, httpx.HTTPError):
        logger.exception("Supabase profile lookup failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="We couldn't load your account profile. Try again.",
        ) from None
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Your account profile has not been created.",
        )
    return AuthResponse(user=serialize_user(user, profile))


@router.post("/logout")
def log_out(
    request: Request,
    response: Response,
    client: Client = Depends(get_supabase_client),
    settings: Settings = Depends(get_settings),
) -> dict[str, bool]:
    access_token = request.cookies.get(ACCESS_COOKIE)
    refresh_token = request.cookies.get(REFRESH_COOKIE)

    try:
        if access_token and refresh_token:
            sign_out(client, access_token, refresh_token)
    except AuthError:
        clear_session_cookies(response, settings)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Your browser session was cleared, but the account service could not confirm sign-out.",
        ) from None
    except httpx.HTTPError:
        logger.exception("Supabase sign-out request failed")
        clear_session_cookies(response, settings)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Your browser session was cleared, but the account service could not confirm sign-out.",
        ) from None

    clear_session_cookies(response, settings)
    return {"ok": True}
