"""Email template CRUD + render endpoint."""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Request

from ..database import get_supabase
from ..schemas.email_template import (
    EmailTemplateCreate,
    EmailTemplateUpdate,
    RenderRequest,
)
from ..utils import render_template, serialize_row, serialize_rows
from ._common import humanize_supabase_error

logger = logging.getLogger("invoice_app")
router = APIRouter(prefix="/api/email-templates", tags=["email-templates"])


@router.get("")
def list_templates(request: Request, status: Optional[str] = None):
    try:
        sb = get_supabase()
        q = sb.table("email_templates").select("*").order("template_name")
        if status:
            q = q.eq("status", status)
        res = q.execute()
        return {"success": True, "data": serialize_rows(res.data or [])}
    except Exception as e:
        logger.exception("list_templates failed: %s", e)
        return {"success": False, "message": humanize_supabase_error(e)}


@router.post("")
def create_template(request: Request, payload: EmailTemplateCreate):
    try:
        sb = get_supabase()
        res = sb.table("email_templates").insert(payload.model_dump()).execute()
        if not res.data:
            return {"success": False, "message": "Insert returned no data"}
        return {"success": True, "data": serialize_row(res.data[0])}
    except Exception as e:
        logger.exception("create_template failed: %s", e)
        return {"success": False, "message": humanize_supabase_error(e)}


@router.get("/{template_id}")
def get_template(template_id: str, request: Request):
    try:
        sb = get_supabase()
        res = (
            sb.table("email_templates")
            .select("*")
            .eq("id", template_id)
            .limit(1)
            .execute()
        )
        if not res.data:
            return {"success": False, "message": "Template not found"}
        return {"success": True, "data": serialize_row(res.data[0])}
    except Exception as e:
        logger.exception("get_template failed: %s", e)
        return {"success": False, "message": humanize_supabase_error(e)}


@router.put("/{template_id}")
def update_template(
    template_id: str, request: Request, payload: EmailTemplateUpdate
):
    try:
        sb = get_supabase()
        body = {k: v for k, v in payload.model_dump().items() if v is not None}
        if not body:
            return {"success": False, "message": "No fields to update"}
        res = sb.table("email_templates").update(body).eq("id", template_id).execute()
        if not res.data:
            return {"success": False, "message": "Template not found"}
        return {"success": True, "data": serialize_row(res.data[0])}
    except Exception as e:
        logger.exception("update_template failed: %s", e)
        return {"success": False, "message": humanize_supabase_error(e)}


@router.delete("/{template_id}")
def delete_template(template_id: str, request: Request):
    try:
        sb = get_supabase()
        res = sb.table("email_templates").delete().eq("id", template_id).execute()
        return {"success": True, "data": serialize_rows(res.data or [])}
    except Exception as e:
        logger.exception("delete_template failed: %s", e)
        return {"success": False, "message": humanize_supabase_error(e)}


@router.post("/render")
def render_template_endpoint(request: Request, payload: RenderRequest):
    try:
        sb = get_supabase()
        res = (
            sb.table("email_templates")
            .select("*")
            .eq("template_name", payload.template_name)
            .limit(1)
            .execute()
        )
        if not res.data:
            return {
                "success": False,
                "message": f"Template '{payload.template_name}' not found",
            }
        t = res.data[0]
        variables = payload.variables or {}
        return {
            "success": True,
            "data": {
                "subject": render_template(t["subject"], variables),
                "body": render_template(t["body"], variables),
            },
        }
    except Exception as e:
        logger.exception("render_template failed: %s", e)
        return {"success": False, "message": humanize_supabase_error(e)}
