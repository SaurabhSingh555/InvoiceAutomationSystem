import { useEffect, useState } from "react";
import { Check, X, Download } from "lucide-react";
import {
  getInvoices,
  approveInvoice,
  rejectInvoice,
  downloadInvoice,
} from "../services/api";
import {
  PageHeader,
  Button,
  Input,
  Modal,
  Textarea,
  LoadingState,
  EmptyState,
  ErrorState,
  StatusBadge,
} from "../components/ui";
import { formatINR, formatDate, formatBytes } from "../utils";
import { useToast } from "../hooks/useToast";

export default function PendingApproval() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [approveFor, setApproveFor] = useState(null);
  const [rejectFor, setRejectFor] = useState(null);
  const [approvedBy, setApprovedBy] = useState("");
  const [rejectedBy, setRejectedBy] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getInvoices({ status: "Pending Approval" });
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

  const onApprove = async () => {
    if (!approvedBy.trim()) {
      toast.notify("Manager name is required", "warning");
      return;
    }
    setSubmitting(true);
    try {
      await approveInvoice(approveFor.id, { approved_by: approvedBy });
      toast.notify("Invoice approved", "success");
      setApproveFor(null);
      setApprovedBy("");
      load();
    } catch (e) {
      toast.notify(e?.message || "Approve failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const onReject = async () => {
    if (!rejectedBy.trim() || !rejectionReason.trim()) {
      toast.notify("Manager name and reason are required", "warning");
      return;
    }
    setSubmitting(true);
    try {
      await rejectInvoice(rejectFor.id, {
        rejected_by: rejectedBy,
        rejection_reason: rejectionReason,
      });
      toast.notify("Invoice rejected", "success");
      setRejectFor(null);
      setRejectedBy("");
      setRejectionReason("");
      load();
    } catch (e) {
      toast.notify(e?.message || "Reject failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Pending Approval"
        subtitle="Review and approve invoices submitted by Finance"
      />
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState description={error} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No pending invoices"
          description="There are no invoices waiting for your approval."
          icon="✅"
        />
      ) : (
        <div className="space-y-3">
          {items.map((inv) => (
            <div
              key={inv.id}
              className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-slate-800">
                      {inv.invoice_number}
                    </h3>
                    <StatusBadge status={inv.status} />
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    {inv.client?.client_name || "—"} ·{" "}
                    {formatINR(inv.invoice_amount)}
                  </p>
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-500">
                    <div>
                      <span className="block text-slate-400">Invoice Date</span>
                      <span className="text-slate-700">
                        {formatDate(inv.invoice_date)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-400">Due Date</span>
                      <span className="text-slate-700">
                        {formatDate(inv.due_date)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-400">Uploaded By</span>
                      <span className="text-slate-700">
                        {inv.uploaded_by}
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-400">Uploaded At</span>
                      <span className="text-slate-700">
                        {formatDate(inv.uploaded_at)}
                      </span>
                    </div>
                  </div>
                  {inv.remarks && (
                    <p className="text-xs text-slate-500 mt-2 italic">
                      Remarks: {inv.remarks}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2 min-w-[200px]">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => download(inv)}
                  >
                    <Download size={14} /> {inv.file_name} ·{" "}
                    {formatBytes(inv.file_size)}
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="success"
                      className="flex-1"
                      onClick={() => setApproveFor(inv)}
                    >
                      <Check size={14} /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      className="flex-1"
                      onClick={() => setRejectFor(inv)}
                    >
                      <X size={14} /> Reject
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!approveFor}
        onClose={() => setApproveFor(null)}
        title={`Approve ${approveFor?.invoice_number || ""}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setApproveFor(null)}>
              Cancel
            </Button>
            <Button variant="success" onClick={onApprove} disabled={submitting}>
              {submitting ? "Approving..." : "Confirm Approve"}
            </Button>
          </>
        }
      >
        <Input
          label="Your Name (Manager)"
          value={approvedBy}
          onChange={(e) => setApprovedBy(e.target.value)}
          placeholder="Enter your name"
        />
        <p className="text-xs text-slate-500 mt-3">
          An approval email will be sent to Ops.
        </p>
      </Modal>

      <Modal
        open={!!rejectFor}
        onClose={() => setRejectFor(null)}
        title={`Reject ${rejectFor?.invoice_number || ""}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectFor(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={onReject} disabled={submitting}>
              {submitting ? "Rejecting..." : "Confirm Reject"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="Your Name (Manager)"
            value={rejectedBy}
            onChange={(e) => setRejectedBy(e.target.value)}
            placeholder="Enter your name"
          />
          <Textarea
            label="Rejection Reason (required)"
            rows={4}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Why is this invoice being rejected?"
          />
          <p className="text-xs text-slate-500">
            A rejection email will be sent to the uploader.
          </p>
        </div>
      </Modal>
    </div>
  );
}
