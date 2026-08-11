from __future__ import annotations

"""
=====================================================================
Centralized Supabase connection for the Invoice Automation backend.
=====================================================================

PASTE YOUR REAL SUPABASE SERVICE-ROLE KEY BELOW.

The key stays in this file ONLY. It is never sent to the frontend,
never logged, never printed, never exposed via any API response.

Run the backend with:

    python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
"""

SUPABASE_URL = "https://gucphxniwuarubrrcoms.supabase.co"
SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1Y3BoeG5pd3VhcnVicnJjb21zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjMzNDkxMCwiZXhwIjoyMTAxOTEwOTEwfQ.fdRZjlD8ndP3o-jM6PXdw42xD5lGD5fZn0TUbNTRE_A"
SUPABASE_STORAGE_BUCKET = "invoices"


# =====================================================================
# Imports
# =====================================================================


import logging
import threading
from typing import Optional

from supabase import Client, create_client

logger = logging.getLogger("invoice_app")

_client: Optional[Client] = None
_client_lock = threading.Lock()


# =====================================================================
# The one and only Supabase client.
# =====================================================================
def get_supabase() -> Client:
    """Return the singleton Supabase client.

    Initializes the client from the hardcoded constants above on first
    call. Subsequent calls return the same instance (thread-safe).
    """
    global _client
    if _client is not None:
        return _client

    with _client_lock:
        if _client is not None:
            return _client

        url = SUPABASE_URL
        key = SUPABASE_SERVICE_ROLE_KEY
        if not key or key == "PASTE_YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE":
            raise RuntimeError(
                "Supabase service-role key is not set. "
                "Open backend/app/database.py and paste the key into "
                "SUPABASE_SERVICE_ROLE_KEY, then restart FastAPI."
            )

        try:
            _client = create_client(url, key)
            logger.info("Supabase client initialized for %s", url)
        except Exception as e:
            logger.exception("Failed to initialize Supabase client")
            raise RuntimeError(f"Failed to initialize Supabase client: {e}")

    return _client


def get_storage():
    return get_supabase().storage


def get_bucket_name() -> str:
    return SUPABASE_STORAGE_BUCKET


# =====================================================================
# Connection diagnostics (used by /api/health)
# =====================================================================
def check_database_connection():
    """Return (ok, error_message_or_None) for a real round-trip."""
    try:
        sb = get_supabase()
        sb.table("clients").select("id").limit(1).execute()
        return True, None
    except Exception as e:
        logger.exception("Database connection check failed")
        return False, _human_error(e)


def check_storage_connection():
    try:
        storage = get_storage()
        buckets = storage.list_buckets()
        names = []
        for b in buckets or []:
            n = getattr(b, "name", None)
            if n is None and isinstance(b, dict):
                n = b.get("name")
            if n:
                names.append(n)
        if SUPABASE_STORAGE_BUCKET in names:
            return True, None
        return (
            False,
            f"Bucket '{SUPABASE_STORAGE_BUCKET}' not found. "
            f"Existing buckets: {names}",
        )
    except Exception as e:
        logger.exception("Storage connection check failed")
        return False, _human_error(e)


def _human_error(e: Exception) -> str:
    """Convert a Supabase / network exception into a short, safe message."""
    msg = (str(e) or e.__class__.__name__).strip()
    if not msg:
        return "Unknown error (see FastAPI terminal for details)"
    if "Could not find the table" in msg or "schema cache" in msg:
        return (
            "Database table is missing. Open Supabase → SQL Editor and "
            "run database/supabase_schema.sql"
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
