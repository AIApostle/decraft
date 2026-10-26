import logging
import mimetypes
import re
from pathlib import Path
from typing import Any, NoReturn
from uuid import UUID, uuid4

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from postgrest.exceptions import APIError
from storage3.exceptions import StorageApiError
from supabase import Client
from supabase_auth.errors import AuthError

from backend.api.dependencies.current_user import get_current_user
from backend.api.dependencies.supabase import get_settings, get_supabase_client
from backend.core.config import Settings
from backend.repositories.projects import (
    create_project_update,
    delete_media_asset,
    get_media_asset,
    get_project,
    get_profile_details,
    get_profile_contacts,
    get_project_by_slug,
    get_public_profile_by_slug,
    get_profiles_details,
    get_profiles_contacts,
    insert_media_asset,
    insert_project,
    list_media_assets,
    list_project_updates,
    list_projects,
    mark_media_asset_ready,
    publish_project,
    update_project,
)
from backend.schemas.projects import (
    MediaAssetResponse,
    ContactOptionsResponse,
    MediaSignRequest,
    MediaSignResponse,
    ProjectCreateRequest,
    ProjectPatchRequest,
    ProjectResponse,
    PublicProfileResponse,
    ProjectUpdateRequest,
    ProjectUpdateResponse,
)
from backend.services.project_media import (
    MediaStorageConfigurationError,
    MediaSigningError,
    PROJECT_MEDIA_BUCKET,
    create_signed_media_urls,
    create_storage_admin_client,
    create_tus_endpoint,
    verify_uploaded_object,
)
from backend.services.profile_avatar import (
    ProfileAvatarError,
    create_profile_avatar_url,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/projects", tags=["projects"])
_ALLOWED_MEDIA_TYPES = ("image/", "video/")


def _user_id(user: object) -> str:
    profile_id = getattr(user, "id", None)
    if not isinstance(profile_id, str):
        logger.error("Supabase returned a user without a valid profile ID")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="We couldn't verify your account. Try again.",
        )
    return profile_id


def _rows_for_projects(
    projects: list[dict[str, Any]],
    updates: list[dict[str, Any]],
    media_assets: list[dict[str, Any]],
    profiles: list[dict[str, Any]],
    contacts: list[dict[str, Any]],
    signed_urls: dict[str, str],
) -> list[ProjectResponse]:
    updates_by_project: dict[str, list[dict[str, Any]]] = {}
    media_by_project: dict[str, list[dict[str, Any]]] = {}
    media_by_update: dict[str, list[dict[str, Any]]] = {}
    profiles_by_id = {str(profile["id"]): profile for profile in profiles}
    contacts_by_profile_id = {
        str(contact["profile_id"]): contact for contact in contacts
    }

    for update in updates:
        updates_by_project.setdefault(str(update["project_id"]), []).append(update)
    for media in media_assets:
        project_id = str(media["project_id"])
        media_by_project.setdefault(project_id, []).append(media)
        update_id = media.get("project_update_id")
        if update_id:
            media_by_update.setdefault(str(update_id), []).append(media)

    serialized: list[ProjectResponse] = []
    for project in projects:
        project_id = str(project["id"])
        owner = profiles_by_id.get(str(project["owner_profile_id"]), {})
        contact = contacts_by_profile_id.get(str(project["owner_profile_id"]))
        contact_options = (
            ContactOptionsResponse(
                email=contact.get("email"),
                phone=contact.get("phone"),
                whatsapp=contact.get("whatsapp"),
            )
            if project.get("include_contact") and contact
            else None
        )
        if contact_options and not any(
            (contact_options.email, contact_options.phone, contact_options.whatsapp)
        ):
            contact_options = None

        def serialize_media(media: dict[str, Any]) -> MediaAssetResponse:
            path = str(media["storage_path"])
            return MediaAssetResponse(
                id=str(media["id"]),
                original_filename=str(media["original_filename"]),
                media_type=str(media["media_type"]),
                mime_type=str(media["mime_type"]),
                file_size_bytes=int(media["file_size_bytes"]),
                caption=media.get("caption"),
                sort_order=int(media["sort_order"]),
                processing_status=str(media["processing_status"]),
                signed_url=signed_urls.get(path),
                project_update_id=media.get("project_update_id"),
            )

        project_media = [
            serialize_media(media)
            for media in media_by_project.get(project_id, [])
            if not media.get("project_update_id")
            and media.get("processing_status") != "deleted"
        ]
        serialized_updates = [
            ProjectUpdateResponse(
                id=str(update["id"]),
                title=str(update["title"]),
                content=str(update["content"]),
                stage=str(update["stage"]),
                created_at=str(update["created_at"]),
                visibility=str(update["visibility"]),
                publication_status=str(update["publication_status"]),
                media_assets=[
                    serialize_media(media)
                    for media in media_by_update.get(str(update["id"]), [])
                    if media.get("processing_status") != "deleted"
                ],
            )
            for update in updates_by_project.get(project_id, [])
        ]

        serialized.append(
            ProjectResponse(
                id=project_id,
                slug=str(project["slug"]),
                owner_profile_id=str(project["owner_profile_id"]),
                owner_profile_slug=owner.get("slug"),
                owner_profile_public=bool(owner.get("is_public", False)),
                owner_name=owner.get("display_name"),
                owner_primary_craft=owner.get("primary_craft"),
                owner_city=owner.get("city"),
                owner_bio=owner.get("bio"),
                title=str(project["title"]),
                description=str(project["description"]),
                category=str(project.get("category_label") or "Craft"),
                location_label=project.get("location_label"),
                stage=str(project["stage"]),
                visibility=str(project["visibility"]),
                include_contact=bool(project.get("include_contact", False)),
                contact_options=contact_options,
                publication_status=str(project["publication_status"]),
                created_at=str(project["created_at"]),
                published_at=project.get("published_at"),
                media_assets=project_media,
                updates=serialized_updates,
            )
        )
    return serialized


