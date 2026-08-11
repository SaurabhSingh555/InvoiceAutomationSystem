"""Common helpers for route handlers."""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from fastapi import Request

logger = logging.getLogger("invoice_app")


def client_ip(request: Request) -> Optional[str]:
    return request.client.host if request.client else None


def safe_error_payload(default_message: str) -> Dict[str, Any]:
    """Always return a structured error payload (no stack trace leaks)."""
    return {"success": False, "message": default_message}


def humanize_supabase_error(e: Exception) -> str:
    """Convert a Supabase / PostgREST error into a short, safe message.

    Never includes the URL or key. The full error is still logged
    server-side at the caller.
    """
    msg = str(e) or e.__class__.__name__
    msg = msg.strip()
    if not msg:
        return "Unknown Supabase error (see FastAPI terminal for details)"
    if "Could not find the table" in msg or "schema cache" in msg:
        return (
            "Database table is missing. Open Supabase → SQL Editor and "
            "run database/supabase_schema.sql"
        )
    if "permission denied" in msg.lower() or "row-level security" in msg.lower():
        return (
            "Permission denied by Supabase RLS. The service-role key "
            "should bypass RLS — double-check it is the service_role key, "
            "not the anon key."
        )
    if "Invalid API key" in msg or "invalid JWT" in msg.lower():
        return "Invalid Supabase service-role key."
    if "fetch failed" in msg.lower() or "connection error" in msg.lower():
        return (
            "Network error reaching Supabase. Check SUPABASE_URL and your "
            "internet connection."
        )
    if len(msg) > 240:
        msg = msg[:240] + "..."
    return msg
