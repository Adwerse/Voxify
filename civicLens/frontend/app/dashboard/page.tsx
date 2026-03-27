import { Suspense } from "react";

import { CouncilDashboard } from "@/components/dashboard/council-dashboard";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-zinc-50 p-4 sm:p-8">
          <div className="mx-auto w-full max-w-6xl">
            <DashboardSkeleton />
          </div>
        </main>
      }
    >
      <CouncilDashboard />
    </Suspense>
  );
}
