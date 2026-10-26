from collections.abc import Mapping
from typing import Any

from supabase import Client

from backend.schemas.auth import AuthUserResponse, LoginRequest, ProfileResponse, SignUpRequest


def sign_up(client: Client, payload: SignUpRequest):
    return client.auth.sign_up(
        {
            "email": str(payload.email),
            "password": payload.password,
            "options": {
                "data": {
                    "display_name": payload.display_name,
                    "profile_type": payload.profile_type,
                }
            },
        }
    )


def sign_in(client: Client, payload: LoginRequest):
    return client.auth.sign_in_with_password(
        {"email": str(payload.email), "password": payload.password}
    )


def sign_out(client: Client, access_token: str, refresh_token: str) -> None:
    client.auth.set_session(access_token, refresh_token)
    client.auth.sign_out()


def serialize_user(
    user: object,
    profile: Mapping[str, Any] | None = None,
) -> AuthUserResponse:
    metadata = getattr(user, "user_metadata", None) or {}
    profile_data = profile or metadata
    profile_type = profile_data.get("profile_type", "individual")
    if profile_type not in {"individual", "workshop", "business"}:
        profile_type = "individual"
    return AuthUserResponse(
        id=str(getattr(user, "id")),
        email=getattr(user, "email", None),
        profile=ProfileResponse(
            display_name=str(profile_data.get("display_name") or ""),
            profile_type=profile_type,
        ),
    )
