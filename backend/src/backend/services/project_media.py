import logging
from collections.abc import Mapping, Sequence
from typing import Any

import httpx
from supabase import Client, create_client
from storage3.exceptions import StorageApiError

from backend.core.config import Settings

logger = logging.getLogger(__name__)
PROJECT_MEDIA_BUCKET = "project-media"


class MediaStorageConfigurationError(Exception):
    pass


class MediaSigningError(Exception):
    pass


def create_storage_admin_client(settings: Settings) -> Client:
    service_role_key = settings.supabase_service_role_key.get_secret_value()
    if not settings.supabase_url or not service_role_key:
        raise MediaStorageConfigurationError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to serve private project media."
        )
    return create_client(settings.supabase_url, service_role_key)


def create_tus_endpoint(supabase_url: str) -> str:
    from urllib.parse import urlsplit

    parsed = urlsplit(supabase_url)
    hostname = parsed.hostname
    if parsed.scheme == "https" and hostname and hostname.endswith(".supabase.co"):
        project_ref = hostname.removesuffix(".supabase.co")
        return f"https://{project_ref}.storage.supabase.co/storage/v1/upload/resumable"
    return f"{supabase_url.rstrip('/')}/storage/v1/upload/resumable"


def create_signed_media_urls(
    settings: Settings,
    media_assets: Sequence[Mapping[str, Any]],
) -> dict[str, str]:
    ready_assets = [
        asset
        for asset in media_assets
        if asset.get("processing_status") == "ready"
        and isinstance(asset.get("storage_path"), str)
    ]
    if not ready_assets:
        return {}

    try:
        client = create_storage_admin_client(settings)
        signed_urls = client.storage.from_(PROJECT_MEDIA_BUCKET).create_signed_urls(
            [str(asset["storage_path"]) for asset in ready_assets],
            expires_in=3600,
        )
    except (StorageApiError, httpx.HTTPError, OSError) as error:
        logger.exception("Supabase could not create project-media preview URLs")
        raise MediaSigningError("Project media could not be prepared for viewing.") from error

    urls: dict[str, str] = {}
    for signed in signed_urls:
        path = signed.get("path")
        url = signed.get("signedURL") or signed.get("signedUrl")
        error = signed.get("error")
        if error or not isinstance(path, str) or not isinstance(url, str):
            logger.error("Supabase returned an invalid signed URL for project media")
            raise MediaSigningError("Project media could not be prepared for viewing.")
        urls[path] = url
    return urls


def verify_uploaded_object(
    settings: Settings,
    storage_path: str,
    expected_size: int,
) -> None:
    try:
        client = create_storage_admin_client(settings)
        info = client.storage.from_(PROJECT_MEDIA_BUCKET).info(storage_path)
    except StorageApiError as error:
        if getattr(error, "status", None) == 404:
            raise FileNotFoundError(storage_path) from error
        logger.exception("Supabase could not verify an uploaded project-media object")
        raise MediaSigningError("The uploaded media could not be verified.") from error
    except httpx.HTTPError as error:
        logger.exception("Supabase could not verify an uploaded project-media object")
        raise MediaSigningError("The uploaded media could not be verified.") from error

    size = info.get("size")
    if size is None or int(size) != expected_size:
        logger.error("Uploaded project media size does not match its pending record")
        raise MediaSigningError("The uploaded media could not be verified.")
