import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getAdminSession } from "@/lib/admin-auth";
import DashboardClient from "./dashboard-client";

export const metadata: Metadata = {
  title: "Dashboard | NewHopeGGN",
  description: "Manage your NewHopeGGN account. Link your Once Human UID, view your inventory, and access quick links to store, support, and community.",
  keywords: ["dashboard", "account", "UID", "Once Human", "NewHopeGGN", "inventory"],
  openGraph: {
    title: "Dashboard | NewHopeGGN",
    description: "Manage your NewHopeGGN account. Link your Once Human UID and access community features.",
    url: "https://newhopeggn.vercel.app/dashboard",
    type: "website",
    images: [{ url: "https://newhopeggn.vercel.app/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["https://newhopeggn.vercel.app/opengraph-image"],
  },
};

import { Suspense } from "react";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const sp = searchParams ?? {};
  const user = await getSession();
  const adminSession = await getAdminSession();
  const isAdmin = !!adminSession;

  const msgParam = sp.msg;
  const msg = typeof msgParam === "string" ? msgParam : undefined;

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-orange-200/50">Loading Dashboard...</div>}>
      <DashboardClient 
        user={user} 
        msg={msg} 
        isAdmin={isAdmin}
      />
    </Suspense>
  );
}

