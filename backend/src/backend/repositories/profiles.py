from collections.abc import Mapping
from typing import Any

from supabase import Client


def get_profile(client: Client, profile_id: str) -> Mapping[str, Any] | None:
    result = (
        client.table("profiles")
        .select("display_name,profile_type")
        .eq("id", profile_id)
        .single()
        .execute()
    )
    profile = result.data
    return profile if isinstance(profile, Mapping) else None
