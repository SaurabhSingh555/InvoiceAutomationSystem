import { useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Server,
  Database,
  HardDrive,
  Mail,
} from "lucide-react";
import {
  getHealth,
  testSMTPConnection,
  getClients,
  getInvoices,
  getEmailTemplates,
} from "../services/api";
import { PageHeader, Button, LoadingState } from "../components/ui";
import { useToast } from "../hooks/useToast";

function StatusPill({ ok, label }) {
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border " +
        (ok
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-rose-50 text-rose-700 border-rose-200")
      }
    >
      {ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
      {label}
    </span>
  );
}

function HealthRow({ icon: Icon, name, status, message, onTest, testing }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-lg">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800">{name}</p>
          {message && (
            <p className="text-xs text-slate-500 truncate max-w-md" title={message}>
              {message}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <StatusPill ok={status === "connected"} label={status} />
        {onTest && (
          <Button size="sm" variant="secondary" onClick={onTest} disabled={testing}>
            <RefreshCw size={12} className={testing ? "animate-spin" : ""} />
            {testing ? "Testing..." : "Test"}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function SystemHealth() {
  const toast = useToast();
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState({
    backend: false,
    database: false,
    storage: false,
    smtp: false,
  });
  const [subStatus, setSubStatus] = useState({
    backend: "unknown",
    database: "unknown",
    storage: "unknown",
    smtp: "unknown",
  });
  const [subMessage, setSubMessage] = useState({});

  const loadHealth = async () => {
    setLoading(true);
    try {
      const res = await getHealth();
      setHealth(res);
      setSubStatus((s) => ({
        ...s,
        database: res?.database === "connected" ? "connected" : "error",
        storage: res?.storage === "connected" ? "connected" : "error",
      }));
    } catch (e) {
      setHealth({ success: false, message: e?.message });
      setSubStatus((s) => ({ ...s, database: "error", storage: "error" }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
    testBackend();
  }, []);

  const testBackend = async () => {
    setTesting((s) => ({ ...s, backend: true }));
    try {
      // any cheap call proves the backend is reachable
      await getClients();
      setSubStatus((s) => ({ ...s, backend: "connected" }));
      setSubMessage((m) => ({ ...m, backend: "API responded successfully" }));
    } catch (e) {
      setSubStatus((s) => ({ ...s, backend: "error" }));
      setSubMessage((m) => ({ ...m, backend: e?.message }));
    } finally {
      setTesting((s) => ({ ...s, backend: false }));
    }
  };

  const testDatabase = async () => {
    setTesting((s) => ({ ...s, database: true }));
    try {
      // exercise multiple tables
      await Promise.all([getClients(), getInvoices(), getEmailTemplates()]);
      setSubStatus((s) => ({ ...s, database: "connected" }));
      setSubMessage((m) => ({ ...m, database: "Tables responded" }));
      toast.notify("Database connection OK", "success");
    } catch (e) {
      setSubStatus((s) => ({ ...s, database: "error" }));
      setSubMessage((m) => ({ ...m, database: e?.message }));
      toast.notify(e?.message || "Database test failed", "error");
    } finally {
      setTesting((s) => ({ ...s, database: false }));
    }
  };

  const testStorage = async () => {
    setTesting((s) => ({ ...s, storage: true }));
    try {
      const res = await getHealth();
      if (res?.storage === "connected") {
        setSubStatus((s) => ({ ...s, storage: "connected" }));
        setSubMessage((m) => ({ ...m, storage: "Bucket reachable" }));
        toast.notify("Storage connection OK", "success");
      } else {
        setSubStatus((s) => ({ ...s, storage: "error" }));
        setSubMessage((m) => ({ ...m, storage: res?.message || "Bucket missing" }));
        toast.notify(res?.message || "Storage not connected", "error");
      }
    } catch (e) {
      setSubStatus((s) => ({ ...s, storage: "error" }));
      setSubMessage((m) => ({ ...m, storage: e?.message }));
      toast.notify(e?.message || "Storage test failed", "error");
    } finally {
      setTesting((s) => ({ ...s, storage: false }));
    }
  };

  const testSMTP = async () => {
    setTesting((s) => ({ ...s, smtp: true }));
    try {
      const res = await testSMTPConnection();
      if (res?.success) {
        setSubStatus((s) => ({ ...s, smtp: "connected" }));
        setSubMessage((m) => ({ ...m, smtp: res.message || "Connected" }));
        toast.notify("SMTP connection OK", "success");
      } else {
        setSubStatus((s) => ({ ...s, smtp: "error" }));
        setSubMessage((m) => ({ ...m, smtp: res?.message || "Failed" }));
        toast.notify(res?.message || "SMTP failed", "error");
      }
    } catch (e) {
      setSubStatus((s) => ({ ...s, smtp: "error" }));
      setSubMessage((m) => ({ ...m, smtp: e?.message }));
      toast.notify(e?.message || "SMTP test failed", "error");
    } finally {
      setTesting((s) => ({ ...s, smtp: false }));
    }
  };

  if (loading && !health) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="System Health"
        subtitle="Verify the backend, Supabase database, storage and SMTP"
        actions={
          <Button variant="secondary" onClick={loadHealth}>
            <RefreshCw size={14} /> Refresh
          </Button>
        }
      />

      {health && !health.env_ok && (
        <div className="mb-4 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
          <p className="font-semibold text-sm">Backend is not configured.</p>
          <p className="text-xs mt-1">
            Missing environment variables:{" "}
            <code className="font-mono">
              {(health.missing_env || []).join(", ")}
            </code>
            . Edit <code>backend/.env</code> and restart FastAPI.
          </p>
        </div>
      )}

      <div className="space-y-3 max-w-3xl">
        <HealthRow
          icon={Server}
          name="Backend API"
          status={subStatus.backend}
          message={subMessage.backend}
          onTest={testBackend}
          testing={testing.backend}
        />
        <HealthRow
          icon={Database}
          name="Supabase Database"
          status={subStatus.database}
          message={subMessage.database}
          onTest={testDatabase}
          testing={testing.database}
        />
        <HealthRow
          icon={HardDrive}
          name="Supabase Storage"
          status={subStatus.storage}
          message={subMessage.storage}
          onTest={testStorage}
          testing={testing.storage}
        />
        <HealthRow
          icon={Mail}
          name="SMTP"
          status={subStatus.smtp}
          message={subMessage.smtp}
          onTest={testSMTP}
          testing={testing.smtp}
        />
      </div>

      {health?.message && health.success === false && health.env_ok && (
        <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          {health.message}
        </div>
      )}
    </div>
  );
}
