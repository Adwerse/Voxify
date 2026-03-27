import { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  dark?: boolean;
};

export function Card({ dark = false, className = "", ...props }: CardProps) {
  const base = dark
    ? "rounded-2xl bg-zinc-950 text-white"
    : "rounded-2xl border border-zinc-100 bg-white text-zinc-900 shadow-none";

  return <div className={`${base} ${className}`.trim()} {...props} />;
}
