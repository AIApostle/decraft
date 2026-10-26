import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

ProjectStage = Literal["planned", "in_progress", "completed"]
ProjectVisibility = Literal["private", "public", "client_only"]


class ProjectCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    description: str = Field(min_length=1, max_length=20000)
    category: str = Field(min_length=1, max_length=80)
    location_label: str | None = Field(default=None, max_length=100)
    stage: ProjectStage = "planned"
    visibility: Literal["private", "public"] = "private"
    include_contact: bool = False

    @field_validator("title", "description", "category")
    @classmethod
    def trim_required_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("This field cannot be blank.")
        return cleaned

    @field_validator("location_label")
    @classmethod
    def trim_location(cls, value: str | None) -> str | None:
        return value.strip() or None if value is not None else None


class ProjectUpdateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    content: str = Field(min_length=1, max_length=20000)
    stage: ProjectStage

    @field_validator("title", "content")
    @classmethod
    def trim_required_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("This field cannot be blank.")
        return cleaned


class ProjectPatchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = Field(default=None, min_length=1, max_length=20000)
    category: str | None = Field(default=None, min_length=1, max_length=80)
    location_label: str | None = Field(default=None, max_length=100)
    stage: ProjectStage | None = None
    visibility: ProjectVisibility | None = None
    include_contact: bool | None = None


class ProfilePatchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    slug: str | None = Field(
        default=None,
        min_length=3,
        max_length=40,
        pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$",
    )
    primary_craft: str | None = Field(default=None, max_length=80)
    city: str | None = Field(default=None, max_length=100)
    bio: str | None = Field(default=None, max_length=600)
    is_public: bool | None = None
    contact_email: str | None = Field(default=None, max_length=254)
    contact_phone: str | None = Field(default=None, max_length=40)
    contact_whatsapp: str | None = Field(default=None, max_length=40)
    show_contact_on_profile: bool | None = None

    @field_validator("primary_craft", "city", "bio", "contact_email", "contact_phone", "contact_whatsapp")
    @classmethod
    def trim_optional_text(cls, value: str | None) -> str | None:
        return value.strip() or None if value is not None else None

    @field_validator("contact_email")
    @classmethod
    def validate_contact_email(cls, value: str | None) -> str | None:
        if value is not None and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value):
            raise ValueError("Enter a valid contact email address.")
        return value


class ContactOptionsResponse(BaseModel):
    email: str | None = None
    phone: str | None = None
    whatsapp: str | None = None


class ProfileResponse(BaseModel):
    id: str
    slug: str
    display_name: str
    profile_type: str
    primary_craft: str | None = None
    city: str | None = None
    bio: str | None = None
    is_public: bool
    avatar_url: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    contact_whatsapp: str | None = None
    show_contact_on_profile: bool = False


class MediaAssetResponse(BaseModel):
    id: str
    original_filename: str
    media_type: str
    mime_type: str
    file_size_bytes: int
    caption: str | None = None
    sort_order: int
    processing_status: str
    signed_url: str | None = None
    project_update_id: str | None = None


class ProjectUpdateResponse(BaseModel):
    id: str
    title: str
    content: str
    stage: ProjectStage
    created_at: str
    visibility: ProjectVisibility
    publication_status: str
    media_assets: list[MediaAssetResponse]


class ProjectResponse(BaseModel):
    id: str
    slug: str
    owner_profile_id: str
    owner_profile_slug: str | None = None
    owner_profile_public: bool = False
    owner_name: str | None = None
    owner_primary_craft: str | None = None
    owner_city: str | None = None
    owner_bio: str | None = None
    title: str
    description: str
    category: str
    location_label: str | None = None
    stage: ProjectStage
    visibility: ProjectVisibility
    include_contact: bool = False
    contact_options: ContactOptionsResponse | None = None
    publication_status: str
    created_at: str
    published_at: str | None = None
    media_assets: list[MediaAssetResponse]
    updates: list[ProjectUpdateResponse]


class PublicProfileResponse(BaseModel):
    id: str
    slug: str
    display_name: str
    profile_type: str
    primary_craft: str | None = None
    city: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
    contact_options: ContactOptionsResponse | None = None
    projects: list[ProjectResponse]


class MediaSignRequest(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
    mime_type: str = Field(min_length=1, max_length=255)
    file_size_bytes: int = Field(gt=0)
    caption: str | None = Field(default=None, max_length=240)
    project_update_id: str | None = None
    sort_order: int = Field(default=0, ge=0)

    @field_validator("filename", "mime_type")
    @classmethod
    def trim_required_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("This field cannot be blank.")
        return cleaned

    @field_validator("caption")
    @classmethod
    def trim_caption(cls, value: str | None) -> str | None:
        return value.strip() or None if value is not None else None


class MediaSignResponse(BaseModel):
    media_asset_id: str
    bucket_id: str
    storage_path: str
    upload_endpoint: str
    upload_token: str
