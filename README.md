# Invoice Automation System

Internal invoice workflow built with **React + Vite (JavaScript/JSX)** and **Python FastAPI + Supabase**.

> No login, no authentication, no env files for Supabase. The connection
> string is hardcoded in `backend/app/database.py` (one place, one key).

---

## 🚀 Quick start (3 commands)

### 1. Paste the SQL schema

1. Open **Supabase → SQL Editor** for your project.
2. Paste the entire `database/supabase_schema.sql` file.
3. Click **Run**. This creates all tables, enums, triggers, the `invoices`
   private storage bucket, and 5 default email templates.

### 2. Start the backend

**Windows**
```bat
backend\run.bat
```

**Linux / macOS**
```bash
chmod +x backend/run.sh
./backend/run.sh
```

The script runs:

```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Paste the Supabase service-role key

Open `backend/app/database.py`. Find the line:

```python
SUPABASE_SERVICE_ROLE_KEY = "PASTE_YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE"
```

Replace `PASTE_YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE` with the actual
service-role key from **Supabase → Project Settings → API**.

Restart the backend (`Ctrl+C`, then run.bat / run.sh again).

### 4. Start the frontend

```bash
# from project root
frontend-run.bat       # or: ./frontend-run.sh
```

Vite opens on **http://localhost:5173** and goes straight to `/dashboard`.

---

## 🔍 Verify the connection

| URL | Expected |
|---|---|
| `http://localhost:8000/` | `{"success": true, "service": "Invoice Automation API"}` |
| `http://localhost:8000/api/health` | `{"success": true, "database": "connected", "storage": "connected"}` |
| `http://localhost:5173/` | Dashboard loads, no "Network Error" |

If `/api/health` reports an error, the JSON contains `database_error` and
`storage_error` with the real reason.

---

## 🧱 Architecture

```
React (Vite, JSX)                   FastAPI (Python)
   ↓                                    ↓
Axios → http://localhost:8000   →   routes
   ↑                                    ↓
   JSON {success, data}            ONE Supabase client
                                        ↓
                                  Supabase PostgreSQL
                                  Supabase Storage
```

- **One** centralized Supabase client: `backend/app/database.py`.
- **One** centralized Axios client: `src/services/api.js`.
- CORS is set to `http://localhost:5173` and `http://127.0.0.1:5173`.
- No `.env` file is read by the backend for Supabase.
- The service-role key is hardcoded in **one** Python file, and is never
  sent to the frontend, never logged, never printed, never returned from
  any API endpoint.

---

## 🩺 Diagnostics

If a page shows an error, open the browser dev console. Every API error is
`console.error`'d with the URL, method, status, and the full backend
response body. The UI displays the backend `message` (e.g. `"Table not
found. Run database/supabase_schema.sql"`).

`/api/health` returns:
```json
{
  "success": true,
  "database": "connected",
  "storage": "connected",
  "database_error": null,
  "storage_error": null
}
```

---

## 📁 Project layout

```
.
├── backend/
│   ├── app/
│   │   ├── main.py                       # FastAPI entry, CORS
│   │   ├── database.py                   # ONE Supabase client (hardcoded)
│   │   ├── routes/
│   │   │   ├── health.py                 # /api/health
│   │   │   ├── dashboard.py
│   │   │   ├── clients.py
│   │   │   ├── invoices.py
│   │   │   ├── email_templates.py
│   │   │   ├── settings.py
│   │   │   ├── logs.py
│   │   │   └── payment_followups.py
│   │   ├── schemas/                      # Pydantic models
│   │   ├── services/                     # business logic
│   │   └── utils/                        # serialization, template rendering
│   ├── requirements.txt
│   ├── run.bat
│   └── run.sh
├── database/
│   └── supabase_schema.sql
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── layouts/Layout.jsx
│   ├── components/ui.jsx
│   ├── pages/                            # Dashboard, Invoices, …
│   ├── services/api.js                   # ONE Axios client
│   └── hooks/useToast.jsx
├── package.json
├── vite.config.js
├── frontend-run.bat
├── frontend-run.sh
└── README.md
```

---

## 🔁 Workflow

1. **Finance** → Settings → Clients → add a client.
2. **Finance** → Invoices → Upload Invoice. File → Supabase Storage.
   Invoice row → status `Pending Approval`. Manager is emailed.
3. **Manager** → Pending Approval → Approve / Reject. Status changes,
   email sent, audit log written.
4. **Ops** → Approved → Share with Client. Backend auto-fetches
   `client_email` from the database, sends real SMTP with attachment,
   status → `Sent to Client`, `payment_due_date = sent_at + 25 days`.
5. **Background scheduler** runs every N minutes. Sends `Payment Reminder`
   once per invoice 25 days after `sent_at`, then sets
   `payment_reminder_sent_at` so it never re-sends.
6. **Payment Follow-ups** → Mark Payment Received →
   `payment_status = Received`. No more reminders.

---

## 💰 Currency

All amounts in **₹ Indian Rupees** (`Intl.NumberFormat("en-IN", {currency:"INR"})`).
The database stores `NUMERIC(15,2)`.
