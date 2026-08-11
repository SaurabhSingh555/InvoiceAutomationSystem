"""25-day payment reminder service.

Sends one reminder per invoice when:
    payment_status = 'Pending'
    AND sent_at IS NOT NULL
    AND now >= sent_at + 25 days
    AND payment_reminder_sent_at IS NULL
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from ..database import get_supabase
from ..utils import render_template
from .email_service import send_email_with
from .invoice_service import _audit, _format_date, _format_inr, _log_email
from .template_service import get_client_by_id, get_smtp_settings, get_template_by_name

logger = logging.getLogger("invoice_app")


def _parse_dt(value) -> Optional[datetime]:
    if not value:
        return None
    try:
        if isinstance(value, datetime):
            return value
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except Exception:
        return None


def process_payment_reminders(ip_address: Optional[str] = None) -> Dict[str, Any]:
    sb = get_supabase()
    summary = {"checked": 0, "sent": 0, "failed": 0, "skipped": 0}
    try:
        res = (
            sb.table("invoices")
            .select("*")
            .eq("status", "Sent to Client")
            .eq("payment_status", "Pending")
            .is_("payment_reminder_sent_at", "null")
            .execute()
        )
    except Exception as e:
        logger.exception("Failed to fetch invoices for reminder")
        return summary

    candidates: List[Dict[str, Any]] = res.data or []
    summary["checked"] = len(candidates)

    template = get_template_by_name("Payment Reminder")
    smtp = get_smtp_settings()
    sender_email = smtp.get("sender_email")
    sender_name = smtp.get("sender_name", "Accounts Team")
    smtp_host = smtp.get("smtp_host", "")
    now = datetime.utcnow()

    for inv in candidates:
        sent_at = _parse_dt(inv.get("sent_at"))
        if not sent_at:
            summary["skipped"] += 1
            continue
        if sent_at.tzinfo:
            sent_at = sent_at.astimezone(timezone.utc).replace(tzinfo=None)
        if now < sent_at + timedelta(days=25):
            summary["skipped"] += 1
            continue

        client = get_client_by_id(inv["client_id"])
        recipient = (client or {}).get("client_email")
        if not recipient:
            summary["skipped"] += 1
            continue
        if not smtp_host:
            summary["skipped"] += 1
            continue

        variables = {
            "client_name": (client or {}).get("client_name", ""),
            "invoice_number": inv.get("invoice_number", ""),
            "invoice_amount": _format_inr(inv.get("invoice_amount")),
            "invoice_date": _format_date(inv.get("invoice_date")),
            "due_date": _format_date(inv.get("due_date")),
            "sender_name": sender_name,
        }
        if template:
            subject = render_template(template["subject"], variables)
            body = render_template(template["body"], variables)
        else:
            subject = f"Payment Reminder: {variables['invoice_number']}"
            body = (
                f"Dear {variables['client_name']},\n\n"
                f"This is a reminder that payment for invoice "
                f"{variables['invoice_number']} has not yet been received.\n"
                f"Amount: {variables['invoice_amount']}\n\n"
                f"Please arrange the payment.\n\nRegards,\n{sender_name}"
            )

        try:
            send_email_with(
                smtp_host=smtp_host,
                smtp_port=int(smtp.get("smtp_port") or 587),
                smtp_username=smtp.get("smtp_username", ""),
                smtp_password=smtp.get("smtp_password", ""),
                smtp_encryption=smtp.get("encryption_type", "TLS"),
                from_email=sender_email or "",
                from_name=sender_name,
                to_email=recipient,
                subject=subject,
                body=body,
            )
            _log_email(inv["id"], "Payment Reminder", recipient, subject, body,
                       "Sent", sender=sender_email)
            _audit(inv["id"], "PAYMENT_REMINDER_SENT", None, None, "system",
                   f"Payment reminder sent to {recipient}", ip_address)
            try:
                sb.table("invoices").update(
                    {"payment_reminder_sent_at": now.isoformat()}
                ).eq("id", inv["id"]).execute()
            except Exception as e:
                logger.exception("Failed to set payment_reminder_sent_at: %s", e)
            summary["sent"] += 1
        except Exception as e:
            logger.exception("Payment reminder failed for %s", inv["id"])
            _log_email(inv["id"], "Payment Reminder", recipient, subject, body,
                       "Failed", error=str(e), sender=sender_email)
            summary["failed"] += 1

    return summary
