"""Real SMTP email sender using Python's smtplib.

Configuration is read once from `database.py` for the hardcoded Supabase
context, and SMTP is read from the `smtp_settings` table at runtime.
"""
from __future__ import annotations

import logging
import smtplib
import ssl
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List, Optional, Tuple

logger = logging.getLogger("invoice_app")


def _smtp_connect(host: str, port: int, username: str, password: str, encryption: str):
    encryption = (encryption or "TLS").upper()
    if encryption == "SSL":
        ctx = ssl.create_default_context()
        server = smtplib.SMTP_SSL(host, port, context=ctx, timeout=30)
    else:
        server = smtplib.SMTP(host, port, timeout=30)
        server.ehlo()
        if encryption == "TLS":
            server.starttls(context=ssl.create_default_context())
            server.ehlo()
    if username:
        server.login(username, password)
    return server


def send_email_with(
    *,
    smtp_host: str,
    smtp_port: int,
    smtp_username: str,
    smtp_password: str,
    smtp_encryption: str,
    from_email: str,
    from_name: str,
    to_email: str,
    subject: str,
    body: str,
    cc: Optional[List[str]] = None,
    bcc: Optional[List[str]] = None,
    attachment: Optional[Tuple[str, bytes, str]] = None,
) -> None:
    """Send a real email through the given SMTP server. Raises on failure."""
    msg = MIMEMultipart()
    sender = from_email or smtp_username
    msg["From"] = f"{from_name} <{sender}>"
    msg["To"] = to_email
    msg["Subject"] = subject or ""
    if cc:
        msg["Cc"] = ", ".join(cc)

    msg.attach(MIMEText(body or "", "plain", "utf-8"))

    if attachment:
        filename, content, mime = attachment
        _, _, subtype = (mime or "application/octet-stream").partition("/")
        part = MIMEApplication(content, subtype or "octet-stream")
        part.add_header("Content-Disposition", "attachment", filename=filename)
        msg.attach(part)

    recipients = [to_email]
    if cc:
        recipients.extend(cc)
    if bcc:
        recipients.extend(bcc)

    server = _smtp_connect(
        smtp_host, smtp_port, smtp_username, smtp_password, smtp_encryption
    )
    try:
        server.sendmail(sender, recipients, msg.as_string())
    finally:
        try:
            server.quit()
        except Exception:
            pass


def test_smtp_connection(
    *, smtp_host: str, smtp_port: int, smtp_username: str,
    smtp_password: str, smtp_encryption: str,
) -> None:
    if not smtp_host:
        raise RuntimeError("SMTP_HOST is not configured")
    server = _smtp_connect(
        smtp_host, smtp_port, smtp_username, smtp_password, smtp_encryption
    )
    try:
        server.quit()
    except Exception:
        pass
