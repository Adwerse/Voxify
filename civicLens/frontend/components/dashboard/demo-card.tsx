import { type ReactNode } from "react";

type DemoCardProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
};

export function DemoCard({ title, subtitle, children, className = "" }: DemoCardProps) {
  return (
    <article
      className={`rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md ${className}`}
    >
      {title ? <p className="text-xs uppercase tracking-wide text-zinc-400">{title}</p> : null}
      {subtitle ? <p className="mt-1 text-sm text-zinc-500">{subtitle}</p> : null}
      <div className={title || subtitle ? "mt-3" : ""}>{children}</div>
    </article>
  );
}