def _serialize_projects(
    client: Client,
    settings: Settings,
    project_rows: list[Any],
    *,
    public_only: bool = False,
) -> list[ProjectResponse]:
    projects = [dict(row) for row in project_rows]
    if not projects:
        return []

    project_ids = [str(project["id"]) for project in projects]
    profile_ids = list({str(project["owner_profile_id"]) for project in projects})
    updates = [dict(row) for row in list_project_updates(client, project_ids)]
    assets = [dict(row) for row in list_media_assets(client, project_ids)]
    profiles = [dict(row) for row in get_profiles_details(client, profile_ids)]
    contacts = [
        dict(row) for row in get_profiles_contacts(client, profile_ids)
    ]

    if public_only:
        updates = [
            update
            for update in updates
            if update.get("visibility") == "public"
            and update.get("publication_status") == "published"
        ]
        visible_update_ids = {str(update["id"]) for update in updates}
        assets = [
            asset
            for asset in assets
            if asset.get("processing_status") == "ready"
            and (
                asset.get("project_update_id") is None
                or str(asset.get("project_update_id")) in visible_update_ids
            )
        ]

    signed_urls = create_signed_media_urls(settings, assets)
    return _rows_for_projects(projects, updates, assets, profiles, contacts, signed_urls)


def _map_database_failure(operation: str) -> NoReturn:
    logger.exception("Supabase project operation failed: %s", operation)
    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail="We couldn't save or load this project. Try again.",
    ) from None


@router.get("/share/{profile_slug}", response_model=PublicProfileResponse)
def read_public_profile(
    profile_slug: str,
    client: Client = Depends(get_supabase_client),
    settings: Settings = Depends(get_settings),
) -> PublicProfileResponse:
    try:
        profile = get_public_profile_by_slug(client, profile_slug)
        if profile is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="This public profile could not be found.",
            )
        project_rows = list_projects(
            client,
            owner_profile_id=str(profile["id"]),
            public_only=True,
        )
        projects = _serialize_projects(
            client,
            settings,
            [dict(row) for row in project_rows],
            public_only=True,
        )
        contact = get_profile_contacts(client, str(profile["id"]))
        contact_options = (
            ContactOptionsResponse(
                email=contact.get("email"),
                phone=contact.get("phone"),
                whatsapp=contact.get("whatsapp"),
            )
            if contact and contact.get("show_on_profile")
            else None
        )
        if contact_options and not any(
            (contact_options.email, contact_options.phone, contact_options.whatsapp)
        ):
            contact_options = None
        return PublicProfileResponse(
            id=str(profile["id"]),
            slug=str(profile["slug"]),
            display_name=str(profile["display_name"]),
            profile_type=str(profile["profile_type"]),
            primary_craft=profile.get("primary_craft"),
            city=profile.get("city"),
            bio=profile.get("bio"),
            avatar_url=create_profile_avatar_url(settings, profile.get("avatar_path")),
            contact_options=contact_options,
            projects=projects,
        )
    except HTTPException:
        raise
    except (
        APIError,
        httpx.HTTPError,
        StorageApiError,
        MediaSigningError,
        MediaStorageConfigurationError,
        ProfileAvatarError,
    ):
        logger.exception("Public profile lookup failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="We couldn't load this profile right now. Try again.",
        ) from None


