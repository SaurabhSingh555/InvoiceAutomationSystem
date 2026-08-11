import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { getInvoices, downloadInvoice } from "../services/api";
import {
  PageHeader,
  Button,
  LoadingState,
  EmptyState,
  ErrorState,
  StatusBadge,
} from "../components/ui";
import { formatINR, formatDate, formatBytes } from "../utils";
import { useToast } from "../hooks/useToast";

export default function SentInvoices() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getInvoices({ status: "Sent to Client" });
      setItems(Array.isArray(res) ? res : []);
    } catch (e) {
      setError(e?.message || "Unable to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const download = async (inv) => {
    try {
      const blob = await downloadInvoice(inv.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = inv.file_name || `${inv.invoice_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.notify(e?.message || "Download failed", "error");
    }
  };

  return (
    <div>
      <PageHeader
        title="Sent to Client"
        subtitle="Invoices successfully delivered to clients"
      />
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState description={error} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No sent invoices"
          description="Shared invoices will appear here."
          icon="📤"
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Invoice #</th>
                  <th className="px-4 py-3 text-left">Client</th>
                  <th className="px-4 py-3 text-left">Recipient</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-left">Sent By</th>
                  <th className="px-4 py-3 text-left">Sent At</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Payment</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-medium">{inv.invoice_number}</td>
                    <td className="px-4 py-3">{inv.client?.client_name || "—"}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {inv.recipient_email || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatINR(inv.invoice_amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {inv.sent_by || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(inv.sent_at)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={inv.payment_status || "Pending"} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => download(inv)}
                      >
                        <Download size={14} />
                      </Button>
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
