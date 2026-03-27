import { Suspense } from "react";

import { CouncilDashboard } from "@/components/dashboard/council-dashboard";

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-50" />}>
      <CouncilDashboard />
    </Suspense>
  );
}
