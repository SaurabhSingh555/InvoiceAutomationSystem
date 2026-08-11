import { cn, formatINR } from "../utils";

const statusStyles = {
  "Pending Approval": "bg-amber-50 text-amber-700 border-amber-200",
  Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Rejected: "bg-rose-50 text-rose-700 border-rose-200",
  "Sent to Client": "bg-indigo-50 text-indigo-700 border-indigo-200",
  Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Inactive: "bg-slate-100 text-slate-600 border-slate-200",
  Sent: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Failed: "bg-rose-50 text-rose-700 border-rose-200",
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Received: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Reminder Sent": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Reminder Due": "bg-rose-50 text-rose-700 border-rose-200",
};

export function StatusBadge({ status }) {
  const cls = statusStyles[status] || "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap",
        cls
      )}
    >
      {status}
    </span>
  );
}

export function EmptyState({ title = "No data available", description, icon }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 bg-white border border-slate-200 rounded-lg">
      {icon && <div className="text-5xl mb-3">{icon}</div>}
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 mt-1 max-w-md">{description}</p>
      )}
    </div>
  );
}

export function LoadingState({ label = "Loading..." }) {
  return (
    <div className="flex items-center justify-center py-12 bg-white border border-slate-200 rounded-lg">
      <div className="flex items-center gap-3 text-slate-500">
        <div className="w-5 h-5 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
        <span className="text-sm">{label}</span>
      </div>
    </div>
  );
}

export function ErrorState({ title = "Unable to load", description }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 bg-rose-50 border border-rose-200 rounded-lg">
      <div className="text-5xl mb-3">⚠️</div>
      <h3 className="text-base font-semibold text-rose-800">{title}</h3>
      {description && (
        <p className="text-sm text-rose-600 mt-1 max-w-md">{description}</p>
      )}
    </div>
  );
}

export function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  size = "md",
  disabled = false,
  className = "",
  ...rest
}) {
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white border-transparent",
    secondary:
      "bg-white hover:bg-slate-50 text-slate-700 border-slate-300",
    danger: "bg-rose-600 hover:bg-rose-700 text-white border-transparent",
    success:
      "bg-emerald-600 hover:bg-emerald-700 text-white border-transparent",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-700 border-transparent",
  };
  const sizes = {
    sm: "px-2.5 py-1 text-xs",
    md: "px-3.5 py-2 text-sm",
    lg: "px-4 py-2.5 text-sm",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap",
        variants[variant],
        sizes[size],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Input({ label, error, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-slate-700">{label}</label>
      )}
      <input
        {...props}
        className={cn(
          "px-3 py-2 rounded-md border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400",
          error ? "border-rose-300" : "border-slate-300"
        )}
      />
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </div>
  );
}

export function Textarea({ label, error, rows = 4, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-slate-700">{label}</label>
      )}
      <textarea
        rows={rows}
        {...props}
        className={cn(
          "px-3 py-2 rounded-md border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400",
          error ? "border-rose-300" : "border-slate-300"
        )}
      />
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </div>
  );
}

export function Select({ label, error, children, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-slate-700">{label}</label>
      )}
      <select
        {...props}
        className={cn(
          "px-3 py-2 rounded-md border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400",
          error ? "border-rose-300" : "border-slate-300"
        )}
      >
        {children}
      </select>
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, size = "md" }) {
  if (!open) return null;
  const widths = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl",
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div
        className={cn(
          "bg-white w-full rounded-xl shadow-2xl max-h-[90vh] flex flex-col",
          widths[size]
        )}
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded hover:bg-slate-100"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 rounded-b-xl flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  danger = false,
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
        </div>
        <div className="px-5 py-4 text-sm text-slate-600">{message}</div>
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 rounded-b-xl flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        {subtitle && (
          <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Currency({ value }) {
  return <span>{formatINR(value)}</span>;
}
