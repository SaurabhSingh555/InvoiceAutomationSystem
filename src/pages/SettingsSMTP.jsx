import { useEffect, useState } from "react";
import { Save, Send } from "lucide-react";
import {
  getSMTPSettings,
  updateSMTPSettings,
  testSMTPSettings,
} from "../services/api";
import {
  PageHeader,
  Button,
  Input,
  Select,
  LoadingState,
} from "../components/ui";
import { useToast } from "../hooks/useToast";

export default function SettingsSMTP() {
  const toast = useToast();
  const [form, setForm] = useState({
    sender_name: "",
    sender_email: "",
    smtp_host: "",
    smtp_port: 587,
    smtp_username: "",
    smtp_password: "",
    encryption_type: "TLS",
    status: "Active",
  });
  const [hasPassword, setHasPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await getSMTPSettings();
        if (res) {
          setForm({
            sender_name: res.sender_name || "",
            sender_email: res.sender_email || "",
            smtp_host: res.smtp_host || "",
            smtp_port: res.smtp_port || 587,
            smtp_username: res.smtp_username || "",
            smtp_password: "",
            encryption_type: res.encryption_type || "TLS",
            status: res.status || "Active",
          });
          setHasPassword(!!res.smtp_password);
        }
      } catch (e) {
        // first load - leave empty
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async (ev) => {
    ev.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.smtp_password) {
        delete payload.smtp_password;
      }
      const updated = await updateSMTPSettings(payload);
      if (updated) {
        setHasPassword(!!updated.smtp_password);
        setForm((f) => ({ ...f, smtp_password: "" }));
      }
      toast.notify("SMTP settings saved", "success");
    } catch (e) {
      toast.notify(e?.message || "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    if (!testEmail) {
      toast.notify("Enter a test recipient email", "warning");
      return;
    }
    setTesting(true);
    try {
      await testSMTPSettings({ test_email: testEmail });
      toast.notify("Test email sent successfully", "success");
    } catch (e) {
      toast.notify(e?.message || "Test failed", "error");
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader title="SMTP Settings" subtitle="Configure outgoing email server" />
      <form
        onSubmit={save}
        className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 max-w-3xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Sender Name"
            value={form.sender_name}
            onChange={(e) => setForm({ ...form, sender_name: e.target.value })}
          />
          <Input
            label="Sender Email"
            type="email"
            value={form.sender_email}
            onChange={(e) => setForm({ ...form, sender_email: e.target.value })}
          />
          <Input
            label="SMTP Host"
            value={form.smtp_host}
            onChange={(e) => setForm({ ...form, smtp_host: e.target.value })}
            placeholder="smtp.gmail.com"
          />
          <Input
            label="SMTP Port"
            type="number"
            value={form.smtp_port}
            onChange={(e) =>
              setForm({ ...form, smtp_port: Number(e.target.value) })
            }
          />
          <Input
            label="SMTP Username"
            value={form.smtp_username}
            onChange={(e) => setForm({ ...form, smtp_username: e.target.value })}
          />
          <Input
            label={`SMTP Password ${hasPassword ? "(stored)" : ""}`}
            type="password"
            value={form.smtp_password}
            onChange={(e) => setForm({ ...form, smtp_password: e.target.value })}
            placeholder={
              hasPassword ? "Leave empty to keep current" : "Enter password"
            }
          />
          <Select
            label="Encryption"
            value={form.encryption_type}
            onChange={(e) =>
              setForm({ ...form, encryption_type: e.target.value })
            }
          >
            <option value="TLS">TLS</option>
            <option value="SSL">SSL</option>
            <option value="NONE">NONE</option>
          </Select>
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option>Active</option>
            <option>Inactive</option>
          </Select>
        </div>
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={saving}>
            <Save size={14} /> {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </form>

      <div className="mt-6 bg-white border border-slate-200 rounded-lg p-6 max-w-3xl">
        <h3 className="font-semibold text-slate-800 mb-1">Test SMTP Connection</h3>
        <p className="text-sm text-slate-500 mb-4">
          Send a test email to verify SMTP is working correctly.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            type="email"
            placeholder="test-recipient@example.com"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="flex-1"
          />
          <Button onClick={test} disabled={testing}>
            <Send size={14} /> {testing ? "Sending..." : "Send Test Email"}
          </Button>
        </div>
      </div>
    </div>
  );
}
