"""Email log and Audit log list endpoints."""
from __future__ import annotations

import logging

from fastapi import APIRouter, Request

from ..database import get_supabase
from ..utils import serialize_rows
from ._common import humanize_supabase_error

logger = logging.getLogger("invoice_app")
router = APIRouter(prefix="/api", tags=["logs"])


def _attach_invoice_numbers(rows):
    sb = get_supabase()
    invoice_ids = {r.get("invoice_id") for r in rows if r.get("invoice_id")}
    if not invoice_ids:
        return rows
    try:
        res = (
            sb.table("invoices")
            .select("id, invoice_number")
            .in_("id", list(invoice_ids))
            .execute()
        )
        cmap = {r["id"]: r.get("invoice_number") for r in (res.data or [])}
    except Exception as e:
        logger.exception("attach invoice numbers failed: %s", e)
        cmap = {}
    for r in rows:
        r["invoice_number"] = cmap.get(r.get("invoice_id"))
    return rows


@router.get("/email-logs")
def list_email_logs(request: Request):
    try:
        sb = get_supabase()
        res = (
            sb.table("email_logs")
            .select("*")
            .order("created_at", desc=True)
            .limit(500)
            .execute()
        )
        rows = _attach_invoice_numbers(res.data or [])
        return {"success": True, "data": serialize_rows(rows)}
    except Exception as e:
        logger.exception("list_email_logs failed: %s", e)
        return {"success": False, "message": humanize_supabase_error(e)}


@router.get("/audit-logs")
def list_audit_logs(request: Request):
    try:
        sb = get_supabase()
        res = (
            sb.table("invoice_audit_logs")
            .select("*")
            .order("created_at", desc=True)
            .limit(500)
            .execute()
        )
        rows = _attach_invoice_numbers(res.data or [])
        return {"success": True, "data": serialize_rows(rows)}
    except Exception as e:
        logger.exception("list_audit_logs failed: %s", e)
        return {"success": False, "message": humanize_supabase_error(e)}
