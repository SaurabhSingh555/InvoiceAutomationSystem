"""SMTP, Manager, Email Template settings endpoints."""
from __future__ import annotations

import logging

from fastapi import APIRouter, Request

from ..database import get_supabase
from ..schemas.settings import (
    ManagerSettings,
    SMTPTestRequest,
    SMTPSettings,
)
from ..services.email_service import send_email_with, test_smtp_connection
from ._common import humanize_supabase_error

logger = logging.getLogger("invoice_app")
router = APIRouter(prefix="/api/settings", tags=["settings"])


# ---------------------------------------------------------------------------
# SMTP
# ---------------------------------------------------------------------------


@router.get("/smtp")
def get_smtp(request: Request):
    try:
        sb = get_supabase()
        res = (
            sb.table("smtp_settings")
            .select("*")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if not res.data:
            return {"success": True, "data": {}}
        row = dict(res.data[0])
        row["smtp_password"] = "********" if row.get("smtp_password") else ""
        return {"success": True, "data": row}
    except Exception as e:
        logger.exception("get_smtp failed: %s", e)
        return {"success": False, "message": humanize_supabase_error(e)}


@router.put("/smtp")
def update_smtp(request: Request, payload: SMTPSettings):
    try:
        sb = get_supabase()
        body = payload.model_dump()
        if not body.get("smtp_password") or body["smtp_password"] == "********":
            body.pop("smtp_password", None)
        existing = (
            sb.table("smtp_settings")
            .select("id")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if existing.data:
            res = (
                sb.table("smtp_settings")
                .update(body)
                .eq("id", existing.data[0]["id"])
                .execute()
            )
        else:
            res = sb.table("smtp_settings").insert(body).execute()
        if not res.data:
            return {"success": False, "message": "Update returned no data"}
        row = dict(res.data[0])
        row["smtp_password"] = "********" if row.get("smtp_password") else ""
        return {"success": True, "data": row}
    except Exception as e:
        logger.exception("update_smtp failed: %s", e)
        return {"success": False, "message": humanize_supabase_error(e)}


@router.post("/smtp/test")
def test_smtp_send(request: Request, payload: SMTPTestRequest):
    try:
        sb = get_supabase()
        res = (
            sb.table("smtp_settings")
            .select("*")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if not res.data:
            return {"success": False, "message": "SMTP settings not configured"}
        smtp = res.data[0]
        subject = "Test Email - Invoice System"
        body = (
            "This is a test email from your Invoice Automation System.\n\n"
            "If you received this, your SMTP settings are working correctly."
        )
        send_email_with(
            smtp_host=smtp.get("smtp_host", ""),
            smtp_port=int(smtp.get("smtp_port") or 587),
            smtp_username=smtp.get("smtp_username", ""),
            smtp_password=smtp.get("smtp_password", ""),
            smtp_encryption=smtp.get("encryption_type", "TLS"),
            from_email=smtp.get("sender_email", ""),
            from_name=smtp.get("sender_name", "Invoice System"),
            to_email=payload.test_email,
            subject=subject,
            body=body,
        )
        return {"success": True, "message": "Test email sent"}
    except Exception as e:
        logger.exception("test_smtp failed: %s", e)
        return {"success": False, "message": f"SMTP test failed: {e}"}


@router.post("/smtp/test-connection")
def test_smtp_connection_endpoint(request: Request):
    try:
        sb = get_supabase()
        res = (
            sb.table("smtp_settings")
            .select("*")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if not res.data:
            return {
                "success": False,
                "message": "SMTP not configured. Open Settings → SMTP and save your SMTP details first.",
            }
        smtp = res.data[0]
        if not smtp.get("smtp_host"):
            return {"success": False, "message": "SMTP_HOST is empty"}
        test_smtp_connection(
            smtp_host=smtp.get("smtp_host", ""),
            smtp_port=int(smtp.get("smtp_port") or 587),
            smtp_username=smtp.get("smtp_username", ""),
            smtp_password=smtp.get("smtp_password", ""),
            smtp_encryption=smtp.get("encryption_type", "TLS"),
        )
        return {"success": True, "message": "SMTP connection successful"}
    except Exception as e:
        logger.exception("SMTP connection test failed: %s", e)
        return {"success": False, "message": f"SMTP connection failed: {e}"}


# ---------------------------------------------------------------------------
# Manager
# ---------------------------------------------------------------------------


@router.get("/manager")
def get_manager(request: Request):
    try:
        sb = get_supabase()
        res = (
            sb.table("manager_settings")
            .select("*")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if not res.data:
            return {"success": True, "data": {}}
        return {"success": True, "data": res.data[0]}
    except Exception as e:
        logger.exception("get_manager failed: %s", e)
        return {"success": False, "message": humanize_supabase_error(e)}


@router.put("/manager")
def update_manager(request: Request, payload: ManagerSettings):
    try:
        sb = get_supabase()
        body = payload.model_dump()
        existing = (
            sb.table("manager_settings")
            .select("id")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if existing.data:
            res = (
                sb.table("manager_settings")
                .update(body)
                .eq("id", existing.data[0]["id"])
                .execute()
            )
        else:
            res = sb.table("manager_settings").insert(body).execute()
        return {"success": True, "data": res.data[0] if res.data else {}}
    except Exception as e:
        logger.exception("update_manager failed: %s", e)
        return {"success": False, "message": humanize_supabase_error(e)}


# ---------------------------------------------------------------------------
# App settings (payment reminder on/off + interval)
# ---------------------------------------------------------------------------


@router.get("/app")
def get_app_settings(request: Request):
    try:
        sb = get_supabase()
        res = (
            sb.table("app_settings")
            .select("*")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if not res.data:
            return {
                "success": True,
                "data": {"reminder_enabled": True, "reminder_interval_minutes": 60, "reminder_days": 25},
            }
        return {"success": True, "data": res.data[0]}
    except Exception as e:
        logger.exception("get_app_settings failed: %s", e)
        return {"success": False, "message": humanize_supabase_error(e)}


@router.put("/app")
def update_app_settings(request: Request, payload: dict):
    try:
        sb = get_supabase()
        body = {k: v for k, v in payload.items() if v is not None}
        if not body:
            return {"success": False, "message": "No fields to update"}
        existing = (
            sb.table("app_settings")
            .select("id")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if existing.data:
            res = (
                sb.table("app_settings")
                .update(body)
                .eq("id", existing.data[0]["id"])
                .execute()
            )
        else:
            res = sb.table("app_settings").insert(body).execute()
        return {"success": True, "data": res.data[0] if res.data else {}}
    except Exception as e:
        logger.exception("update_app_settings failed: %s", e)
        return {"success": False, "message": humanize_supabase_error(e)}
