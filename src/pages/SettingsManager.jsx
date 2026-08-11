import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { getManagerSettings, updateManagerSettings } from "../services/api";
import {
  PageHeader,
  Button,
  Input,
  Select,
  LoadingState,
} from "../components/ui";
import { useToast } from "../hooks/useToast";

export default function SettingsManager() {
  const toast = useToast();
  const [form, setForm] = useState({
    manager_name: "",
    manager_email: "",
    status: "Active",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await getManagerSettings();
        if (res) {
          setForm({
            manager_name: res.manager_name || "",
            manager_email: res.manager_email || "",
            status: res.status || "Active",
          });
        }
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async (ev) => {
    ev.preventDefault();
    setSaving(true);
    try {
      await updateManagerSettings(form);
      toast.notify("Manager settings saved", "success");
    } catch (e) {
      toast.notify(e?.message || "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="Manager Settings"
        subtitle="Set the active manager who will receive approval notifications"
      />
      <form
        onSubmit={save}
        className="bg-white border border-slate-200 rounded-lg p-6 max-w-2xl space-y-4"
      >
        <Input
          label="Manager Name"
          value={form.manager_name}
          onChange={(e) => setForm({ ...form, manager_name: e.target.value })}
        />
        <Input
          label="Manager Email"
          type="email"
          value={form.manager_email}
          onChange={(e) => setForm({ ...form, manager_email: e.target.value })}
        />
        <Select
          label="Status"
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
        >
          <option>Active</option>
          <option>Inactive</option>
        </Select>
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={saving}>
            <Save size={14} /> {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </div>
  );
}
