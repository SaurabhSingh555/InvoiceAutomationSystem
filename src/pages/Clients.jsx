import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Power, Search } from "lucide-react";
import {
  getClients,
  createClient,
  updateClient,
  deleteClient,
} from "../services/api";
import {
  PageHeader,
  Button,
  Input,
  Modal,
  Select,
  LoadingState,
  EmptyState,
  ErrorState,
  StatusBadge,
  ConfirmDialog,
} from "../components/ui";
import { useToast } from "../hooks/useToast";

export default function Clients() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [edit, setEdit] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getClients();
      setItems(Array.isArray(res) ? res : []);
    } catch (e) {
      setError(e?.message || "Unable to load clients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = items.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [c.client_name, c.client_code, c.client_email].some((v) =>
      (v || "").toLowerCase().includes(q)
    );
  });

  const toggle = async (c) => {
    try {
      await updateClient(c.id, { status: c.status === "Active" ? "Inactive" : "Active" });
      toast.notify(
        `Client ${c.status === "Active" ? "deactivated" : "activated"}`,
        "success"
      );
      load();
    } catch (e) {
      toast.notify(e?.message || "Failed to update", "error");
    }
  };

  const onDelete = async () => {
    try {
      await deleteClient(confirm.id);
      toast.notify("Client deleted", "success");
      setConfirm(null);
      load();
    } catch (e) {
      toast.notify(e?.message || "Delete failed", "error");
    }
  };

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle="Manage client master data"
        actions={
          <Button onClick={() => setEdit({})}>
            <Plus size={14} /> Add Client
          </Button>
        }
      />
      <div className="bg-white border border-slate-200 rounded-lg p-3 mb-4 flex items-center gap-2">
        <Search size={16} className="text-slate-400 ml-2" />
        <input
          placeholder="Search clients..."
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
          title="No clients found"
          description="Add your first client to begin uploading invoices."
          icon="👥"
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Client Name</th>
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">CC</th>
                  <th className="px-4 py-3 text-left">BCC</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-medium">{c.client_name}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {c.client_code}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {c.client_email}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {asText(c.cc_emails)}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {asText(c.bcc_emails)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggle(c)}
                        >
                          <Power size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEdit(c)}
                        >
                          <Edit2 size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirm(c)}
                        >
                          <Trash2 size={14} className="text-rose-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ClientForm
        open={!!edit}
        initial={edit}
        onClose={() => setEdit(null)}
        onSuccess={() => {
          setEdit(null);
          toast.notify(edit?.id ? "Client updated" : "Client created", "success");
          load();
        }}
      />
      <ConfirmDialog
        open={!!confirm}
        title="Delete Client"
        message={`Are you sure you want to delete "${confirm?.client_name}"?`}
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={onDelete}
      />
    </div>
  );
}

function asText(val) {
  if (Array.isArray(val)) return val.filter(Boolean).join(", ");
  if (typeof val === "string") return val;
  if (val == null) return "—";
  return String(val);
}

function ClientForm({ open, initial, onClose, onSuccess }) {
  const toast = useToast();
  const isEdit = !!(initial && initial.id);
  const [form, setForm] = useState({
    client_name: "",
    client_code: "",
    client_email: "",
    cc_emails: "",
    bcc_emails: "",
    status: "Active",
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initial) {
      setForm({
        client_name: initial.client_name || "",
        client_code: initial.client_code || "",
        client_email: initial.client_email || "",
        cc_emails: asText(initial.cc_emails) === "—" ? "" : asText(initial.cc_emails),
        bcc_emails: asText(initial.bcc_emails) === "—" ? "" : asText(initial.bcc_emails),
        status: initial.status || "Active",
      });
    }
  }, [initial]);

  const validate = () => {
    const e = {};
    if (!form.client_name.trim()) e.client_name = "Required";
    if (!form.client_code.trim()) e.client_code = "Required";
    if (!form.client_email.trim()) e.client_email = "Required";
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.client_email))
      e.client_email = "Invalid email";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        client_name: form.client_name,
        client_code: form.client_code,
        client_email: form.client_email,
        cc_emails: form.cc_emails
          ? form.cc_emails.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        bcc_emails: form.bcc_emails
          ? form.bcc_emails.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        status: form.status,
      };
      if (isEdit) {
        await updateClient(initial.id, payload);
      } else {
        await createClient(payload);
      }
      onSuccess();
    } catch (e) {
      toast.notify(e?.message || "Save failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Client" : "Add Client"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Saving..." : isEdit ? "Update" : "Create"}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Client Name"
          value={form.client_name}
          onChange={(e) => setForm({ ...form, client_name: e.target.value })}
          error={errors.client_name}
        />
        <Input
          label="Client Code"
          value={form.client_code}
          onChange={(e) => setForm({ ...form, client_code: e.target.value })}
          error={errors.client_code}
        />
        <Input
          label="Client Email"
          type="email"
          value={form.client_email}
          onChange={(e) => setForm({ ...form, client_email: e.target.value })}
          error={errors.client_email}
        />
        <Select
          label="Status"
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
        >
          <option>Active</option>
          <option>Inactive</option>
        </Select>
        <Input
          label="CC Emails (comma separated)"
          value={form.cc_emails}
          onChange={(e) => setForm({ ...form, cc_emails: e.target.value })}
        />
        <Input
          label="BCC Emails (comma separated)"
          value={form.bcc_emails}
          onChange={(e) => setForm({ ...form, bcc_emails: e.target.value })}
        />
      </form>
    </Modal>
  );
}
