import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Heartbeat } from "@/app/_components/heartbeat";
import { DeviceAuditBeacon } from "@/app/_components/device-audit-beacon";
import { SiteChrome } from "@/app/_components/site-chrome";
import { TicketStatusFloat } from "@/app/_components/ticket-status-float";
import { BrawlEventFloat } from "@/app/_components/brawl-event-float";
import { MayhemSync } from "@/app/_components/mayhem-sync";
import { cookies } from "next/headers";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0d06",
};

export const metadata: Metadata = {
  title: "NewHopeGGN | Once Human Community",
  description:
    "NewHopeGGN — your Once Human private server community. Wipe packs, VIP perks, live Discord feed, support tickets, and more.",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/raidzone-bg.png", sizes: "any" },
    ],
    apple: "/apple-touch-icon.png",
  },
  applicationName: "NewHopeGGN",
  keywords: ["Once Human", "server", "community", "wipe packs", "VIP", "Discord"],
  openGraph: {
    title: "NewHopeGGN | Once Human Community",
    description:
      "NewHopeGGN — your Once Human private server community. Wipe packs, VIP perks, live Discord feed, and more.",
    url: "https://newhopeggn.com",
    siteName: "NewHopeGGN",
    type: "website",
    images: [{ url: "https://newhopeggn.com/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "NewHopeGGN | Once Human Community",
    description: "Wipe packs, VIP perks, live Discord feed, and more.",
    images: ["https://newhopeggn.com/opengraph-image"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const store = await cookies();
  const theme = store.get("nh_theme")?.value || "forest";

  return (
    <html lang="en" className="h-full antialiased">
      <body className={`rz-corporate-shell min-h-full flex flex-col bg-background text-foreground theme-${theme}`}>
        <MayhemSync />
        <Heartbeat />
        <DeviceAuditBeacon />
        <SiteChrome>{children}</SiteChrome>
        <TicketStatusFloat />
        <BrawlEventFloat />
        <Analytics />
      </body>
    </html>
  );
}