@router.get("/share/{profile_slug}/{project_slug}", response_model=ProjectResponse)
def read_public_project(
    profile_slug: str,
    project_slug: str,
    client: Client = Depends(get_supabase_client),
    settings: Settings = Depends(get_settings),
) -> ProjectResponse:
    try:
        profile = get_public_profile_by_slug(client, profile_slug)
        if profile is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="This public project could not be found.",
            )
        project = get_project_by_slug(client, str(profile["id"]), project_slug)
        if project is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="This public project could not be found.",
            )
        return _serialize_projects(
            client,
            settings,
            [dict(project)],
            public_only=True,
        )[0]
    except HTTPException:
        raise
    except (
        APIError,
        httpx.HTTPError,
        StorageApiError,
        MediaSigningError,
        MediaStorageConfigurationError,
    ):
        logger.exception("Public project lookup failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="We couldn't load this project right now. Try again.",
        ) from None


@router.get("/discover", response_model=list[ProjectResponse])
def discover_projects(
    user: object = Depends(get_current_user),
    client: Client = Depends(get_supabase_client),
    settings: Settings = Depends(get_settings),
) -> list[ProjectResponse]:
    del user
    try:
        project_rows = list_projects(client, public_only=True)
        return _serialize_projects(client, settings, [dict(row) for row in project_rows], public_only=True)
    except (
        APIError,
        httpx.HTTPError,
        StorageApiError,
        MediaSigningError,
        MediaStorageConfigurationError,
    ):
        _map_database_failure("discover projects")


@router.get("", response_model=list[ProjectResponse])
def read_projects(
    user: object = Depends(get_current_user),
    client: Client = Depends(get_supabase_client),
    settings: Settings = Depends(get_settings),
) -> list[ProjectResponse]:
    try:
        project_rows = list_projects(client, owner_profile_id=_user_id(user))
        return _serialize_projects(client, settings, [dict(row) for row in project_rows])
    except (
        APIError,
        httpx.HTTPError,
        StorageApiError,
        MediaSigningError,
        MediaStorageConfigurationError,
    ):
        _map_database_failure("list projects")


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project_route(
    payload: ProjectCreateRequest,
    user: object = Depends(get_current_user),
    client: Client = Depends(get_supabase_client),
    settings: Settings = Depends(get_settings),
) -> ProjectResponse:
    try:
        project_id = uuid4()
        slug_base = re.sub(r"[^a-z0-9]+", "-", payload.title.lower()).strip("-")[:80] or "project"
        created = insert_project(
            client,
            {
                "id": str(project_id),
                "slug": f"{slug_base}-{project_id.hex[:8]}",
                "owner_profile_id": _user_id(user),
                "title": payload.title,
                "description": payload.description,
                "category_label": payload.category,
                "location_label": payload.location_label,
                "stage": payload.stage,
                "visibility": payload.visibility,
                "include_contact": payload.include_contact,
                "publication_status": "draft",
            },
        )
        if created is None:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="We couldn't create this project. Try again.",
            )
        return _serialize_projects(client, settings, [dict(created)])[0]
    except (
        APIError,
        httpx.HTTPError,
        StorageApiError,
        MediaSigningError,
        MediaStorageConfigurationError,
    ):
        _map_database_failure("create project")


@router.get("/{project_id}", response_model=ProjectResponse)
def read_project(
    project_id: UUID,
    user: object = Depends(get_current_user),
    client: Client = Depends(get_supabase_client),
    settings: Settings = Depends(get_settings),
) -> ProjectResponse:
    try:
        project = get_project(client, str(project_id))
        if project is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="This project could not be found.",
            )
        return _serialize_projects(client, settings, [dict(project)])[0]
    except (
        APIError,
        httpx.HTTPError,
        StorageApiError,
        MediaSigningError,
        MediaStorageConfigurationError,
    ):
        _map_database_failure("load project")


