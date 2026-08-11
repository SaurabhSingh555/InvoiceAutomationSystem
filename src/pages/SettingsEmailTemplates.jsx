import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Power } from "lucide-react";
import {
  getEmailTemplates,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
} from "../services/api";
import {
  PageHeader,
  Button,
  Input,
  Textarea,
  Select,
  Modal,
  LoadingState,
  EmptyState,
  ErrorState,
  StatusBadge,
  ConfirmDialog,
} from "../components/ui";
import { useToast } from "../hooks/useToast";

const SUGGESTED_VARS = [
  "{{client_name}}",
  "{{invoice_number}}",
  "{{invoice_amount}}",
  "{{invoice_date}}",
  "{{due_date}}",
  "{{uploaded_by}}",
  "{{approved_by}}",
  "{{rejected_by}}",
  "{{sender_name}}",
];

export default function SettingsEmailTemplates() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [edit, setEdit] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getEmailTemplates();
      setItems(Array.isArray(res) ? res : []);
    } catch (e) {
      setError(e?.message || "Unable to load templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = async (t) => {
    try {
      await updateEmailTemplate(t.id, {
        status: t.status === "Active" ? "Inactive" : "Active",
      });
      toast.notify(
        `Template ${t.status === "Active" ? "deactivated" : "activated"}`,
        "success"
      );
      load();
    } catch (e) {
      toast.notify(e?.message || "Failed to update", "error");
    }
  };

  const onDelete = async () => {
    try {
      await deleteEmailTemplate(confirm.id);
      toast.notify("Template deleted", "success");
      setConfirm(null);
      load();
    } catch (e) {
      toast.notify(e?.message || "Delete failed", "error");
    }
  };

  return (
    <div>
      <PageHeader
        title="Email Templates"
        subtitle="Manage notification templates"
        actions={
          <Button onClick={() => setEdit({})}>
            <Plus size={14} /> Add Template
          </Button>
        }
      />
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState description={error} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No email templates"
          description="Create your first template."
          icon="📝"
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left">Template Name</th>
                  <th className="px-4 py-3 text-left">Subject</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-medium">{t.template_name}</td>
                    <td className="px-4 py-3 text-slate-600">{t.subject}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggle(t)}
                        >
                          <Power size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEdit(t)}
                        >
                          <Edit2 size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirm(t)}
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

      <TemplateForm
        open={!!edit}
        initial={edit}
        onClose={() => setEdit(null)}
        onSuccess={() => {
          setEdit(null);
          toast.notify(edit?.id ? "Template updated" : "Template created", "success");
          load();
        }}
      />
      <ConfirmDialog
        open={!!confirm}
        title="Delete Template"
        message={`Delete template "${confirm?.template_name}"?`}
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={onDelete}
      />
    </div>
  );
}

function TemplateForm({ open, initial, onClose, onSuccess }) {
  const toast = useToast();
  const isEdit = !!(initial && initial.id);
  const [form, setForm] = useState({
    template_name: "",
    subject: "",
    body: "",
    status: "Active",
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initial) {
      setForm({
        template_name: initial.template_name || "",
        subject: initial.subject || "",
        body: initial.body || "",
        status: initial.status || "Active",
      });
    }
  }, [initial]);

  const validate = () => {
    const e = {};
    if (!form.template_name.trim()) e.template_name = "Required";
    if (!form.subject.trim()) e.subject = "Required";
    if (!form.body.trim()) e.body = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (isEdit) {
        await updateEmailTemplate(initial.id, form);
      } else {
        await createEmailTemplate(form);
      }
      onSuccess();
    } catch (e) {
      toast.notify(e?.message || "Save failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const insertVar = (v) => {
    setForm({ ...form, body: (form.body ? form.body + " " : "") + v });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Email Template" : "Add Email Template"}
      size="lg"
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
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Template Name"
            value={form.template_name}
            onChange={(e) => setForm({ ...form, template_name: e.target.value })}
            error={errors.template_name}
            placeholder="e.g. Invoice Submitted"
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option>Active</option>
            <option>Inactive</option>
          </Select>
        </div>
        <Input
          label="Subject"
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          error={errors.subject}
        />
        <div>
          <label className="text-sm font-medium text-slate-700">Body</label>
          <textarea
            rows={10}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            className="mt-1 w-full px-3 py-2 rounded-md border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
          />
          {errors.body && <span className="text-xs text-rose-600">{errors.body}</span>}
          <div className="mt-2">
            <p className="text-xs text-slate-500 mb-1">Click to insert variable:</p>
            <div className="flex flex-wrap gap-1">
              {SUGGESTED_VARS.map((v) => (
                <button
                  type="button"
                  key={v}
                  onClick={() => insertVar(v)}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-xs rounded font-mono"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
