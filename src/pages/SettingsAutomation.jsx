import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { getAppSettings, updateAppSettings } from "../services/api";
import {
  PageHeader,
  Button,
  Input,
  Select,
  LoadingState,
} from "../components/ui";
import { useToast } from "../hooks/useToast";

export default function SettingsAutomation() {
  const toast = useToast();
  const [form, setForm] = useState({
    auto_share_on_approval: false,
    senior_management_emails: "",
    reminder_enabled: true,
    reminder_interval_minutes: 60,
    reminder_days: 25,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await getAppSettings();
        if (res) {
          setForm({
            auto_share_on_approval: res.auto_share_on_approval || false,
            senior_management_emails: res.senior_management_emails || "",
            reminder_enabled: res.reminder_enabled ?? true,
            reminder_interval_minutes: res.reminder_interval_minutes || 60,
            reminder_days: res.reminder_days || 25,
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
      await updateAppSettings({
        auto_share_on_approval: form.auto_share_on_approval === "true" || form.auto_share_on_approval === true,
        senior_management_emails: form.senior_management_emails,
        reminder_enabled: form.reminder_enabled === "true" || form.reminder_enabled === true,
        reminder_interval_minutes: parseInt(form.reminder_interval_minutes, 10),
        reminder_days: parseInt(form.reminder_days, 10),
      });
      toast.notify("Automation rules saved successfully", "success");
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
        title="Automation Rules"
        subtitle="Configure system-wide automations to streamline workflow."
      />
      <form
        onSubmit={save}
        className="bg-white border border-slate-200 rounded-lg p-6 max-w-3xl space-y-6"
      >
        <div>
          <h3 className="text-sm font-semibold text-slate-800 mb-4 border-b pb-2">
            Invoice Workflow
          </h3>
          <div className="space-y-4">
            <Select
              label="Zero-Touch Client Delivery"
              value={form.auto_share_on_approval}
              onChange={(e) =>
                setForm({ ...form, auto_share_on_approval: e.target.value === "true" })
              }
            >
              <option value="true">Enabled - Auto-share with client instantly when Manager approves</option>
              <option value="false">Disabled - Ops must manually share approved invoices</option>
            </Select>

            <Input
              label="Senior Management Notifications (CC)"
              value={form.senior_management_emails}
              onChange={(e) =>
                setForm({ ...form, senior_management_emails: e.target.value })
              }
              placeholder="e.g. director@company.com, cfo@company.com (comma separated)"
            />
            <p className="text-xs text-slate-500">
              These emails will be CC'd whenever a new invoice is submitted for approval.
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-800 mb-4 border-b pb-2">
            Payment Reminders
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Automatic Payment Reminders"
              value={form.reminder_enabled}
              onChange={(e) =>
                setForm({ ...form, reminder_enabled: e.target.value === "true" })
              }
            >
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </Select>
            <Input
              label="Reminder Due After (Days)"
              type="number"
              value={form.reminder_days}
              onChange={(e) =>
                setForm({ ...form, reminder_days: e.target.value })
              }
            />
            <Input
              label="Background Check Interval (Minutes)"
              type="number"
              value={form.reminder_interval_minutes}
              onChange={(e) =>
                setForm({ ...form, reminder_interval_minutes: e.target.value })
              }
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={saving}>
            <Save size={14} /> {saving ? "Saving..." : "Save Automations"}
          </Button>
        </div>
      </form>
    </div>
  );
}
