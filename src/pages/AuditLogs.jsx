import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { getAuditLogs } from "../services/api";
import {
  PageHeader,
  LoadingState,
  EmptyState,
  ErrorState,
} from "../components/ui";
import { cn, formatDateTime } from "../utils";

const ACTION_COLORS = {
  CREATED: "bg-slate-100 text-slate-700",
  SUBMITTED: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-rose-100 text-rose-700",
  SHARED: "bg-indigo-100 text-indigo-700",
  EMAIL_SENT: "bg-emerald-100 text-emerald-700",
  EMAIL_FAILED: "bg-rose-100 text-rose-700",
  PAYMENT_RECEIVED: "bg-teal-100 text-teal-700",
  PAYMENT_REMINDER_SENT: "bg-pink-100 text-pink-700",
};

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await getAuditLogs();
        setLogs(Array.isArray(res) ? res : []);
      } catch (e) {
        setError(e?.message || "Unable to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = logs.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [
      l.action,
      l.performed_by,
      l.invoice_number,
      l.remarks,
      l.new_status,
    ].some((v) => (v || "").toLowerCase().includes(q));
  });

  return (
    <div>
      <PageHeader title="Audit Logs" subtitle="Complete activity history" />
      <div className="bg-white border border-slate-200 rounded-lg p-3 mb-4 flex items-center gap-2">
        <Search size={16} className="text-slate-400 ml-2" />
        <input
          placeholder="Search logs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-2 py-1.5 text-sm bg-transparent focus:outline-none"
        />
      </div>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState description={error} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No audit logs"
          description="Activity will appear here as actions occur."
          icon="📜"
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">Invoice</th>
                  <th className="px-4 py-3 text-left">Status Change</th>
                  <th className="px-4 py-3 text-left">Performed By</th>
                  <th className="px-4 py-3 text-left">Remarks</th>
                  <th className="px-4 py-3 text-left">IP</th>
                  <th className="px-4 py-3 text-left">When</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} className="border-b border-slate-100">
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-block px-2 py-0.5 rounded text-xs font-medium",
                          ACTION_COLORS[l.action] || "bg-slate-100 text-slate-700"
                        )}
                      >
                        {l.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {l.invoice_number || l.invoice_id || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {(l.old_status || "—") + " → " + (l.new_status || "—")}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {l.performed_by || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">
                      {l.remarks || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {l.ip_address || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {formatDateTime(l.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
