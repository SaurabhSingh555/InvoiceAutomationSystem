import axios from "axios";

const API_BASE_URL = "https://invoice-automation-system-5pb4-cyan.vercel.app";

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    let message = "Network Error";
    let details = {};
    if (err?.response?.data) {
      details = err.response.data;
      if (err.response.data.message) message = err.response.data.message;
      else if (typeof err.response.data === "string") message = err.response.data;
    } else if (err?.message) {
      message = err.message;
    }
    
    // Check if it's a pure network error (connection refused)
    if (!err.response && err.message === "Network Error") {
      message = "Backend is not running. Please start FastAPI on port 8000 (run backend/run.bat).";
    }

    // eslint-disable-next-line no-console
    console.error("[API ERROR]", {
      url: err?.config?.url,
      method: err?.config?.method,
      status: err?.response?.status,
      details,
      raw: err?.message,
    });
    return Promise.reject({
      message,
      status: err?.response?.status,
      details,
    });
  }
);

function unwrap(promise) {
  return promise.then((res) => {
    const body = res?.data;
    if (body && typeof body === "object" && "success" in body) {
      if (body.success === false) {
        return Promise.reject({
          message: body.message || "Request failed",
          status: res.status,
          details: body,
        });
      }
      return body.data ?? body;
    }
    return body;
  });
}

// Health
export const getHealth = () => unwrap(client.get("/api/health"));
export const testSMTPConnection = () =>
  unwrap(client.post("/api/settings/smtp/test-connection"));

// Dashboard
export const getDashboard = () => unwrap(client.get("/api/dashboard"));

// Clients
export const getClients = (params = {}) =>
  unwrap(client.get("/api/clients", { params }));
export const getClient = (id) => unwrap(client.get(`/api/clients/${id}`));
export const createClient = (data) => unwrap(client.post("/api/clients", data));
export const updateClient = (id, data) =>
  unwrap(client.put(`/api/clients/${id}`, data));
export const deleteClient = (id) =>
  unwrap(client.delete(`/api/clients/${id}`));

// Invoices
export const getInvoices = (params = {}) =>
  unwrap(client.get("/api/invoices", { params }));
export const getInvoice = (id) => unwrap(client.get(`/api/invoices/${id}`));
export const createInvoice = (formData) =>
  unwrap(
    client.post("/api/invoices", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  );
export const approveInvoice = (id, data) =>
  unwrap(client.post(`/api/invoices/${id}/approve`, data));
export const rejectInvoice = (id, data) =>
  unwrap(client.post(`/api/invoices/${id}/reject`, data));
export const shareInvoice = (id, data) =>
  unwrap(client.post(`/api/invoices/${id}/share`, data));
export const markPaymentReceived = (id, data) =>
  unwrap(client.post(`/api/invoices/${id}/payment-received`, data));
export const getInvoiceAuditLogs = (id) =>
  unwrap(client.get(`/api/invoices/${id}/audit-logs`));
export const getInvoiceEmailLogs = (id) =>
  unwrap(client.get(`/api/invoices/${id}/email-logs`));
export const downloadInvoice = (id) =>
  client.get(`/api/invoices/${id}/download`, { responseType: "blob" });

// Email Templates
export const getEmailTemplates = (params = {}) =>
  unwrap(client.get("/api/email-templates", { params }));
export const createEmailTemplate = (data) =>
  unwrap(client.post("/api/email-templates", data));
export const updateEmailTemplate = (id, data) =>
  unwrap(client.put(`/api/email-templates/${id}`, data));
export const deleteEmailTemplate = (id) =>
  unwrap(client.delete(`/api/email-templates/${id}`));
export const renderTemplate = (data) =>
  unwrap(client.post("/api/email-templates/render", data));

// Settings
export const getSMTPSettings = () =>
  unwrap(client.get("/api/settings/smtp"));
export const updateSMTPSettings = (data) =>
  unwrap(client.put("/api/settings/smtp", data));
export const testSMTPSettings = (data) =>
  unwrap(client.post("/api/settings/smtp/test", data));

export const getManagerSettings = () =>
  unwrap(client.get("/api/settings/manager"));
export const updateManagerSettings = (data) =>
  unwrap(client.put("/api/settings/manager", data));

export const getAppSettings = () => unwrap(client.get("/api/settings/app"));
export const updateAppSettings = (data) =>
  unwrap(client.put("/api/settings/app", data));

// Logs
export const getEmailLogs = () => unwrap(client.get("/api/email-logs"));
export const getAuditLogs = () => unwrap(client.get("/api/audit-logs"));

// Payment follow-ups
export const getPaymentFollowups = (params = {}) =>
  unwrap(client.get("/api/payment-followups", { params }));

export default client;
