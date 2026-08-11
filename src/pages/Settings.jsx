import { Link } from "react-router-dom";
import {
  Users,
  Mail,
  UserCog,
  FileText,
  ArrowRight,
  Activity,
} from "lucide-react";
import { PageHeader } from "../components/ui";

import { Zap } from "lucide-react";

const items = [
  {
    to: "/settings/clients",
    label: "Clients",
    desc: "Add, edit, activate/deactivate clients",
    icon: Users,
    color: "indigo",
  },
  {
    to: "/settings/smtp",
    label: "SMTP",
    desc: "Configure email server & test connection",
    icon: Mail,
    color: "emerald",
  },
  {
    to: "/settings/manager",
    label: "Manager",
    desc: "Set the active manager for approvals",
    icon: UserCog,
    color: "amber",
  },
  {
    to: "/settings/automation",
    label: "Automation Rules",
    desc: "Zero-touch delivery & Senior Mgmt CCs",
    icon: Zap,
    color: "violet",
  },
  {
    to: "/settings/email-templates",
    label: "Email Templates",
    desc: "Manage notification templates",
    icon: FileText,
    color: "rose",
  },
  {
    to: "/settings/system-health",
    label: "System Health",
    desc: "Test Backend, Database, Storage and SMTP",
    icon: Activity,
    color: "sky",
  },
];

const colors = {
  indigo: "bg-indigo-50 text-indigo-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  rose: "bg-rose-50 text-rose-600",
  sky: "bg-sky-50 text-sky-600",
  violet: "bg-violet-50 text-violet-600",
};

export default function Settings() {
  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Configure your invoice automation system"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              className="bg-white border border-slate-200 rounded-lg p-5 hover:shadow-md transition-shadow flex items-center gap-4"
            >
              <div
                className={`w-12 h-12 rounded-lg flex items-center justify-center ${colors[it.color]}`}
              >
                <Icon size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-800">{it.label}</h3>
                <p className="text-sm text-slate-500 mt-0.5">{it.desc}</p>
              </div>
              <ArrowRight size={18} className="text-slate-400" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
