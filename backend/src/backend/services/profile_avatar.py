import logging
from uuid import uuid4

import httpx
from storage3.exceptions import StorageApiError
from supabase import Client, create_client

from backend.core.config import Settings
from backend.services.project_media import MediaStorageConfigurationError

logger = logging.getLogger(__name__)
PROFILE_AVATAR_BUCKET = "profile-avatars"
MAX_PROFILE_AVATAR_BYTES = 5 * 1024 * 1024
_IMAGE_TYPES = {
    "image/jpeg": ("jpg", b"\xff\xd8\xff"),
    "image/png": ("png", b"\x89PNG\r\n\x1a\n"),
}


class ProfileAvatarError(Exception):
    pass


def _storage_client(settings: Settings) -> Client:
    service_role_key = settings.supabase_service_role_key.get_secret_value()
    if not settings.supabase_url or not service_role_key:
        raise MediaStorageConfigurationError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for profile photos."
        )
    return create_client(settings.supabase_url, service_role_key)


def _image_extension(content_type: str, content: bytes) -> str:
    image_type = _IMAGE_TYPES.get(content_type)
    if image_type is None or not content.startswith(image_type[1]):
        raise ValueError("Choose a valid JPEG or PNG image.")
    return image_type[0]


def upload_profile_avatar(
    settings: Settings,
    profile_id: str,
    content_type: str,
    content: bytes,
) -> str:
    if not content or len(content) > MAX_PROFILE_AVATAR_BYTES:
        raise ValueError("Profile photos must be smaller than 5 MB.")
    extension = _image_extension(content_type, content)
    storage_path = f"{profile_id}/{uuid4().hex}.{extension}"
    try:
        _storage_client(settings).storage.from_(PROFILE_AVATAR_BUCKET).upload(
            storage_path,
            content,
            {"content-type": content_type, "cache-control": "3600"},
        )
    except (StorageApiError, httpx.HTTPError, OSError) as error:
        logger.exception("Supabase profile photo upload failed")
        raise ProfileAvatarError("We couldn't upload your profile photo. Try again.") from error
    return storage_path


def create_profile_avatar_url(settings: Settings, storage_path: str | None) -> str | None:
    if not storage_path:
        return None
    try:
        result = _storage_client(settings).storage.from_(PROFILE_AVATAR_BUCKET).create_signed_url(
            storage_path,
            expires_in=3600,
        )
    except (StorageApiError, httpx.HTTPError, OSError) as error:
        logger.exception("Supabase could not sign a profile photo URL")
        raise ProfileAvatarError("The profile photo could not be loaded. Try again.") from error
    url = result.get("signedURL") or result.get("signedUrl")
    if not isinstance(url, str) or not url:
        logger.error("Supabase returned an invalid signed profile photo URL")
        raise ProfileAvatarError("The profile photo could not be loaded. Try again.")
    return url


def delete_profile_avatar(settings: Settings, storage_path: str) -> None:
    try:
        _storage_client(settings).storage.from_(PROFILE_AVATAR_BUCKET).remove([storage_path])
    except (StorageApiError, httpx.HTTPError, OSError):
        logger.exception("Supabase could not remove a replaced profile photo")
