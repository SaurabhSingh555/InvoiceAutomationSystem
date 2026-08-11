import { useState } from "react";
import { NavLink, Outlet, useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Clock,
  CheckCircle2,
  Send,
  Users,
  Mail,
  History,
  Settings as SettingsIcon,
  Menu,
  X,
  IndianRupee,
} from "lucide-react";
import { cn } from "../utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/invoices", label: "Invoices", icon: FileText },
  { to: "/pending-approval", label: "Pending Approval", icon: Clock },
  { to: "/approved", label: "Approved", icon: CheckCircle2 },
  { to: "/sent", label: "Sent to Client", icon: Send },
  { to: "/payment-followups", label: "Payment Follow-ups", icon: IndianRupee },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/email-logs", label: "Email Logs", icon: Mail },
  { to: "/audit-logs", label: "Audit Logs", icon: History },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export default function Layout() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-100 flex flex-col transition-transform",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <Link
          to="/dashboard"
          className="h-16 flex items-center gap-3 px-5 border-b border-slate-800"
        >
          <div className="w-9 h-9 rounded-lg bg-indigo-500 flex items-center justify-center font-bold text-white">
            IA
          </div>
          <div>
            <div className="font-semibold text-sm">Invoice Automation</div>
            <div className="text-xs text-slate-400">Internal System</div>
          </div>
        </Link>
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                    isActive
                      ? "bg-indigo-600 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  )
                }
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="px-4 py-3 border-t border-slate-800 text-xs text-slate-500">
          v1.0 · India ₹
        </div>
      </aside>

      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-900/40 z-30"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 lg:px-6 gap-3">
          <button
            className="lg:hidden p-2 rounded-md text-slate-600 hover:bg-slate-100"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Breadcrumbs path={loc.pathname} />
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Breadcrumbs({ path }) {
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) {
    return <span className="text-sm font-semibold text-slate-700">Dashboard</span>;
  }
  return (
    <div className="flex items-center gap-1 text-sm">
      {parts.map((p, i) => {
        const label = p
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-slate-400">/</span>}
            <span
              className={
                i === parts.length - 1
                  ? "text-slate-900 font-semibold"
                  : "text-slate-600"
              }
            >
              {label}
            </span>
          </span>
        );
      })}
    </div>
  );
}
