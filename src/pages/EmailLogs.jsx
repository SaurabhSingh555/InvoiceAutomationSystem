import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { getEmailLogs } from "../services/api";
import {
  PageHeader,
  LoadingState,
  EmptyState,
  ErrorState,
  StatusBadge,
} from "../components/ui";
import { formatDateTime } from "../utils";

export default function EmailLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await getEmailLogs();
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
      l.subject,
      l.recipient_email,
      l.sender_email,
      l.invoice_number,
      l.email_type,
    ].some((v) => (v || "").toLowerCase().includes(q));
  });

  return (
    <div>
      <PageHeader title="Email Logs" subtitle="All email attempts" />
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
          title="No email logs"
          description="Email activity will appear here."
          icon="📧"
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Invoice</th>
                  <th className="px-4 py-3 text-left">Subject</th>
                  <th className="px-4 py-3 text-left">Sender</th>
                  <th className="px-4 py-3 text-left">Recipient</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">When</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} className="border-b border-slate-100">
                    <td className="px-4 py-3 text-slate-600">{l.email_type}</td>
                    <td className="px-4 py-3 font-medium">
                      {l.invoice_number || l.invoice_id || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-xs truncate">
                      {l.subject}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {l.sender_email || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {l.recipient_email || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {formatDateTime(l.sent_at || l.created_at)}
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
