import { useEffect, useState } from "react";
import { Send, Download } from "lucide-react";
import {
  getInvoices,
  shareInvoice,
  downloadInvoice,
  renderTemplate,
  getSMTPSettings,
} from "../services/api";
import {
  PageHeader,
  Button,
  Input,
  Textarea,
  Modal,
  LoadingState,
  EmptyState,
  ErrorState,
} from "../components/ui";
import { formatINR, formatDate, formatBytes } from "../utils";
import { useToast } from "../hooks/useToast";

export default function ApprovedInvoices() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shareFor, setShareFor] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getInvoices({ status: "Approved" });
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
        title="Approved Invoices"
        subtitle="Share approved invoices with clients via email"
      />
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState description={error} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No approved invoices"
          description="Once invoices are approved they will appear here for sharing."
          icon="📨"
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
                  <th className="px-4 py-3 text-left">Approved By</th>
                  <th className="px-4 py-3 text-left">Approved At</th>
                  <th className="px-4 py-3 text-left">File</th>
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
                      {inv.approved_by}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(inv.approved_at)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      <button
                        onClick={() => download(inv)}
                        className="text-indigo-600 hover:underline"
                      >
                        {inv.file_name} · {formatBytes(inv.file_size)}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" onClick={() => setShareFor(inv)}>
                        <Send size={14} /> Share
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ShareModal
        invoice={shareFor}
        onClose={() => setShareFor(null)}
        onSuccess={() => {
          setShareFor(null);
          toast.notify("Invoice emailed to client successfully", "success");
          load();
        }}
      />
    </div>
  );
}

function ShareModal({ invoice, onClose, onSuccess }) {
  const toast = useToast();
  const [senderName, setSenderName] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [smtp, setSmtp] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!invoice) return;
    (async () => {
      setLoading(true);
      try {
        const [smtpRes, renderRes] = await Promise.all([
          getSMTPSettings().catch(() => null),
          renderTemplate({
            template_name: "Invoice Shared with Client",
            variables: {
              client_name: invoice.client?.client_name || "",
              invoice_number: invoice.invoice_number,
              invoice_amount: formatINR(invoice.invoice_amount),
              invoice_date: formatDate(invoice.invoice_date),
              due_date: formatDate(invoice.due_date),
              sender_name: invoice.approved_by || "Ops Team",
            },
          }).catch(() => null),
        ]);
        setSmtp(smtpRes);
        if (smtpRes?.sender_name) setSenderName(smtpRes.sender_name);
        if (renderRes) {
          setSubject(renderRes.subject || "");
          setBody(renderRes.body || "");
        }
        if (invoice.client) {
          setCc(asText(invoice.client.cc_emails));
          setBcc(asText(invoice.client.bcc_emails));
        }
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line
  }, [invoice]);

  if (!invoice) return null;

  const send = async () => {
    if (!senderName.trim()) {
      toast.notify("Sender name is required", "warning");
      return;
    }
    setSubmitting(true);
    try {
      await shareInvoice(invoice.id, {
        sent_by: senderName,
        cc,
        bcc,
        subject,
        body,
      });
      onSuccess();
    } catch (e) {
      toast.notify(e?.message || "Failed to send", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={!!invoice}
      onClose={onClose}
      title={`Share Invoice ${invoice.invoice_number} with Client`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={send} disabled={submitting || loading}>
            <Send size={14} /> {submitting ? "Sending..." : "Send Invoice"}
          </Button>
        </>
      }
    >
      {loading ? (
        <LoadingState label="Preparing email..." />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-md">
            <div>
              <p className="text-xs text-slate-500">Client Name</p>
              <p className="font-medium">{invoice.client?.client_name || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">
                Client Email (auto-fetched)
              </p>
              <p className="font-medium text-slate-800">
                {invoice.client?.client_email || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Invoice Number</p>
              <p className="font-medium">{invoice.invoice_number}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Invoice Amount</p>
              <p className="font-medium">{formatINR(invoice.invoice_amount)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Sender Email</p>
              <p className="font-medium">{smtp?.sender_email || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Attachment</p>
              <p className="font-medium text-sm">{invoice.file_name}</p>
            </div>
          </div>
          <Input
            label="CC (comma separated)"
            value={cc}
            onChange={(e) => setCc(e.target.value)}
            placeholder="cc1@example.com, cc2@example.com"
          />
          <Input
            label="BCC (comma separated)"
            value={bcc}
            onChange={(e) => setBcc(e.target.value)}
            placeholder="bcc1@example.com"
          />
          <Input
            label="Sender Name (Ops)"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            placeholder="Your name"
          />
          <Input
            label="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <Textarea
            label="Body"
            rows={8}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
      )}
    </Modal>
  );
}

function asText(val) {
  if (Array.isArray(val)) return val.join(", ");
  if (typeof val === "string") return val;
  if (val == null) return "";
  return String(val);
}
