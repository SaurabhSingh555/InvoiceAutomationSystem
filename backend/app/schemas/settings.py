"""Pydantic models for SMTP and Manager settings."""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class SMTPSettings(BaseModel):
    sender_name: Optional[str] = ""
    sender_email: Optional[EmailStr] = ""
    smtp_host: Optional[str] = ""
    smtp_port: Optional[int] = 587
    smtp_username: Optional[str] = ""
    smtp_password: Optional[str] = ""
    encryption_type: Optional[str] = "TLS"
    status: Optional[str] = "Active"


class SMTPTestRequest(BaseModel):
    test_email: EmailStr


class ManagerSettings(BaseModel):
    manager_name: Optional[str] = ""
    manager_email: Optional[EmailStr] = ""
    status: Optional[str] = "Active"
