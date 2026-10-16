import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle2, Info, Loader2, type LucideIcon } from "lucide-react";

export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------------ */
/* Button                                                                    */
/* ------------------------------------------------------------------------ */

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-300",
  secondary:
    "bg-charcoal-900 text-white hover:bg-charcoal-800 active:bg-charcoal-950 disabled:bg-charcoal-400",
  outline:
    "border border-charcoal-900/15 bg-white text-charcoal-800 hover:border-charcoal-900/30 hover:bg-cream-100 disabled:text-charcoal-400",
  ghost: "text-charcoal-700 hover:bg-charcoal-900/6 disabled:text-charcoal-400",
  danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-base gap-2 rounded-xl",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: LucideIcon;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, icon: Icon, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        "inline-flex items-center justify-center font-medium whitespace-nowrap transition-colors duration-150 disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : Icon ? <Icon className="size-4" aria-hidden /> : null}
      {children}
    </button>
  );
});

export interface ButtonLinkProps {
  to: string;
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  className?: string;
  children: ReactNode;
  external?: boolean;
}

export function ButtonLink({ to, variant = "primary", size = "md", icon: Icon, className, children, external }: ButtonLinkProps) {
  const classes = cx(
    "inline-flex items-center justify-center font-medium whitespace-nowrap transition-colors duration-150",
    variantClasses[variant],
    sizeClasses[size],
    className,
  );
  if (external) {
    return (
      <a href={to} target="_blank" rel="noreferrer" className={classes}>
        {Icon ? <Icon className="size-4" aria-hidden /> : null}
        {children}
      </a>
    );
  }
  return (
    <Link to={to} className={classes}>
      {Icon ? <Icon className="size-4" aria-hidden /> : null}
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------------------ */
/* Form controls                                                             */
/* ------------------------------------------------------------------------ */

interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & FieldProps>(function Input(
  { label, hint, error, required, className, id, ...rest },
  ref,
) {
  const inputId = id ?? rest.name;
  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
          {required && <span className="text-brand-600"> *</span>}
        </label>
      )}
      <input ref={ref} id={inputId} className={cx("input", error && "border-red-400 focus:border-red-500 focus:ring-red-500/15", className)} aria-invalid={!!error} {...rest} />
      {error ? <p className="field-error">{error}</p> : hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps>(function Textarea(
  { label, hint, error, required, className, id, ...rest },
  ref,
) {
  const inputId = id ?? rest.name;
  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
          {required && <span className="text-brand-600"> *</span>}
        </label>
      )}
      <textarea ref={ref} id={inputId} className={cx("input min-h-[88px] resize-y", error && "border-red-400", className)} aria-invalid={!!error} {...rest} />
      {error ? <p className="field-error">{error}</p> : hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & FieldProps>(function Select(
  { label, hint, error, required, className, id, children, ...rest },
  ref,
) {
  const inputId = id ?? rest.name;
  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
          {required && <span className="text-brand-600"> *</span>}
        </label>
      )}
      <select ref={ref} id={inputId} className={cx("input appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 fill=%22none%22 stroke=%22%236f7683%22 stroke-width=%222%22><path d=%22m4 6 4 4 4-4%22/></svg>')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9", error && "border-red-400", className)} {...rest}>
        {children}
      </select>
      {error ? <p className="field-error">{error}</p> : hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
});

/* ------------------------------------------------------------------------ */
/* Feedback                                                                  */
/* ------------------------------------------------------------------------ */

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "brand" | "warn" | "danger" | "info"; className?: string }) {
  const tones = {
    neutral: "bg-charcoal-900/6 text-charcoal-700",
    brand: "bg-brand-100 text-brand-800",
    warn: "bg-saffron-100 text-saffron-600",
    danger: "bg-red-100 text-red-700",
    info: "bg-sky-100 text-sky-800",
  };
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone], className)}>{children}</span>;
}

export function Spinner({ label = "Loading…", className }: { label?: string; className?: string }) {
  return (
    <div role="status" className={cx("flex items-center justify-center gap-3 py-16 text-charcoal-500", className)}>
      <Loader2 className="size-5 animate-spin text-brand-600" aria-hidden />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function Alert({ tone = "info", title, children, className }: { tone?: "info" | "success" | "warn" | "error"; title?: string; children?: ReactNode; className?: string }) {
  const styles = {
    info: { wrap: "border-sky-200 bg-sky-50 text-sky-900", Icon: Info },
    success: { wrap: "border-brand-200 bg-brand-50 text-brand-900", Icon: CheckCircle2 },
    warn: { wrap: "border-saffron-400/40 bg-saffron-100 text-charcoal-800", Icon: AlertCircle },
    error: { wrap: "border-red-200 bg-red-50 text-red-900", Icon: AlertCircle },
  }[tone];
  const Icon = styles.Icon;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cx("flex gap-3 rounded-xl border px-4 py-3 text-sm", styles.wrap, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? "mt-0.5" : undefined}>{children}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <Icon className="size-7" aria-hidden />
      </div>
      <h3 className="text-xl font-semibold text-charcoal-900">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-charcoal-500">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-semibold tracking-wide text-brand-700 uppercase">{eyebrow}</p>}
        <h1 className="text-3xl font-semibold text-charcoal-900 sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-charcoal-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
