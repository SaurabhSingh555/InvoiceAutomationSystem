"""Client CRUD — all operations hit real Supabase."""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Request

from ..database import get_supabase
from ..schemas.client import ClientCreate, ClientUpdate
from ..utils import serialize_row, serialize_rows
from ._common import humanize_supabase_error

logger = logging.getLogger("invoice_app")
router = APIRouter(prefix="/api/clients", tags=["clients"])


@router.get("")
def list_clients(
    request: Request,
    status: Optional[str] = None,
    search: Optional[str] = None,
):
    try:
        sb = get_supabase()
    except Exception as e:
        logger.exception("get_supabase failed in list_clients")
        return {"success": False, "message": humanize_supabase_error(e)}
    try:
        q = sb.table("clients").select("*").order("created_at", desc=True)
        if status:
            q = q.eq("status", status)
        if search:
            like = f"%{search}%"
            q = q.or_(
                f"client_name.ilike.{like},client_code.ilike.{like},client_email.ilike.{like}"
            )
        res = q.execute()
        return {"success": True, "data": serialize_rows(res.data or [])}
    except Exception as e:
        logger.exception("list_clients failed: %s", e)
        return {"success": False, "message": humanize_supabase_error(e)}


@router.post("")
def create_client(request: Request, payload: ClientCreate):
    try:
        sb = get_supabase()
    except Exception as e:
        logger.exception("get_supabase failed in create_client")
        return {"success": False, "message": humanize_supabase_error(e)}
    try:
        body = payload.model_dump()
        body["cc_emails"] = body.get("cc_emails") or []
        body["bcc_emails"] = body.get("bcc_emails") or []
        res = sb.table("clients").insert(body).execute()
        if not res.data:
            return {"success": False, "message": "Insert returned no data"}
        return {"success": True, "data": serialize_row(res.data[0])}
    except Exception as e:
        logger.exception("create_client failed: %s", e)
        return {"success": False, "message": humanize_supabase_error(e)}


@router.get("/{client_id}")
def get_client(client_id: str, request: Request):
    try:
        sb = get_supabase()
        res = sb.table("clients").select("*").eq("id", client_id).limit(1).execute()
        if not res.data:
            return {"success": False, "message": "Client not found"}
        return {"success": True, "data": serialize_row(res.data[0])}
    except Exception as e:
        logger.exception("get_client failed: %s", e)
        return {"success": False, "message": humanize_supabase_error(e)}


@router.put("/{client_id}")
def update_client(client_id: str, request: Request, payload: ClientUpdate):
    try:
        sb = get_supabase()
        body = {k: v for k, v in payload.model_dump().items() if v is not None}
        if not body:
            return {"success": False, "message": "No fields to update"}
        res = sb.table("clients").update(body).eq("id", client_id).execute()
        if not res.data:
            return {"success": False, "message": "Client not found"}
        return {"success": True, "data": serialize_row(res.data[0])}
    except Exception as e:
        logger.exception("update_client failed: %s", e)
        return {"success": False, "message": humanize_supabase_error(e)}


@router.delete("/{client_id}")
def delete_client(client_id: str, request: Request):
    try:
        sb = get_supabase()
        inv = (
            sb.table("invoices")
            .select("id")
            .eq("client_id", client_id)
            .limit(1)
            .execute()
        )
        if inv.data:
            return {
                "success": False,
                "message": "Cannot delete client with existing invoices",
            }
        res = sb.table("clients").delete().eq("id", client_id).execute()
        return {"success": True, "data": serialize_rows(res.data or [])}
    except Exception as e:
        logger.exception("delete_client failed: %s", e)
        return {"success": False, "message": humanize_supabase_error(e)}
