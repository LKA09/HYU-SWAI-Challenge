import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-teal-800 text-white hover:bg-teal-900 disabled:bg-slate-300 disabled:text-slate-600",
  secondary:
    "border border-slate-300 bg-white text-slate-900 hover:bg-slate-100 disabled:bg-slate-100 disabled:text-slate-500",
  ghost:
    "text-slate-800 hover:bg-slate-100 disabled:text-slate-400",
  danger:
    "border border-red-300 bg-white text-red-700 hover:bg-red-50 disabled:bg-slate-100 disabled:text-slate-500",
};

export function Button({
  className = "",
  variant = "secondary",
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
