from collections.abc import Mapping, Sequence
from typing import Any

from supabase import Client


def _mapping(value: object) -> Mapping[str, Any] | None:
    return value if isinstance(value, Mapping) else None


def _rows(value: object) -> list[Mapping[str, Any]]:
    if not isinstance(value, Sequence) or isinstance(value, (str, bytes)):
        return []
    return [row for item in value if (row := _mapping(item)) is not None]


def list_projects(
    client: Client,
    *,
    owner_profile_id: str | None = None,
    public_only: bool = False,
) -> list[Mapping[str, Any]]:
    query = client.table("projects").select("*").order("updated_at", desc=True).limit(100)
    if owner_profile_id is not None:
        query = query.eq("owner_profile_id", owner_profile_id)
    if public_only:
        query = query.eq("visibility", "public").eq("publication_status", "published")
    return _rows(query.execute().data)


def get_project(
    client: Client,
    project_id: str,
    *,
    owner_profile_id: str | None = None,
) -> Mapping[str, Any] | None:
    query = client.table("projects").select("*").eq("id", project_id)
    if owner_profile_id is not None:
        query = query.eq("owner_profile_id", owner_profile_id)
    result = query.limit(1).execute()
    rows = _rows(result.data)
    return rows[0] if rows else None


def get_project_by_slug(
    client: Client,
    owner_profile_id: str,
    slug: str,
) -> Mapping[str, Any] | None:
    result = (
        client.table("projects")
        .select("*")
        .eq("owner_profile_id", owner_profile_id)
        .eq("slug", slug)
        .eq("visibility", "public")
        .eq("publication_status", "published")
        .limit(1)
        .execute()
    )
    rows = _rows(result.data)
    return rows[0] if rows else None


def list_project_updates(
    client: Client,
    project_ids: list[str],
) -> list[Mapping[str, Any]]:
    if not project_ids:
        return []
    result = (
        client.table("project_updates")
        .select("*")
        .in_("project_id", project_ids)
        .order("created_at")
        .execute()
    )
    return _rows(result.data)


def list_media_assets(
    client: Client,
    project_ids: list[str],
) -> list[Mapping[str, Any]]:
    if not project_ids:
        return []
    result = (
        client.table("media_assets")
        .select("*")
        .in_("project_id", project_ids)
        .order("sort_order")
        .order("created_at")
        .execute()
    )
    return _rows(result.data)


def insert_project(client: Client, values: Mapping[str, Any]) -> Mapping[str, Any] | None:
    result = client.table("projects").insert(dict(values)).select("*").single().execute()
    return _mapping(result.data)


def update_project(
    client: Client,
    project_id: str,
    owner_profile_id: str,
    values: Mapping[str, Any],
) -> Mapping[str, Any] | None:
    result = (
        client.table("projects")
        .update(dict(values))
        .eq("id", project_id)
        .eq("owner_profile_id", owner_profile_id)
        .select("*")
        .limit(1)
        .execute()
    )
    rows = _rows(result.data)
    return rows[0] if rows else None


def get_media_asset(
    client: Client,
    media_asset_id: str,
    project_id: str,
    owner_profile_id: str,
) -> Mapping[str, Any] | None:
    result = (
        client.table("media_assets")
        .select("*")
        .eq("id", media_asset_id)
        .eq("project_id", project_id)
        .eq("owner_profile_id", owner_profile_id)
        .limit(1)
        .execute()
    )
    rows = _rows(result.data)
    return rows[0] if rows else None


def insert_media_asset(
    client: Client,
    values: Mapping[str, Any],
) -> Mapping[str, Any] | None:
    result = (
        client.table("media_assets")
        .insert(dict(values))
        .select("*")
        .single()
        .execute()
    )
    return _mapping(result.data)


def mark_media_asset_ready(
    client: Client,
    media_asset_id: str,
    owner_profile_id: str,
) -> Mapping[str, Any] | None:
    result = (
        client.table("media_assets")
        .update({"processing_status": "ready"})
        .eq("id", media_asset_id)
        .eq("owner_profile_id", owner_profile_id)
        .select("*")
        .limit(1)
        .execute()
    )
    rows = _rows(result.data)
    return rows[0] if rows else None


def delete_media_asset(client: Client, media_asset_id: str, owner_profile_id: str) -> None:
    client.table("media_assets").delete().eq("id", media_asset_id).eq(
        "owner_profile_id", owner_profile_id
    ).execute()


def create_project_update(
    client: Client,
    project_id: str,
    title: str,
    content: str,
    stage: str,
) -> Mapping[str, Any] | None:
    result = client.rpc(
        "create_project_update",
        {
            "p_project_id": project_id,
            "p_title": title,
            "p_content": content,
            "p_stage": stage,
        },
    ).execute()
    rows = _rows(result.data)
    if rows:
        return rows[0]
    return _mapping(result.data)


def publish_project(client: Client, project_id: str) -> Mapping[str, Any] | None:
    result = client.rpc("publish_project", {"p_project_id": project_id}).execute()
    rows = _rows(result.data)
    if rows:
        return rows[0]
    return _mapping(result.data)


def get_profile_details(client: Client, profile_id: str) -> Mapping[str, Any] | None:
    result = (
        client.table("profiles")
        .select("id,slug,display_name,profile_type,primary_craft,city,bio,is_public")
        .eq("id", profile_id)
        .limit(1)
        .execute()
    )
    rows = _rows(result.data)
    return rows[0] if rows else None


def get_public_profile_by_slug(client: Client, slug: str) -> Mapping[str, Any] | None:
    result = (
        client.table("profiles")
        .select("id,slug,display_name,profile_type,primary_craft,city,bio,is_public")
        .eq("slug", slug)
        .eq("is_public", True)
        .limit(1)
        .execute()
    )
    rows = _rows(result.data)
    return rows[0] if rows else None


def get_profiles_details(
    client: Client,
    profile_ids: list[str],
) -> list[Mapping[str, Any]]:
    if not profile_ids:
        return []
    result = (
        client.table("profiles")
        .select("id,slug,display_name,profile_type,primary_craft,city,bio,is_public")
        .in_("id", profile_ids)
        .execute()
    )
    return _rows(result.data)


def update_profile(
    client: Client,
    profile_id: str,
    values: Mapping[str, Any],
) -> Mapping[str, Any] | None:
    result = (
        client.table("profiles")
        .update(dict(values))
        .eq("id", profile_id)
        .select("id,slug,display_name,profile_type,primary_craft,city,bio,is_public")
        .limit(1)
        .execute()
    )
    rows = _rows(result.data)
    return rows[0] if rows else None
