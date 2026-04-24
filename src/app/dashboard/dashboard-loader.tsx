"use client";

import dynamic from "next/dynamic";

const DashboardClientDynamic = dynamic(
  () => import("./dashboard-client"),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center text-orange-200/50 italic font-bold animate-pulse">
        Loading Dashboard...
      </div>
    )
  }
);

export function DashboardLoader(props: { user: any; msg?: string }) {
  return <DashboardClientDynamic {...props} />;
}
