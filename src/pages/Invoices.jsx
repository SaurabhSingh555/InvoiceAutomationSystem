import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Filter, X, Upload } from "lucide-react";
import { getInvoices, getClients, createInvoice } from "../services/api";
import {
  PageHeader,
  Button,
  Input,
  Select,
  Modal,
  Textarea,
  LoadingState,
  EmptyState,
  ErrorState,
  StatusBadge,
} from "../components/ui";
import { formatINR, formatDate, formatBytes } from "../utils";
import { useToast } from "../hooks/useToast";

const STATUSES = [
  "",
  "Pending Approval",
  "Approved",
  "Rejected",
  "Sent to Client",
];

export default function Invoices() {
  const toast = useToast();
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    client_id: "",
    status: "",
    invoice_number: "",
    date_from: "",
    date_to: "",
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params[k] = v;
      });
      const res = await getInvoices(params);
      setInvoices(Array.isArray(res) ? res : []);
    } catch (e) {
      setError(e?.message || "Unable to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const res = await getClients({ status: "Active" });
      setClients(Array.isArray(res) ? res : []);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    load();
    loadClients();
    // eslint-disable-next-line
  }, []);

  const applyFilters = (e) => {
    e?.preventDefault();
    load();
  };

  const clearFilters = () => {
    setFilters({
      client_id: "",
      status: "",
      invoice_number: "",
      date_from: "",
      date_to: "",
    });
    setTimeout(() => load(), 0);
  };

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle="Manage all invoices across the workflow"
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={14} /> Filters
            </Button>
            <Button onClick={() => setShowUpload(true)}>
              <Plus size={14} /> Upload Invoice
            </Button>
          </>
        }
      />

      {showFilters && (
        <form
          onSubmit={applyFilters}
          className="bg-white border border-slate-200 rounded-lg p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
        >
          <Select
            value={filters.client_id}
            onChange={(e) =>
              setFilters({ ...filters, client_id: e.target.value })
            }
          >
            <option value="">All Clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.client_name}
              </option>
            ))}
          </Select>
          <Select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s || "All Statuses"}
              </option>
            ))}
          </Select>
          <Input
            placeholder="Invoice number"
            value={filters.invoice_number}
            onChange={(e) =>
              setFilters({ ...filters, invoice_number: e.target.value })
            }
          />
          <Input
            type="date"
            value={filters.date_from}
            onChange={(e) =>
              setFilters({ ...filters, date_from: e.target.value })
            }
          />
          <div className="flex gap-2">
            <Input
              type="date"
              value={filters.date_to}
              onChange={(e) =>
                setFilters({ ...filters, date_to: e.target.value })
              }
            />
            <Button type="submit">Apply</Button>
            <Button
              type="button"
              variant="secondary"
              onClick={clearFilters}
              className="!px-2.5"
            >
              <X size={14} />
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState title="Unable to load invoices" description={error} />
      ) : invoices.length === 0 ? (
        <EmptyState
          title="No invoices found"
          description="Upload your first invoice to start the workflow."
          icon="📄"
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
                  <th className="px-4 py-3 text-left">Invoice Date</th>
                  <th className="px-4 py-3 text-left">Due Date</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Uploaded By</th>
                  <th className="px-4 py-3 text-left">Approved By</th>
                  <th className="px-4 py-3 text-left">Sent At</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {inv.invoice_number}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {inv.client?.client_name || "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatINR(inv.invoice_amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(inv.invoice_date)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(inv.due_date)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {inv.uploaded_by || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {inv.approved_by || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(inv.sent_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <UploadModal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        clients={clients}
        onSuccess={() => {
          setShowUpload(false);
          toast.notify("Invoice submitted successfully", "success");
          load();
        }}
      />
    </div>
  );
}

function UploadModal({ open, onClose, clients, onSuccess }) {
  const toast = useToast();
  const [form, setForm] = useState({
    client_id: "",
    invoice_number: "",
    invoice_date: "",
    invoice_amount: "",
    due_date: "",
    remarks: "",
    uploaded_by: "",
  });
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm({
        client_id: "",
        invoice_number: "",
        invoice_date: "",
        invoice_amount: "",
        due_date: "",
        remarks: "",
        uploaded_by: "",
      });
      setFile(null);
      setErrors({});
    }
  }, [open]);

  const validate = () => {
    const e = {};
    if (!form.client_id) e.client_id = "Client is required";
    if (!form.invoice_number.trim()) e.invoice_number = "Invoice number is required";
    if (!form.invoice_date) e.invoice_date = "Required";
    if (!form.invoice_amount || isNaN(Number(form.invoice_amount)))
      e.invoice_amount = "Valid amount is required";
    if (!form.due_date) e.due_date = "Required";
    if (!file) e.file = "Invoice file is required";
    if (!form.uploaded_by.trim()) e.uploaded_by = "Uploader name is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append("file", file);
      await createInvoice(fd);
      onSuccess();
    } catch (e) {
      toast.notify(e?.message || "Failed to submit invoice", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Upload Invoice"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            <Upload size={14} /> {submitting ? "Submitting..." : "Submit Invoice"}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Client"
          value={form.client_id}
          onChange={(e) => setForm({ ...form, client_id: e.target.value })}
          error={errors.client_id}
        >
          <option value="">Select client</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.client_name} ({c.client_code})
            </option>
          ))}
        </Select>
        <Input
          label="Invoice Number"
          value={form.invoice_number}
          onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
          error={errors.invoice_number}
        />
        <Input
          type="date"
          label="Invoice Date"
          value={form.invoice_date}
          onChange={(e) => setForm({ ...form, invoice_date: e.target.value })}
          error={errors.invoice_date}
        />
        <Input
          type="date"
          label="Due Date"
          value={form.due_date}
          onChange={(e) => setForm({ ...form, due_date: e.target.value })}
          error={errors.due_date}
        />
        <Input
          type="number"
          step="0.01"
          label="Invoice Amount (₹)"
          value={form.invoice_amount}
          onChange={(e) =>
            setForm({ ...form, invoice_amount: e.target.value })
          }
          error={errors.invoice_amount}
        />
        <Input
          label="Uploaded By (Your Name)"
          value={form.uploaded_by}
          onChange={(e) => setForm({ ...form, uploaded_by: e.target.value })}
          error={errors.uploaded_by}
        />
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-slate-700">
            Invoice File (PDF, XLS, XLSX, max 20MB)
          </label>
          <div className="mt-1 flex items-center gap-3">
            <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-md text-sm hover:bg-slate-50">
              <Upload size={14} /> Choose file
              <input
                type="file"
                accept=".pdf,.xls,.xlsx,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
            {file && (
              <span className="text-xs text-slate-600">
                {file.name} · {formatBytes(file.size)}
              </span>
            )}
          </div>
          {errors.file && (
            <span className="text-xs text-rose-600">{errors.file}</span>
          )}
        </div>
        <div className="md:col-span-2">
          <Textarea
            label="Remarks"
            rows={3}
            value={form.remarks}
            onChange={(e) => setForm({ ...form, remarks: e.target.value })}
          />
        </div>
      </form>
    </Modal>
  );
}
