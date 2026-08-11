"""Invoice workflow business logic.

This module:
- Uploads files to Supabase Storage
- Creates / approves / rejects / shares invoices
- Sends real SMTP emails using settings from the `smtp_settings` table
- Writes audit + email logs
- Tracks payment status and 25-day reminders
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from ..database import get_supabase
from ..utils import render_template, serialize_row, serialize_rows
from .email_service import send_email_with
from .storage_service import download_invoice, upload_invoice_file, validate_file
from .template_service import (
    get_client_by_id,
    get_clients_map,
    get_manager_settings,
    get_smtp_settings,
    get_template_by_name,
    get_app_settings,
    join_emails,
)

logger = logging.getLogger("invoice_app")


# ---------------------------------------------------------------------------
# Formatting helpers
# ---------------------------------------------------------------------------


def _format_inr(value) -> str:
    try:
        n = float(value or 0)
    except Exception:
        n = 0
    s = f"{n:,.2f}"
    parts = s.split(".")
    int_part = parts[0].replace(",", "")
    if len(int_part) <= 3:
        result = int_part
    else:
        result = int_part[-3:]
        int_part = int_part[:-3]
        while len(int_part) > 2:
            result = int_part[-2:] + "," + result
            int_part = int_part[:-2]
        if int_part:
            result = int_part + "," + result
    return f"₹{result}.{parts[1]}"


def _format_date(d) -> str:
    if not d:
        return ""
    try:
        if isinstance(d, str):
            return d
        return d.strftime("%d %b %Y")
    except Exception:
        return str(d)


# ---------------------------------------------------------------------------
# Audit + Email logs
# ---------------------------------------------------------------------------


def _audit(
    invoice_id: str,
    action: str,
    old_status: Optional[str],
    new_status: Optional[str],
    performed_by: str,
    remarks: str,
    ip_address: Optional[str] = None,
) -> None:
    sb = get_supabase()
    try:
        sb.table("invoice_audit_logs").insert(
            {
                "invoice_id": invoice_id,
                "action": action,
                "old_status": old_status,
                "new_status": new_status,
                "performed_by": performed_by,
                "remarks": remarks,
                "ip_address": ip_address,
            }
        ).execute()
    except Exception as e:
        logger.exception("audit log insert failed: %s", e)


def _log_email(
    invoice_id: str,
    email_type: str,
    recipient: str,
    subject: str,
    body: str,
    status: str,
    error: Optional[str] = None,
    cc: Optional[str] = None,
    bcc: Optional[str] = None,
    sender: Optional[str] = None,
) -> None:
    sb = get_supabase()
    try:
        sb.table("email_logs").insert(
            {
                "invoice_id": invoice_id,
                "email_type": email_type,
                "sender_email": sender,
                "recipient_email": recipient,
                "cc_emails": cc,
                "bcc_emails": bcc,
                "subject": subject,
                "body": body,
                "status": status,
                "error_message": error,
                "sent_at": datetime.utcnow().isoformat() if status == "Sent" else None,
            }
        ).execute()
    except Exception as e:
        logger.exception("email log insert failed: %s", e)


# ---------------------------------------------------------------------------
# Attach clients to invoices (Python-side join, no nested Supabase query)
# ---------------------------------------------------------------------------


def attach_clients(invoices: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not invoices:
        return []
    cmap = get_clients_map()
    for inv in invoices:
        cid = inv.get("client_id")
        inv["client"] = cmap.get(cid) if cid else None
    return invoices


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------


def create_invoice_with_file(
    file_bytes: bytes,
    file_name: str,
    content_type: Optional[str],
    data: Dict[str, Any],
    ip_address: Optional[str] = None,
) -> Dict[str, Any]:
    validate_file(file_name, content_type, len(file_bytes))
    meta = upload_invoice_file(file_bytes, file_name)

    sb = get_supabase()
    row = {
        "client_id": data["client_id"],
        "invoice_number": data["invoice_number"],
        "invoice_date": data["invoice_date"],
        "invoice_amount": float(data["invoice_amount"]),
        "due_date": data["due_date"],
        "file_name": meta["file_name"],
        "storage_path": meta["storage_path"],
        "file_size": meta["file_size"],
        "mime_type": meta["mime_type"],
        "remarks": data.get("remarks") or "",
        "status": "Pending Approval",
        "uploaded_by": data["uploaded_by"],
        "uploaded_at": datetime.utcnow().isoformat(),
        "payment_status": "Pending",
    }
    res = sb.table("invoices").insert(row).execute()
    if not res.data:
        raise RuntimeError("Failed to insert invoice record")
    invoice = res.data[0]
    invoice_id = invoice["id"]

    _audit(invoice_id, "CREATED", None, "Pending Approval",
           data["uploaded_by"], "Invoice created", ip_address)
    _audit(invoice_id, "SUBMITTED", None, "Pending Approval",
           data["uploaded_by"], "Submitted for approval", ip_address)

    # Email to manager
    manager = get_manager_settings()
    manager_email = manager.get("manager_email")
    smtp = get_smtp_settings()
    app_set = get_app_settings()
    
    if manager_email and smtp.get("smtp_host"):
        template = get_template_by_name("Invoice Submitted")
        client = get_client_by_id(invoice["client_id"])
        
        # AUTOMATION: Fetch senior management CC emails
        senior_emails_str = app_set.get("senior_management_emails")
        senior_cc = join_emails(senior_emails_str) if senior_emails_str else []
        variables = {
            "client_name": (client or {}).get("client_name", ""),
            "invoice_number": invoice["invoice_number"],
            "invoice_amount": _format_inr(invoice["invoice_amount"]),
            "invoice_date": _format_date(invoice["invoice_date"]),
            "due_date": _format_date(invoice["due_date"]),
            "uploaded_by": invoice["uploaded_by"],
            "sender_name": manager.get("manager_name", "Manager"),
        }
        if template:
            subject = render_template(template["subject"], variables)
            body = render_template(template["body"], variables)
        else:
            subject = f"New Invoice Submitted: {invoice['invoice_number']}"
            body = (
                f"Invoice {invoice['invoice_number']} for {variables['client_name']} "
                f"needs your approval."
            )
        try:
            send_email_with(
                smtp_host=smtp.get("smtp_host", ""),
                smtp_port=int(smtp.get("smtp_port") or 587),
                smtp_username=smtp.get("smtp_username", ""),
                smtp_password=smtp.get("smtp_password", ""),
                smtp_encryption=smtp.get("encryption_type", "TLS"),
                from_email=smtp.get("sender_email", ""),
                from_name=smtp.get("sender_name", "Invoice System"),
                to_email=manager_email,
                cc=senior_cc,
                subject=subject,
                body=body,
            )
            _log_email(invoice_id, "Invoice Submitted", manager_email, subject, body, "Sent",
                       cc=", ".join(senior_cc) if senior_cc else None,
                       sender=smtp.get("sender_email"))
            _audit(invoice_id, "EMAIL_SENT", None, None, "system",
                   f"Submitted email sent to {manager_email}", ip_address)
        except Exception as e:
            logger.exception("Manager email failed")
            _log_email(invoice_id, "Invoice Submitted", manager_email, subject, body,
                       "Failed", error=str(e), sender=smtp.get("sender_email"))
            _audit(invoice_id, "EMAIL_FAILED", None, None, "system",
                   f"Manager email failed: {str(e)[:200]}", ip_address)

    invoice["client"] = get_client_by_id(invoice["client_id"])
    return serialize_row(invoice)


# ---------------------------------------------------------------------------
# Approve
# ---------------------------------------------------------------------------


def approve_invoice(invoice_id: str, approved_by: str,
                    ip_address: Optional[str] = None) -> Dict[str, Any]:
    sb = get_supabase()
    cur = sb.table("invoices").select("*").eq("id", invoice_id).limit(1).execute()
    if not cur.data:
        raise ValueError("Invoice not found")
    invoice = cur.data[0]
    if invoice["status"] != "Pending Approval":
        raise ValueError(f"Cannot approve invoice in status {invoice['status']}")
    update = {
        "status": "Approved",
        "approved_by": approved_by,
        "approved_at": datetime.utcnow().isoformat(),
    }
    res = sb.table("invoices").update(update).eq("id", invoice_id).execute()
    updated = res.data[0] if res.data else {**invoice, **update}
    _audit(invoice_id, "APPROVED", "Pending Approval", "Approved",
           approved_by, "", ip_address)

    smtp = get_smtp_settings()
    ops_email = smtp.get("sender_email")
    if ops_email and smtp.get("smtp_host"):
        template = get_template_by_name("Invoice Approved")
        client = get_client_by_id(invoice["client_id"])
        variables = {
            "client_name": (client or {}).get("client_name", ""),
            "invoice_number": invoice["invoice_number"],
            "invoice_amount": _format_inr(invoice["invoice_amount"]),
            "invoice_date": _format_date(invoice["invoice_date"]),
            "due_date": _format_date(invoice["due_date"]),
            "uploaded_by": invoice.get("uploaded_by", ""),
            "approved_by": approved_by,
            "sender_name": smtp.get("sender_name", "Ops Team"),
        }
        if template:
            subject = render_template(template["subject"], variables)
            body = render_template(template["body"], variables)
        else:
            subject = f"Invoice Approved: {invoice['invoice_number']}"
            body = (
                f"Invoice {invoice['invoice_number']} has been approved by "
                f"{approved_by} and is ready to be shared."
            )
        try:
            send_email_with(
                smtp_host=smtp.get("smtp_host", ""),
                smtp_port=int(smtp.get("smtp_port") or 587),
                smtp_username=smtp.get("smtp_username", ""),
                smtp_password=smtp.get("smtp_password", ""),
                smtp_encryption=smtp.get("encryption_type", "TLS"),
                from_email=smtp.get("sender_email", ""),
                from_name=smtp.get("sender_name", "Ops Team"),
                to_email=ops_email,
                subject=subject,
                body=body,
            )
            _log_email(invoice_id, "Invoice Approved", ops_email, subject, body,
                       "Sent", sender=ops_email)
            _audit(invoice_id, "EMAIL_SENT", None, None, "system",
                   f"Approved email sent to {ops_email}", ip_address)
        except Exception as e:
            logger.exception("Approved email failed")
            _log_email(invoice_id, "Invoice Approved", ops_email, subject, body,
                       "Failed", error=str(e), sender=ops_email)
            _audit(invoice_id, "EMAIL_FAILED", None, None, "system",
                   f"Approved email failed: {str(e)[:200]}", ip_address)

    # AUTOMATION: Auto-Share if enabled
    app_set = get_app_settings()
    if app_set.get("auto_share_on_approval"):
        try:
            logger.info(f"Auto-sharing invoice {invoice_id} as per app settings.")
            updated = share_invoice(
                invoice_id=invoice_id,
                sent_by="System Auto-Share",
                cc="",
                bcc="",
                subject="",
                body="",
                ip_address=ip_address
            )
        except Exception as e:
            logger.exception(f"Auto-share failed for invoice {invoice_id}")
            # Do not fail the approval if auto-share fails, just log it.

    updated["client"] = get_client_by_id(updated.get("client_id"))
    return serialize_row(updated)


# ---------------------------------------------------------------------------
# Reject
# ---------------------------------------------------------------------------


def reject_invoice(invoice_id: str, rejected_by: str, reason: str,
                   ip_address: Optional[str] = None) -> Dict[str, Any]:
    sb = get_supabase()
    cur = sb.table("invoices").select("*").eq("id", invoice_id).limit(1).execute()
    if not cur.data:
        raise ValueError("Invoice not found")
    invoice = cur.data[0]
    if invoice["status"] != "Pending Approval":
        raise ValueError(f"Cannot reject invoice in status {invoice['status']}")
    update = {
        "status": "Rejected",
        "rejected_by": rejected_by,
        "rejected_at": datetime.utcnow().isoformat(),
        "rejection_reason": reason,
    }
    res = sb.table("invoices").update(update).eq("id", invoice_id).execute()
    updated = res.data[0] if res.data else {**invoice, **update}
    _audit(invoice_id, "REJECTED", "Pending Approval", "Rejected",
           rejected_by, reason, ip_address)

    smtp = get_smtp_settings()
    recipient = smtp.get("sender_email")
    if recipient and smtp.get("smtp_host"):
        template = get_template_by_name("Invoice Rejected")
        client = get_client_by_id(invoice["client_id"])
        variables = {
            "client_name": (client or {}).get("client_name", ""),
            "invoice_number": invoice["invoice_number"],
            "invoice_amount": _format_inr(invoice["invoice_amount"]),
            "invoice_date": _format_date(invoice["invoice_date"]),
            "due_date": _format_date(invoice["due_date"]),
            "uploaded_by": invoice.get("uploaded_by", ""),
            "rejected_by": rejected_by,
            "rejection_reason": reason,
            "sender_name": smtp.get("sender_name", "System"),
        }
        if template:
            subject = render_template(template["subject"], variables)
            body = render_template(template["body"], variables)
        else:
            subject = f"Invoice Rejected: {invoice['invoice_number']}"
            body = f"Invoice {invoice['invoice_number']} was rejected. Reason: {reason}"
        try:
            send_email_with(
                smtp_host=smtp.get("smtp_host", ""),
                smtp_port=int(smtp.get("smtp_port") or 587),
                smtp_username=smtp.get("smtp_username", ""),
                smtp_password=smtp.get("smtp_password", ""),
                smtp_encryption=smtp.get("encryption_type", "TLS"),
                from_email=smtp.get("sender_email", ""),
                from_name=smtp.get("sender_name", "System"),
                to_email=recipient,
                subject=subject,
                body=body,
            )
            _log_email(invoice_id, "Invoice Rejected", recipient, subject, body,
                       "Sent", sender=recipient)
        except Exception as e:
            logger.exception("Rejected email failed")
            _log_email(invoice_id, "Invoice Rejected", recipient, subject, body,
                       "Failed", error=str(e), sender=recipient)
    updated["client"] = get_client_by_id(updated.get("client_id"))
    return serialize_row(updated)


# ---------------------------------------------------------------------------
# Share with client
# ---------------------------------------------------------------------------


def share_invoice(invoice_id: str, sent_by: str, cc: str, bcc: str,
                  subject: str, body: str,
                  ip_address: Optional[str] = None) -> Dict[str, Any]:
    sb = get_supabase()
    cur = sb.table("invoices").select("*").eq("id", invoice_id).limit(1).execute()
    if not cur.data:
        raise ValueError("Invoice not found")
    invoice = cur.data[0]
    if invoice["status"] != "Approved":
        raise ValueError(f"Cannot share invoice in status {invoice['status']}")

    client = get_client_by_id(invoice["client_id"])
    if not client:
        raise ValueError("Client not found")
    recipient = client.get("client_email")
    if not recipient:
        raise ValueError("Client email is missing")

    smtp = get_smtp_settings()
    if not smtp.get("smtp_host"):
        raise RuntimeError("SMTP is not configured. Set it in Settings → SMTP.")
    sender_email = smtp.get("sender_email")

    cc_list = [s for s in join_emails(cc)] if cc else join_emails(client.get("cc_emails"))
    bcc_list = [s for s in join_emails(bcc)] if bcc else join_emails(client.get("bcc_emails"))

    file_bytes = download_invoice(invoice["storage_path"])
    attachment = (
        invoice["file_name"],
        file_bytes,
        invoice.get("mime_type") or "application/octet-stream",
    )

    if not subject or not body:
        template = get_template_by_name("Invoice Shared with Client")
        if template:
            variables = {
                "client_name": client.get("client_name", ""),
                "invoice_number": invoice["invoice_number"],
                "invoice_amount": _format_inr(invoice["invoice_amount"]),
                "invoice_date": _format_date(invoice["invoice_date"]),
                "due_date": _format_date(invoice["due_date"]),
                "uploaded_by": invoice.get("uploaded_by", ""),
                "approved_by": invoice.get("approved_by", ""),
                "sender_name": sent_by,
            }
            subject = subject or render_template(template["subject"], variables)
            body = body or render_template(template["body"], variables)

    try:
        send_email_with(
            smtp_host=smtp.get("smtp_host", ""),
            smtp_port=int(smtp.get("smtp_port") or 587),
            smtp_username=smtp.get("smtp_username", ""),
            smtp_password=smtp.get("smtp_password", ""),
            smtp_encryption=smtp.get("encryption_type", "TLS"),
            from_email=smtp.get("sender_email", ""),
            from_name=smtp.get("sender_name", "Invoice System"),
            to_email=recipient,
            subject=subject,
            body=body,
            cc=cc_list,
            bcc=bcc_list,
            attachment=attachment,
        )
    except Exception as e:
        logger.exception("Share email failed")
        _log_email(invoice_id, "Invoice Shared with Client", recipient, subject, body,
                   "Failed", error=str(e), cc=", ".join(cc_list) or None,
                   bcc=", ".join(bcc_list) or None, sender=sender_email)
        _audit(invoice_id, "EMAIL_FAILED", None, None, sent_by,
               f"Share email failed: {str(e)[:200]}", ip_address)
        raise RuntimeError(f"Failed to send email: {e}")

    sent_at = datetime.utcnow()
    payment_due = (sent_at + timedelta(days=25)).date().isoformat()
    update = {
        "status": "Sent to Client",
        "sent_by": sent_by,
        "sent_at": sent_at.isoformat(),
        "recipient_email": recipient,
        "sender_email": sender_email,
        "payment_due_date": payment_due,
    }
    res = sb.table("invoices").update(update).eq("id", invoice_id).execute()
    updated = res.data[0] if res.data else {**invoice, **update}
    _audit(invoice_id, "SHARED", "Approved", "Sent to Client", sent_by,
           f"Shared with {recipient}", ip_address)
    _log_email(invoice_id, "Invoice Shared with Client", recipient, subject, body,
               "Sent", cc=", ".join(cc_list) or None,
               bcc=", ".join(bcc_list) or None, sender=sender_email)
    _audit(invoice_id, "EMAIL_SENT", None, None, sent_by,
           f"Share email sent to {recipient}", ip_address)
    updated["client"] = client
    return serialize_row(updated)


# ---------------------------------------------------------------------------
# Mark payment received
# ---------------------------------------------------------------------------


def mark_payment_received(invoice_id: str, received_by: str,
                          ip_address: Optional[str] = None) -> Dict[str, Any]:
    sb = get_supabase()
    cur = sb.table("invoices").select("*").eq("id", invoice_id).limit(1).execute()
    if not cur.data:
        raise ValueError("Invoice not found")
    invoice = cur.data[0]
    if invoice.get("payment_status") == "Received":
        return serialize_row(
            {**invoice, "client": get_client_by_id(invoice["client_id"])}
        )
    update = {
        "payment_status": "Received",
        "payment_received_at": datetime.utcnow().isoformat(),
    }
    res = sb.table("invoices").update(update).eq("id", invoice_id).execute()
    updated = res.data[0] if res.data else {**invoice, **update}
    _audit(invoice_id, "PAYMENT_RECEIVED", None, None, received_by,
           "Payment marked as received", ip_address)
    updated["client"] = get_client_by_id(updated.get("client_id"))
    return serialize_row(updated)
