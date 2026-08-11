import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./layouts/Layout";
import Dashboard from "./pages/Dashboard";
import Invoices from "./pages/Invoices";
import PendingApproval from "./pages/PendingApproval";
import ApprovedInvoices from "./pages/ApprovedInvoices";
import SentInvoices from "./pages/SentInvoices";
import PaymentFollowUps from "./pages/PaymentFollowUps";
import Clients from "./pages/Clients";
import EmailLogs from "./pages/EmailLogs";
import AuditLogs from "./pages/AuditLogs";
import Settings from "./pages/Settings";
import SettingsSMTP from "./pages/SettingsSMTP";
import SettingsManager from "./pages/SettingsManager";
import SettingsClients from "./pages/SettingsClients";
import SettingsEmailTemplates from "./pages/SettingsEmailTemplates";
import SettingsAutomation from "./pages/SettingsAutomation";
import SystemHealth from "./pages/SystemHealth";
import { ToastProvider } from "./hooks/useToast";

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/pending-approval" element={<PendingApproval />} />
          <Route path="/approved" element={<ApprovedInvoices />} />
          <Route path="/sent" element={<SentInvoices />} />
          <Route path="/payment-followups" element={<PaymentFollowUps />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/email-logs" element={<EmailLogs />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/clients" element={<SettingsClients />} />
          <Route path="/settings/smtp" element={<SettingsSMTP />} />
          <Route path="/settings/manager" element={<SettingsManager />} />
          <Route path="/settings/automation" element={<SettingsAutomation />} />
          <Route
            path="/settings/email-templates"
            element={<SettingsEmailTemplates />}
          />
          <Route path="/settings/system-health" element={<SystemHealth />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </ToastProvider>
  );
}
