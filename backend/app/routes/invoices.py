"""Invoice CRUD + workflow endpoints."""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, File, Form, Request, UploadFile
from fastapi.responses import Response

from ..database import get_supabase
from ..schemas.invoice import (
    ApproveRequest,
    PaymentReceivedRequest,
    RejectRequest,
    ShareRequest,
)
from ..services.invoice_service import (
    approve_invoice,
    attach_clients,
    create_invoice_with_file,
    mark_payment_received,
    reject_invoice,
    share_invoice,
)
from ..services.storage_service import download_invoice
from ..utils import serialize_row, serialize_rows
from ._common import client_ip, humanize_supabase_error

logger = logging.getLogger("invoice_app")
router = APIRouter(prefix="/api/invoices", tags=["invoices"])


@router.get("")
def list_invoices(
    request: Request,
    status: Optional[str] = None,
    client_id: Optional[str] = None,
    invoice_number: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    try:
        sb = get_supabase()
    except Exception as e:
        logger.exception("get_supabase failed in list_invoices")
        return {"success": False, "message": humanize_supabase_error(e)}
    try:
        q = sb.table("invoices").select("*").order("created_at", desc=True)
        if status:
            q = q.eq("status", status)
        if client_id:
            q = q.eq("client_id", client_id)
        if invoice_number:
            q = q.ilike("invoice_number", f"%{invoice_number}%")
        if date_from:
            q = q.gte("invoice_date", date_from)
        if date_to:
            q = q.lte("invoice_date", date_to)
        res = q.execute()
        rows = res.data or []
        rows = attach_clients(rows)
        return {"success": True, "data": serialize_rows(rows)}
    except Exception as e:
        logger.exception("list_invoices failed: %s", e)
        return {"success": False, "message": humanize_supabase_error(e)}


@router.get("/{invoice_id}")
def get_invoice(invoice_id: str, request: Request):
    try:
        sb = get_supabase()
        res = sb.table("invoices").select("*").eq("id", invoice_id).limit(1).execute()
        if not res.data:
            return {"success": False, "message": "Invoice not found"}
        rows = attach_clients(res.data)
        return {"success": True, "data": serialize_row(rows[0])}
    except Exception as e:
        logger.exception("get_invoice failed: %s", e)
        return {"success": False, "message": humanize_supabase_error(e)}


@router.post("")
async def create_invoice(
    request: Request,
    client_id: str = Form(...),
    invoice_number: str = Form(...),
    invoice_date: str = Form(...),
    invoice_amount: str = Form(...),
    due_date: str = Form(...),
    remarks: str = Form(""),
    uploaded_by: str = Form(...),
    file: UploadFile = File(...),
):
    try:
        contents = await file.read()
        if not contents:
            return {"success": False, "message": "Empty file"}
        data = {
            "client_id": client_id,
            "invoice_number": invoice_number,
            "invoice_date": invoice_date,
            "invoice_amount": invoice_amount,
            "due_date": due_date,
            "remarks": remarks,
            "uploaded_by": uploaded_by,
        }
        invoice = create_invoice_with_file(
            file_bytes=contents,
            file_name=file.filename or "invoice",
            content_type=file.content_type,
            data=data,
            ip_address=client_ip(request),
        )
        return {"success": True, "data": serialize_row(invoice)}
    except ValueError as e:
        return {"success": False, "message": str(e)}
    except RuntimeError as e:
        return {"success": False, "message": str(e)}
    except Exception as e:
        logger.exception("create_invoice failed: %s", e)
        return {"success": False, "message": humanize_supabase_error(e)}


@router.post("/{invoice_id}/approve")
def approve(invoice_id: str, request: Request, payload: ApproveRequest):
    try:
        result = approve_invoice(
            invoice_id, payload.approved_by, ip_address=client_ip(request)
        )
        return {"success": True, "data": serialize_row(result)}
    except ValueError as e:
        return {"success": False, "message": str(e)}
    except Exception as e:
        logger.exception("approve failed: %s", e)
        return {"success": False, "message": humanize_supabase_error(e)}


@router.post("/{invoice_id}/reject")
def reject(invoice_id: str, request: Request, payload: RejectRequest):
    try:
        result = reject_invoice(
            invoice_id,
            payload.rejected_by,
            payload.rejection_reason,
            ip_address=client_ip(request),
        )
        return {"success": True, "data": serialize_row(result)}
    except ValueError as e:
        return {"success": False, "message": str(e)}
    except Exception as e:
        logger.exception("reject failed: %s", e)
        return {"success": False, "message": humanize_supabase_error(e)}


@router.post("/{invoice_id}/share")
def share(invoice_id: str, request: Request, payload: ShareRequest):
    try:
        result = share_invoice(
            invoice_id,
            sent_by=payload.sent_by,
            cc=payload.cc or "",
            bcc=payload.bcc or "",
            subject=payload.subject or "",
            body=payload.body or "",
            ip_address=client_ip(request),
        )
        return {"success": True, "data": serialize_row(result)}
    except ValueError as e:
        return {"success": False, "message": str(e)}
    except RuntimeError as e:
        return {"success": False, "message": str(e)}
    except Exception as e:
        logger.exception("share failed: %s", e)
        return {"success": False, "message": humanize_supabase_error(e)}


@router.post("/{invoice_id}/payment-received")
def payment_received(
    invoice_id: str, request: Request, payload: PaymentReceivedRequest
):
    try:
        result = mark_payment_received(
            invoice_id, payload.received_by, ip_address=client_ip(request)
        )
        return {"success": True, "data": serialize_row(result)}
    except ValueError as e:
        return {"success": False, "message": str(e)}
    except Exception as e:
        logger.exception("payment_received failed: %s", e)
        return {"success": False, "message": humanize_supabase_error(e)}


@router.get("/{invoice_id}/download")
def download(invoice_id: str):
    try:
        sb = get_supabase()
        res = (
            sb.table("invoices")
            .select("storage_path, file_name, mime_type")
            .eq("id", invoice_id)
            .limit(1)
            .execute()
        )
        if not res.data:
            return {"success": False, "message": "Invoice not found"}
        row = res.data[0]
        if not row.get("storage_path"):
            return {"success": False, "message": "File not found"}
        data = download_invoice(row["storage_path"])
        return Response(
            content=data,
            media_type=row.get("mime_type") or "application/octet-stream",
            headers={
                "Content-Disposition": f'attachment; filename="{row.get("file_name") or "invoice"}"'
            },
        )
    except Exception as e:
        logger.exception("download_invoice failed: %s", e)
        return {"success": False, "message": humanize_supabase_error(e)}


@router.get("/{invoice_id}/audit-logs")
def get_audit_logs(invoice_id: str):
    try:
        sb = get_supabase()
        res = (
            sb.table("invoice_audit_logs")
            .select("*")
            .eq("invoice_id", invoice_id)
            .order("created_at", desc=False)
            .execute()
        )
        return {"success": True, "data": serialize_rows(res.data or [])}
    except Exception as e:
        logger.exception("get_audit_logs failed: %s", e)
        return {"success": False, "message": humanize_supabase_error(e)}


@router.get("/{invoice_id}/email-logs")
def get_email_logs(invoice_id: str):
    try:
        sb = get_supabase()
        res = (
            sb.table("email_logs")
            .select("*")
            .eq("invoice_id", invoice_id)
            .order("created_at", desc=False)
            .execute()
        )
        return {"success": True, "data": serialize_rows(res.data or [])}
    except Exception as e:
        logger.exception("get_email_logs failed: %s", e)
        return {"success": False, "message": humanize_supabase_error(e)}
