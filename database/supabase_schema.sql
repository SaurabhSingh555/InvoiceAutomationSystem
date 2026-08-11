-- =====================================================================
-- Invoice Automation System - Supabase Database Schema
-- Run this in Supabase -> SQL Editor (safe to re-run)
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================================
-- Enums
-- =====================================================================
DO $$ BEGIN
    CREATE TYPE invoice_status AS ENUM (
        'Pending Approval',
        'Approved',
        'Rejected',
        'Sent to Client'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE payment_status_type AS ENUM ('Pending', 'Received');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE audit_action AS ENUM (
        'CREATED',
        'SUBMITTED',
        'APPROVED',
        'REJECTED',
        'SHARED',
        'EMAIL_SENT',
        'EMAIL_FAILED',
        'PAYMENT_RECEIVED',
        'PAYMENT_REMINDER_SENT'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE email_status AS ENUM ('Sent', 'Failed', 'Pending');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE entity_status AS ENUM ('Active', 'Inactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================================
-- clients (cc_emails / bcc_emails are TEXT[] arrays)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_name TEXT NOT NULL,
    client_code TEXT NOT NULL UNIQUE,
    client_email TEXT NOT NULL,
    cc_emails TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    bcc_emails TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    status entity_status NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- invoices
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    invoice_number TEXT NOT NULL UNIQUE,
    invoice_date DATE NOT NULL,
    invoice_amount NUMERIC(15, 2) NOT NULL,
    due_date DATE NOT NULL,
    file_name TEXT,
    storage_path TEXT,
    file_size BIGINT,
    mime_type TEXT,
    remarks TEXT,
    status invoice_status NOT NULL DEFAULT 'Pending Approval',
    uploaded_by TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ,
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    rejected_by TEXT,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    sent_by TEXT,
    sent_at TIMESTAMPTZ,
    recipient_email TEXT,
    sender_email TEXT,
    payment_status payment_status_type NOT NULL DEFAULT 'Pending',
    payment_due_date DATE,
    payment_received_at TIMESTAMPTZ,
    payment_reminder_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON public.invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_sent_at ON public.invoices(sent_at);

-- =====================================================================
-- smtp_settings
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.smtp_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_name TEXT,
    sender_email TEXT,
    smtp_host TEXT,
    smtp_port INTEGER,
    smtp_username TEXT,
    smtp_password TEXT,
    encryption_type TEXT DEFAULT 'TLS',
    status entity_status NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- manager_settings
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.manager_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manager_name TEXT,
    manager_email TEXT,
    status entity_status NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- app_settings  (single-row config table for automations)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.app_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    reminder_interval_minutes INTEGER NOT NULL DEFAULT 60,
    reminder_days INTEGER NOT NULL DEFAULT 25,
    auto_share_on_approval BOOLEAN NOT NULL DEFAULT FALSE,
    senior_management_emails TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safely add new columns if table already existed before this update
DO $$ BEGIN
    ALTER TABLE public.app_settings ADD COLUMN auto_share_on_approval BOOLEAN NOT NULL DEFAULT FALSE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE public.app_settings ADD COLUMN senior_management_emails TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Seed default app_settings row
INSERT INTO public.app_settings (reminder_enabled, reminder_interval_minutes, reminder_days, auto_share_on_approval)
SELECT TRUE, 60, 25, FALSE
WHERE NOT EXISTS (SELECT 1 FROM public.app_settings);

-- =====================================================================
-- email_templates
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_name TEXT NOT NULL UNIQUE,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    status entity_status NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- email_logs
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    email_type TEXT NOT NULL,
    sender_email TEXT,
    recipient_email TEXT,
    cc_emails TEXT,
    bcc_emails TEXT,
    subject TEXT,
    body TEXT,
    status email_status NOT NULL DEFAULT 'Pending',
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_invoice_id ON public.email_logs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);

-- =====================================================================
-- invoice_audit_logs
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.invoice_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    action audit_action NOT NULL,
    old_status invoice_status,
    new_status invoice_status,
    performed_by TEXT,
    remarks TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_invoice_id ON public.invoice_audit_logs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.invoice_audit_logs(action);

-- =====================================================================
-- updated_at trigger
-- =====================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON public.clients
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_smtp_updated_at BEFORE UPDATE ON public.smtp_settings
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_manager_updated_at BEFORE UPDATE ON public.manager_settings
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_app_settings_updated_at BEFORE UPDATE ON public.app_settings
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_templates_updated_at BEFORE UPDATE ON public.email_templates
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================================
-- Default system email templates (configuration only, not fake data)
-- =====================================================================
INSERT INTO public.email_templates (template_name, subject, body, status)
VALUES
('Invoice Submitted',
 'New Invoice Submitted for Approval: {{invoice_number}}',
 'Dear Manager,

A new invoice has been submitted for your approval.

Invoice Number: {{invoice_number}}
Client: {{client_name}}
Amount: {{invoice_amount}}
Invoice Date: {{invoice_date}}
Due Date: {{due_date}}
Uploaded By: {{uploaded_by}}

Please review and approve/reject at your earliest convenience.

Regards,
{{sender_name}}',
 'Active'),

('Invoice Approved',
 'Invoice Approved: {{invoice_number}}',
 'Hello Ops Team,

The following invoice has been approved by the manager and is now ready to be shared with the client.

Invoice Number: {{invoice_number}}
Client: {{client_name}}
Amount: {{invoice_amount}}
Approved By: {{approved_by}}

Please proceed to share it with the client.

Regards,
{{sender_name}}',
 'Active'),

('Invoice Rejected',
 'Invoice Rejected: {{invoice_number}}',
 'Hello Team,

The following invoice has been rejected by the manager.

Invoice Number: {{invoice_number}}
Client: {{client_name}}
Amount: {{invoice_amount}}
Rejected By: {{rejected_by}}
Reason: {{rejection_reason}}

Please review and take the necessary action.

Regards,
{{sender_name}}',
 'Active'),

('Invoice Shared with Client',
 'Invoice {{invoice_number}} from {{client_name}}',
 'Dear {{client_name}},

Please find attached invoice {{invoice_number}} for {{invoice_amount}}.

Invoice Date: {{invoice_date}}
Due Date: {{due_date}}

Kindly process the payment by the due date.

Regards,
{{sender_name}}',
 'Active'),

('Payment Reminder',
 'Invoice {{invoice_number}} Payment Reminder',
 'Dear {{client_name}},

This is a reminder that payment for invoice {{invoice_number}} has not yet been marked as received.

Invoice Amount: {{invoice_amount}}

Please arrange the payment at your earliest convenience.

Regards,
{{sender_name}}',
 'Active')
ON CONFLICT (template_name) DO NOTHING;

-- =====================================================================
-- Supabase Storage bucket (private)
-- =====================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- End of schema
-- =====================================================================
