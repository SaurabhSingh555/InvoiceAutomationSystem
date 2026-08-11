import { useEffect, useState } from "react";
import { Check, IndianRupee } from "lucide-react";
import { getPaymentFollowups, markPaymentReceived } from "../services/api";
import {
  PageHeader,
  Button,
  LoadingState,
  EmptyState,
  ErrorState,
  StatusBadge,
  Select,
} from "../components/ui";
import { formatINR, formatDate } from "../utils";
import { useToast } from "../hooks/useToast";

const FILTERS = [
  { value: "", label: "All" },
  { value: "pending_payment", label: "Pending Payment" },
  { value: "payment_received", label: "Payment Received" },
  { value: "reminder_sent", label: "Reminder Sent" },
  { value: "reminder_due", label: "Reminder Due" },
];

export default function PaymentFollowUps() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [markingId, setMarkingId] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const params = filter ? { filter } : {};
      const res = await getPaymentFollowups(params);
      setItems(Array.isArray(res) ? res : []);
    } catch (e) {
      setError(e?.message || "Unable to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [filter]);

  const mark = async (inv) => {
    setMarkingId(inv.id);
    try {
      await markPaymentReceived(inv.id, { received_by: "Ops" });
      toast.notify("Payment marked as received", "success");
      load();
    } catch (e) {
      toast.notify(e?.message || "Failed to update", "error");
    } finally {
      setMarkingId("");
    }
  };

  return (
    <div>
      <PageHeader
        title="Payment Follow-ups"
        subtitle="Track sent invoices and 25-day payment reminders"
        actions={
          <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
            {FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </Select>
        }
      />
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState description={error} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No payment records"
          description="Sent invoices will appear here for payment follow-up."
          icon="💰"
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Invoice #</th>
                  <th className="px-4 py-3 text-left">Client</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-left">Sent Date</th>
                  <th className="px-4 py-3 text-left">Follow-up Date</th>
                  <th className="px-4 py-3 text-left">Payment</th>
                  <th className="px-4 py-3 text-left">Reminder</th>
                  <th className="px-4 py-3 text-left">Received At</th>
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
                    <td className="px-4 py-3 text-slate-700">
                      {inv.client?.client_name || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatINR(inv.invoice_amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(inv.sent_at)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(inv.payment_due_date)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={inv.payment_status || "Pending"} />
                    </td>
                    <td className="px-4 py-3">
                      {inv.payment_reminder_sent_at ? (
                        <StatusBadge status="Reminder Sent" />
                      ) : inv.reminder_due ? (
                        <StatusBadge status="Reminder Due" />
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {formatDate(inv.payment_received_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {inv.payment_status !== "Received" && (
                        <Button
                          size="sm"
                          variant="success"
                          disabled={markingId === inv.id}
                          onClick={() => mark(inv)}
                        >
                          <Check size={14} />{" "}
                          {markingId === inv.id ? "Updating..." : "Mark Received"}
                        </Button>
                      )}
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
