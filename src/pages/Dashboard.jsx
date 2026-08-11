import { useEffect, useState } from "react";
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  IndianRupee,
  CheckCheck,
  Bell,
} from "lucide-react";
import { getDashboard } from "../services/api";
import { PageHeader, LoadingState, ErrorState } from "../components/ui";
import { formatINR } from "../utils";

const cards = [
  { key: "total_invoices", label: "Total Invoices", icon: FileText, color: "indigo" },
  { key: "pending_approval", label: "Pending Approval", icon: Clock, color: "amber" },
  { key: "approved", label: "Approved", icon: CheckCircle2, color: "emerald" },
  { key: "rejected", label: "Rejected", icon: XCircle, color: "rose" },
  { key: "sent_to_client", label: "Sent to Client", icon: Send, color: "sky" },
  { key: "pending_payment", label: "Pending Payment", icon: IndianRupee, color: "violet" },
  { key: "payment_received", label: "Payment Received", icon: CheckCheck, color: "teal" },
  { key: "payment_reminders_sent", label: "Reminders Sent", icon: Bell, color: "pink" },
  { key: "total_invoice_amount", label: "Total Invoice Amount", icon: IndianRupee, color: "indigo", isCurrency: true },
];

const colorMap = {
  indigo: "from-indigo-500 to-indigo-600",
  amber: "from-amber-500 to-amber-600",
  emerald: "from-emerald-500 to-emerald-600",
  rose: "from-rose-500 to-rose-600",
  sky: "from-sky-500 to-sky-600",
  violet: "from-violet-500 to-violet-600",
  teal: "from-teal-500 to-teal-600",
  pink: "from-pink-500 to-pink-600",
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await getDashboard();
        setData(res || {});
      } catch (e) {
        setError(e?.message || "Unable to load dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingState label="Loading dashboard..." />;
  if (error) return <ErrorState title="Unable to load dashboard" description={error} />;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Real-time overview of your invoice pipeline"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          const raw = data?.[c.key];
          const display = c.isCurrency
            ? formatINR(raw ?? 0)
            : raw ?? 0;
          return (
            <div
              key={c.key}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {c.label}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-800">
                    {display}
                  </p>
                </div>
                <div
                  className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorMap[c.color]} flex items-center justify-center text-white`}
                >
                  <Icon size={18} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
