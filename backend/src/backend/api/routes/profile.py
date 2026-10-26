import logging
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from postgrest.exceptions import APIError
from supabase import Client

from backend.api.dependencies.current_user import get_current_user
from backend.api.dependencies.supabase import get_supabase_client
from backend.repositories.projects import get_profile_details, update_profile
from backend.schemas.projects import ProfilePatchRequest, ProfileResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/profile", tags=["profile"])


def _profile_id(user: object) -> str:
    profile_id = getattr(user, "id", None)
    if not isinstance(profile_id, str):
        logger.error("Supabase returned a user without a valid profile ID")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="We couldn't verify your account profile. Try again.",
        )
    return profile_id


@router.get("", response_model=ProfileResponse)
def read_profile(
    user: object = Depends(get_current_user),
    client: Client = Depends(get_supabase_client),
) -> ProfileResponse:
    try:
        profile = get_profile_details(client, _profile_id(user))
    except (APIError, httpx.HTTPError):
        logger.exception("Supabase profile details lookup failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="We couldn't load your profile settings. Try again.",
        ) from None
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Your account profile has not been created.",
        )
    return ProfileResponse(**profile)


@router.patch("", response_model=ProfileResponse)
def save_profile(
    payload: ProfilePatchRequest,
    user: object = Depends(get_current_user),
    client: Client = Depends(get_supabase_client),
) -> ProfileResponse:
    values: dict[str, Any] = payload.model_dump(exclude_unset=True)
    if not values:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Choose at least one profile setting to save.",
        )
    if values.get("is_public") is None and "is_public" in values:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Choose whether your profile is visible to customers.",
        )
    try:
        profile = update_profile(client, _profile_id(user), values)
    except (APIError, httpx.HTTPError):
        logger.exception("Supabase profile update failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="We couldn't save your profile settings. Try again.",
        ) from None
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Your account profile has not been created.",
        )
    return ProfileResponse(**profile)
