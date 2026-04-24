import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { DashboardLoader } from "./dashboard-loader";

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

export default async function DashboardPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const user = await getSession();
  const msg = typeof searchParams.msg === "string" ? searchParams.msg : undefined;

  return <DashboardLoader user={user} msg={msg} />;
}
