"""Helpers for templates, manager, and client lookups."""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from ..database import get_supabase

logger = logging.getLogger("invoice_app")


def get_template_by_name(name: str) -> Optional[Dict[str, Any]]:
    sb = get_supabase()
    try:
        res = (
            sb.table("email_templates")
            .select("*")
            .eq("template_name", name)
            .eq("status", "Active")
            .limit(1)
            .execute()
        )
        if res.data:
            return res.data[0]
        res2 = (
            sb.table("email_templates")
            .select("*")
            .eq("template_name", name)
            .limit(1)
            .execute()
        )
        if res2.data:
            return res2.data[0]
    except Exception as e:
        logger.exception("get_template_by_name(%s) failed", name)
    return None


def get_smtp_settings() -> Dict[str, Any]:
    sb = get_supabase()
    try:
        res = (
            sb.table("smtp_settings")
            .select("*")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if res.data:
            return res.data[0]
    except Exception as e:
        logger.exception("get_smtp_settings failed")
    return {}


def get_manager_settings() -> Dict[str, Any]:
    sb = get_supabase()
    try:
        res = (
            sb.table("manager_settings")
            .select("*")
            .eq("status", "Active")
            .limit(1)
            .execute()
        )
        if res.data:
            return res.data[0]
        res2 = (
            sb.table("manager_settings")
            .select("*")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if res2.data:
            return res2.data[0]
    except Exception as e:
        logger.exception("get_manager_settings failed")
    return {}


def get_app_settings() -> Dict[str, Any]:
    sb = get_supabase()
    try:
        res = sb.table("app_settings").select("*").limit(1).execute()
        if res.data:
            return res.data[0]
    except Exception as e:
        logger.exception("get_app_settings failed")
    return {}


def get_client_by_id(client_id: str) -> Dict[str, Any]:
    sb = get_supabase()
    try:
        res = (
            sb.table("clients")
            .select("*")
            .eq("id", client_id)
            .limit(1)
            .execute()
        )
        if res.data:
            return res.data[0]
    except Exception as e:
        logger.exception("get_client_by_id failed")
    return {}


def get_clients_map() -> Dict[str, Dict[str, Any]]:
    sb = get_supabase()
    try:
        res = sb.table("clients").select("*").execute()
        return {row["id"]: row for row in (res.data or [])}
    except Exception as e:
        logger.exception("get_clients_map failed")
    return {}


def join_emails(value) -> List[str]:
    if not value:
        return []
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    if isinstance(value, str):
        return [v.strip() for v in value.replace(";", ",").split(",") if v.strip()]
    return [str(value)]
