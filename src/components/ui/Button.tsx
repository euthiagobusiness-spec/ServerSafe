import type { AnchorHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "tech";

type ButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
};

const base =
  "group inline-flex min-h-12 items-center justify-center gap-2 rounded-[8px] px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em] transition duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600";

const variants: Record<ButtonVariant, string> = {
  primary:
    "border border-blue-700 bg-blue-700 text-white shadow-[0_12px_28px_rgba(29,78,216,0.18)] hover:bg-blue-800 hover:shadow-[0_16px_34px_rgba(29,78,216,0.22)]",
  secondary:
    "border border-slate-300 bg-white text-slate-900 shadow-sm hover:border-blue-300 hover:bg-blue-50 hover:text-blue-900",
  ghost:
    "border border-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-950",
  outline:
    "border border-slate-300 bg-white text-slate-900 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-900",
  tech:
    "border border-blue-200 bg-blue-50 text-blue-800 shadow-sm hover:border-blue-300 hover:bg-blue-100",
};

function cn(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

export function Button({
  children,
  variant = "primary",
  className,
  href = "#",
  target,
  rel,
  ...props
}: ButtonProps) {
  const safeRel = target === "_blank" ? rel ?? "noopener noreferrer" : rel;

  return (
    <a
      className={cn(base, variants[variant], className)}
      href={href}
      target={target}
      rel={safeRel}
      {...props}
    >
      {children}
    </a>
  );
}