@router.patch("/{project_id}", response_model=ProjectResponse)
def edit_project(
    project_id: UUID,
    payload: ProjectPatchRequest,
    user: object = Depends(get_current_user),
    client: Client = Depends(get_supabase_client),
    settings: Settings = Depends(get_settings),
) -> ProjectResponse:
    values = payload.model_dump(exclude_unset=True)
    if not values:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Choose at least one project detail to update.",
        )
    if any(value is None for key, value in values.items() if key != "location_label"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Project details cannot be left blank.",
        )
    if "category" in values:
        values["category_label"] = values.pop("category")
    try:
        updated = update_project(client, str(project_id), _user_id(user), values)
        if updated is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="This project could not be found.",
            )
        return _serialize_projects(client, settings, [dict(updated)])[0]
    except (APIError, httpx.HTTPError, StorageApiError, MediaSigningError):
        _map_database_failure("update project")


@router.post("/{project_id}/publish", response_model=ProjectResponse)
def publish_project_route(
    project_id: UUID,
    user: object = Depends(get_current_user),
    client: Client = Depends(get_supabase_client),
    settings: Settings = Depends(get_settings),
) -> ProjectResponse:
    try:
        project = publish_project(client, str(project_id))
    except APIError as error:
        if getattr(error, "code", None) == "23514":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Make your profile visible to customers before publishing a project.",
            ) from None
        if getattr(error, "code", None) == "P0002":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="This project could not be found.",
            ) from None
        _map_database_failure("publish project")
    except (
        httpx.HTTPError,
        StorageApiError,
        MediaSigningError,
        MediaStorageConfigurationError,
    ):
        _map_database_failure("publish project")

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This project could not be found.",
        )
    return _serialize_projects(client, settings, [dict(project)])[0]


@router.post("/{project_id}/updates", response_model=ProjectUpdateResponse, status_code=status.HTTP_201_CREATED)
def add_project_update(
    project_id: UUID,
    payload: ProjectUpdateRequest,
    user: object = Depends(get_current_user),
    client: Client = Depends(get_supabase_client),
) -> ProjectUpdateResponse:
    try:
        project = get_project(client, str(project_id), owner_profile_id=_user_id(user))
        if project is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="This project could not be found.",
            )
        update = create_project_update(
            client,
            str(project_id),
            payload.title,
            payload.content,
            payload.stage,
        )
    except APIError as error:
        if getattr(error, "code", None) == "P0002":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="This project could not be found.",
            ) from None
        _map_database_failure("add project update")
    except (httpx.HTTPError, StorageApiError):
        _map_database_failure("add project update")

    if update is None:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="We couldn't add this progress update. Try again.",
        )
    return ProjectUpdateResponse(
        id=str(update["id"]),
        title=str(update["title"]),
        content=str(update["content"]),
        stage=str(update["stage"]),
        created_at=str(update["created_at"]),
        visibility=str(update["visibility"]),
        publication_status=str(update["publication_status"]),
        media_assets=[],
    )


