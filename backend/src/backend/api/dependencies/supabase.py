import logging

from fastapi import Depends, HTTPException, Request, status
from supabase import Client

from backend.core.config import Settings
from backend.infrastructure.supabase.client import create_supabase_client

logger = logging.getLogger(__name__)


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_supabase_client(settings: Settings = Depends(get_settings)) -> Client:
    anon_key = settings.supabase_anon_key.get_secret_value()
    if not settings.supabase_url or not anon_key:
        missing = []
        if not settings.supabase_url:
            missing.append("SUPABASE_URL")
        if not anon_key:
            missing.append("SUPABASE_ANON_KEY")
        logger.error("Supabase client configuration is incomplete: %s", ", ".join(missing))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The account service is temporarily unavailable. Please try again later.",
        )
    return create_supabase_client(settings.supabase_url, anon_key)
