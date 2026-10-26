from fastapi import Response

from backend.core.config import Settings

ACCESS_COOKIE = "decraft_access"
REFRESH_COOKIE = "decraft_refresh"
COOKIE_PATH = "/api/v1"
LEGACY_COOKIE_PATH = "/api/v1/auth"
REFRESH_MAX_AGE = 60 * 60 * 24 * 30


def _cookie_options(settings: Settings, path: str) -> dict[str, object]:
    return {
        "httponly": True,
        "secure": settings.auth_cookie_secure,
        "samesite": settings.auth_cookie_samesite,
        "path": path,
    }


def _clear_legacy_session_cookies(response: Response, settings: Settings) -> None:
    options = _cookie_options(settings, LEGACY_COOKIE_PATH)
    response.delete_cookie(ACCESS_COOKIE, **options)
    response.delete_cookie(REFRESH_COOKIE, **options)


def set_session_cookies(response: Response, session: object, settings: Settings) -> None:
    access_token = getattr(session, "access_token")
    refresh_token = getattr(session, "refresh_token")
    access_max_age = getattr(session, "expires_in", 3600) or 3600
    _clear_legacy_session_cookies(response, settings)
    options = _cookie_options(settings, COOKIE_PATH)
    response.set_cookie(ACCESS_COOKIE, access_token, max_age=access_max_age, **options)
    response.set_cookie(REFRESH_COOKIE, refresh_token, max_age=REFRESH_MAX_AGE, **options)


def clear_session_cookies(response: Response, settings: Settings) -> None:
    options = _cookie_options(settings, COOKIE_PATH)
    response.delete_cookie(ACCESS_COOKIE, **options)
    response.delete_cookie(REFRESH_COOKIE, **options)
    _clear_legacy_session_cookies(response, settings)