@router.post("/{project_id}/media/sign", response_model=MediaSignResponse)
def sign_project_media_upload(
    project_id: UUID,
    payload: MediaSignRequest,
    request: Request,
    user: object = Depends(get_current_user),
    client: Client = Depends(get_supabase_client),
) -> MediaSignResponse:
    profile_id = _user_id(user)
    media_type = next(
        (kind for kind in _ALLOWED_MEDIA_TYPES if payload.mime_type.lower().startswith(kind)),
        None,
    )
    if media_type is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Choose an image or video file.",
        )

    project = get_project(client, str(project_id), owner_profile_id=profile_id)
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This project could not be found.",
        )
    if payload.project_update_id:
        update = (
            client.table("project_updates")
            .select("id")
            .eq("id", payload.project_update_id)
            .eq("project_id", str(project_id))
            .limit(1)
            .execute()
            .data
        )
        if not update:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="This progress update could not be found.",
            )

    media_id = uuid4()
    extension = Path(payload.filename).suffix.lower()
    if not re.fullmatch(r"\.[a-z0-9]{1,10}", extension):
        extension = mimetypes.guess_extension(payload.mime_type) or ""
    storage_path = f"{profile_id}/{project_id}/{media_id}{extension}"
    access_token = getattr(request.state, "access_token", None)
    refresh_token = getattr(request.state, "refresh_token", None)
    if not isinstance(access_token, str) or not isinstance(refresh_token, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sign in again before uploading media.",
        )

    try:
        client.auth.set_session(access_token, refresh_token)
        signed_upload = client.storage.from_(PROJECT_MEDIA_BUCKET).create_signed_upload_url(
            storage_path,
        )
        upload_token = signed_upload.get("token")
        if (
            not isinstance(upload_token, str)
            or len(upload_token.split(".")) != 3
            or any(not segment for segment in upload_token.split("."))
        ):
            logger.error("Supabase returned an invalid signed token for project media upload")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Supabase couldn't prepare a valid media upload token. Try again.",
            )
        asset = insert_media_asset(
            client,
            {
                "id": str(media_id),
                "owner_profile_id": profile_id,
                "project_id": str(project_id),
                "project_update_id": payload.project_update_id,
                "bucket_id": PROJECT_MEDIA_BUCKET,
                "storage_path": storage_path,
                "original_filename": payload.filename,
                "media_type": media_type[:-1],
                "mime_type": payload.mime_type,
                "file_size_bytes": payload.file_size_bytes,
                "caption": payload.caption,
                "processing_status": "uploading",
                "sort_order": payload.sort_order,
            },
        )
    except (APIError, AuthError, StorageApiError, httpx.HTTPError):
        _map_database_failure("prepare media upload")

    if asset is None:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="We couldn't prepare this upload. Try again.",
        )
    return MediaSignResponse(
        media_asset_id=str(media_id),
        bucket_id=PROJECT_MEDIA_BUCKET,
        storage_path=storage_path,
        upload_endpoint=create_tus_endpoint(request.app.state.settings.supabase_url),
        upload_token=upload_token,
    )


@router.post(
    "/{project_id}/media/{media_asset_id}/complete",
    response_model=MediaAssetResponse,
)
def complete_project_media_upload(
    project_id: UUID,
    media_asset_id: UUID,
    user: object = Depends(get_current_user),
    client: Client = Depends(get_supabase_client),
    settings: Settings = Depends(get_settings),
) -> MediaAssetResponse:
    try:
        asset = get_media_asset(
            client,
            str(media_asset_id),
            str(project_id),
            _user_id(user),
        )
        if asset is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="This media item could not be found.",
            )
        verify_uploaded_object(
            settings,
            str(asset["storage_path"]),
            int(asset["file_size_bytes"]),
        )
        ready = mark_media_asset_ready(client, str(media_asset_id), _user_id(user))
        if ready is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="This media item could not be found.",
            )
        signed_url = create_signed_media_urls(settings, [ready]).get(str(ready["storage_path"]))
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The upload is not complete yet. Try again when it finishes.",
        ) from None
    except (
        APIError,
        httpx.HTTPError,
        StorageApiError,
        MediaSigningError,
        MediaStorageConfigurationError,
    ):
        _map_database_failure("verify media upload")

    return MediaAssetResponse(
        id=str(ready["id"]),
        original_filename=str(ready["original_filename"]),
        media_type=str(ready["media_type"]),
        mime_type=str(ready["mime_type"]),
        file_size_bytes=int(ready["file_size_bytes"]),
        caption=ready.get("caption"),
        sort_order=int(ready["sort_order"]),
        processing_status=str(ready["processing_status"]),
        signed_url=signed_url,
        project_update_id=ready.get("project_update_id"),
    )


@router.delete("/{project_id}/media/{media_asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_project_media(
    project_id: UUID,
    media_asset_id: UUID,
    user: object = Depends(get_current_user),
    client: Client = Depends(get_supabase_client),
    settings: Settings = Depends(get_settings),
) -> Response:
    try:
        asset = get_media_asset(
            client,
            str(media_asset_id),
            str(project_id),
            _user_id(user),
        )
        if asset is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="This media item could not be found.",
            )
        storage = create_storage_admin_client(settings)
        storage.storage.from_(PROJECT_MEDIA_BUCKET).remove([str(asset["storage_path"])])
        delete_media_asset(client, str(media_asset_id), _user_id(user))
    except (APIError, StorageApiError, httpx.HTTPError, MediaStorageConfigurationError):
        _map_database_failure("remove project media")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
