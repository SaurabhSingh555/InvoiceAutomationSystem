"""Pydantic models for clients."""
from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


class ClientBase(BaseModel):
    client_name: str = Field(..., min_length=1)
    client_code: str = Field(..., min_length=1)
    client_email: EmailStr
    cc_emails: List[str] = []
    bcc_emails: List[str] = []
    status: str = "Active"


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    client_name: Optional[str] = None
    client_code: Optional[str] = None
    client_email: Optional[EmailStr] = None
    cc_emails: Optional[List[str]] = None
    bcc_emails: Optional[List[str]] = None
    status: Optional[str] = None
