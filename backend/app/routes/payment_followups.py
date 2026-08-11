"""Payment follow-up list with derived reminder_due flag."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Request

from ..database import get_supabase
from ..utils import serialize_rows
from ._common import humanize_supabase_error

logger = logging.getLogger("invoice_app")
router = APIRouter(prefix="/api/payment-followups", tags=["payment-followups"])


def _parse_dt(value) -> Optional[datetime]:
    if not value:
        return None
    try:
        if isinstance(value, datetime):
            return value
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except Exception:
        return None


@router.get("")
def list_followups(request: Request, filter: Optional[str] = None):
    try:
        sb = get_supabase()
        res = (
            sb.table("invoices")
            .select("*")
            .eq("status", "Sent to Client")
            .order("sent_at", desc=True)
            .execute()
        )
        rows = res.data or []
        now = datetime.utcnow()
        for r in rows:
            sent_at = _parse_dt(r.get("sent_at"))
            if sent_at and sent_at.tzinfo:
                sent_at = sent_at.astimezone(timezone.utc).replace(tzinfo=None)
            r["reminder_due"] = bool(
                sent_at
                and (r.get("payment_status") or "Pending") == "Pending"
                and not r.get("payment_reminder_sent_at")
                and now >= sent_at + timedelta(days=25)
            )

        ids = list({r.get("client_id") for r in rows if r.get("client_id")})
        cmap: Dict[str, Any] = {}
        if ids:
            try:
                cres = sb.table("clients").select("*").in_("id", ids).execute()
                cmap = {c["id"]: c for c in (cres.data or [])}
            except Exception as e:
                logger.exception("clients fetch failed: %s", e)
        for r in rows:
            r["client"] = cmap.get(r.get("client_id"))

        if filter == "pending_payment":
            rows = [r for r in rows if (r.get("payment_status") or "Pending") == "Pending"]
        elif filter == "payment_received":
            rows = [r for r in rows if r.get("payment_status") == "Received"]
        elif filter == "reminder_sent":
            rows = [r for r in rows if r.get("payment_reminder_sent_at")]
        elif filter == "reminder_due":
            rows = [r for r in rows if r.get("reminder_due")]

        return {"success": True, "data": serialize_rows(rows)}
    except Exception as e:
        logger.exception("list_followups failed: %s", e)
        return {"success": False, "message": humanize_supabase_error(e)}
