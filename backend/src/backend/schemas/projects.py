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


class ProfilePatchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    primary_craft: str | None = Field(default=None, max_length=80)
    city: str | None = Field(default=None, max_length=100)
    bio: str | None = Field(default=None, max_length=600)
    is_public: bool | None = None

    @field_validator("primary_craft", "city", "bio")
    @classmethod
    def trim_optional_text(cls, value: str | None) -> str | None:
        return value.strip() or None if value is not None else None


class ProfileResponse(BaseModel):
    id: str
    display_name: str
    profile_type: str
    primary_craft: str | None = None
    city: str | None = None
    bio: str | None = None
    is_public: bool


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
    owner_profile_id: str
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
    publication_status: str
    created_at: str
    published_at: str | None = None
    media_assets: list[MediaAssetResponse]
    updates: list[ProjectUpdateResponse]


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
    api_key: str
