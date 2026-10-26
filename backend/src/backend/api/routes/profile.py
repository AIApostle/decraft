import logging
from collections.abc import Mapping
from typing import Any

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from postgrest.exceptions import APIError
from supabase import Client

from backend.api.dependencies.current_user import get_current_user
from backend.api.dependencies.supabase import get_settings, get_supabase_client
from backend.core.config import Settings
from backend.repositories.projects import get_profile_details, update_profile
from backend.schemas.projects import ProfilePatchRequest, ProfileResponse
from backend.services.profile_avatar import (
    MAX_PROFILE_AVATAR_BYTES,
    ProfileAvatarError,
    create_profile_avatar_url,
    delete_profile_avatar,
    upload_profile_avatar,
)
from backend.services.project_media import MediaStorageConfigurationError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/profile", tags=["profile"])


def _profile_response(profile: Mapping[str, Any], settings: Settings) -> ProfileResponse:
    try:
        avatar_url = create_profile_avatar_url(settings, profile.get("avatar_path"))
    except (ProfileAvatarError, MediaStorageConfigurationError):
        logger.exception("Profile photo lookup failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="We couldn't load your profile photo. Try again.",
        ) from None
    return ProfileResponse(**profile, avatar_url=avatar_url)


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
    settings: Settings = Depends(get_settings),
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
    return _profile_response(profile, settings)


@router.patch("", response_model=ProfileResponse)
def save_profile(
    payload: ProfilePatchRequest,
    user: object = Depends(get_current_user),
    client: Client = Depends(get_supabase_client),
    settings: Settings = Depends(get_settings),
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
    if values.get("slug") is None and "slug" in values:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Choose a profile username.",
        )
    try:
        profile = update_profile(client, _profile_id(user), values)
    except APIError as error:
        if getattr(error, "code", None) == "23505" and "slug" in values:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="That Decraft username is already in use. Choose another one.",
            ) from None
        logger.exception("Supabase profile update failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="We couldn't save your profile settings. Try again.",
        ) from None
    except httpx.HTTPError:
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
    return _profile_response(profile, settings)


@router.post("/avatar", response_model=ProfileResponse)
def upload_avatar(
    file: UploadFile = File(...),
    user: object = Depends(get_current_user),
    client: Client = Depends(get_supabase_client),
    settings: Settings = Depends(get_settings),
) -> ProfileResponse:
    profile_id = _profile_id(user)
    try:
        current_profile = get_profile_details(client, profile_id)
    except (APIError, httpx.HTTPError):
        logger.exception("Supabase profile lookup failed before avatar upload")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="We couldn't load your profile. Try again.",
        ) from None
    if current_profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Your account profile has not been created.",
        )

    content_type = file.content_type
    if not isinstance(content_type, str) or content_type not in {"image/jpeg", "image/png"}:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Choose a JPEG or PNG image.",
        )
    try:
        content = file.file.read(MAX_PROFILE_AVATAR_BYTES + 1)
    except OSError:
        logger.exception("Profile photo could not be read")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="We couldn't read that profile photo. Choose it again and try.",
        ) from None
    try:
        new_path = upload_profile_avatar(settings, profile_id, content_type, content)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(error),
        ) from None
    except (ProfileAvatarError, MediaStorageConfigurationError):
        logger.exception("Profile photo upload failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="We couldn't upload your profile photo. Try again.",
        ) from None

    try:
        updated_profile = update_profile(client, profile_id, {"avatar_path": new_path})
    except (APIError, httpx.HTTPError):
        logger.exception("Supabase could not save the uploaded profile photo path")
        delete_profile_avatar(settings, new_path)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Your photo uploaded but couldn't be saved to your profile. Try again.",
        ) from None
    if updated_profile is None:
        delete_profile_avatar(settings, new_path)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Your account profile has not been created.",
        )

    old_path = current_profile.get("avatar_path")
    if isinstance(old_path, str) and old_path != new_path:
        delete_profile_avatar(settings, old_path)
    return _profile_response(updated_profile, settings)
