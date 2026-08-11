"""FastAPI entry point for the Invoice Automation System."""
from __future__ import annotations

import logging
import sys

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .routes import (
    clients,
    dashboard,
    email_templates,
    health,
    invoices,
    logs,
    payment_followups,
    settings as settings_routes,
)
from .services.scheduler import start_scheduler, stop_scheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("invoice_app")

app = FastAPI(title="Invoice Automation System", version="1.0.0")

# CORS for the Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,
)


@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"success": False, "message": "Validation error", "errors": exc.errors()},
    )


@app.exception_handler(Exception)
async def unhandled_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url)
    return JSONResponse(
        status_code=500,
        content={"success": False, "message": "Internal server error"},
    )


@app.on_event("startup")
def on_startup():
    logger.info("=" * 60)
    logger.info("Invoice Automation API starting up")
    logger.info("Frontend: http://localhost:5173")
    logger.info("API:      http://localhost:8000")
    logger.info("Health:   http://localhost:8000/api/health")
    logger.info("=" * 60)
    try:
        start_scheduler()
    except Exception as e:
        logger.exception("Scheduler failed to start: %s", e)


@app.on_event("shutdown")
def on_shutdown():
    try:
        stop_scheduler()
    except Exception as e:
        logger.exception("Scheduler shutdown failed: %s", e)


@app.get("/")
def root():
    return {"success": True, "service": "Invoice Automation API"}


app.include_router(health.router)
app.include_router(dashboard.router)
app.include_router(clients.router)
app.include_router(invoices.router)
app.include_router(email_templates.router)
app.include_router(settings_routes.router)
app.include_router(logs.router)
app.include_router(payment_followups.router)
