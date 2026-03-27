"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, LayoutDashboard, Vote } from "lucide-react";
import type { ComponentType } from "react";

type NavItem = {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
};

const items: NavItem[] = [
  { href: "/", icon: LayoutDashboard, label: "Home" },
  { href: "/dashboard", icon: Vote, label: "Council" },
  { href: "/results/1", icon: BarChart3, label: "Results" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-16 shrink-0 flex-col items-center border-r border-zinc-100 bg-white py-4">
      <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-950 text-sm font-semibold text-white">
        CL
      </div>
      <nav className="flex flex-1 flex-col items-center gap-3">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href as any}
              aria-label={item.label}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                active ? "bg-zinc-950 text-white" : "text-zinc-500 hover:bg-zinc-100"
              }`}
            >
              <Icon className="h-5 w-5" />
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
