"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BarChart2, Home, Settings, Users } from "lucide-react";
import type { ComponentType } from "react";

type Item = {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
};

const items: Item[] = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/dashboard", icon: BarChart2, label: "Dashboard" },
  { href: "/dashboard?section=participants", icon: Users, label: "Participants" },
  { href: "/dashboard?section=settings", icon: Settings, label: "Settings" },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const section = searchParams.get("section") || "overview";

  return (
    <aside className="flex h-screen w-16 shrink-0 flex-col items-center border-r border-zinc-100 bg-white py-4">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-950 text-xs text-white">
        CL
      </div>

      <nav className="mt-2 flex flex-1 flex-col items-center gap-3">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/"
              ? pathname === "/"
              : item.href === "/dashboard"
                ? pathname === "/dashboard" && section === "overview"
                : item.href.includes("participants")
                  ? pathname === "/dashboard" && section === "participants"
                  : pathname === "/dashboard" && section === "settings";

          return (
            <Link
              key={item.label}
              href={item.href as any}
              aria-label={item.label}
              className={`rounded-full p-2 transition ${
                active ? "bg-black text-white" : "text-zinc-500 hover:bg-zinc-100"
              }`}
            >
              <Icon className="h-5 w-5" />
            </Link>
          );
        })}
      </nav>

      <div className="h-9 w-9 rounded-full bg-zinc-200" aria-label="User avatar" />
    </aside>
  );
}
