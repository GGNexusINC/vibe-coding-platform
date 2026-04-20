import type { Metadata, Viewport } from "next";
import Image from "next/image";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import { MobileNav } from "@/app/_components/mobile-nav";
import { MainNav } from "@/app/_components/main-nav";
import { Heartbeat } from "@/app/_components/heartbeat";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
  themeColor: "#0a0d06",
  applicationName: "NewHopeGGN",
  keywords: ["Once Human", "server", "community", "wipe packs", "VIP", "Discord"],
  openGraph: {
    title: "NewHopeGGN | Once Human Community",
    description: "NewHopeGGN — your Once Human private server community. Wipe packs, VIP perks, live Discord feed, and more.",
    url: "https://newhopeggn.vercel.app",
    siteName: "NewHopeGGN",
    type: "website",
    images: [{ url: "https://newhopeggn.vercel.app/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "NewHopeGGN | Once Human Community",
    description: "Wipe packs, VIP perks, live Discord feed, and more.",
    images: ["https://newhopeggn.vercel.app/opengraph-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const globalStars = [
    { top: "6%", left: "8%", delay: "0s" },
    { top: "12%", left: "22%", delay: "0.7s" },
    { top: "8%", left: "38%", delay: "1.2s" },
    { top: "16%", left: "60%", delay: "0.4s" },
    { top: "10%", left: "82%", delay: "1.5s" },
    { top: "28%", left: "14%", delay: "0.9s" },
    { top: "34%", left: "46%", delay: "1.7s" },
    { top: "42%", left: "74%", delay: "0.3s" },
    { top: "56%", left: "20%", delay: "1.1s" },
    { top: "64%", left: "52%", delay: "0.6s" },
    { top: "72%", left: "86%", delay: "1.8s" },
    { top: "84%", left: "12%", delay: "0.5s" },
  ];

  return (
    <html lang="en" className="h-full antialiased">
      <body className="rz-corporate-shell min-h-full flex flex-col bg-[#0a0d06]">
        <Heartbeat />
        <div className="relative z-10 min-h-screen flex flex-col">
          <header className="sticky top-0 z-40 border-b border-orange-900/30 bg-[#0d110a]/80 backdrop-blur-2xl">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
              <Link href="/" className="flex items-center gap-3">
                <div className="relative h-10 w-10 overflow-hidden rounded-2xl border border-orange-400/30 bg-orange-400/10 shadow-[0_0_32px_rgba(249,115,22,0.18)]">
                  <Image
                    src="/raidzone-bg.png"
                    alt="NewHopeGGN"
                    fill
                    sizes="40px"
                    className="object-cover opacity-90"
                    priority
                  />
                  <div className="absolute inset-0 bg-slate-950/25" />
                </div>
                <div className="leading-tight">
                  <div className="font-[family:var(--font-brand-display)] text-sm font-semibold uppercase tracking-[0.28em] text-orange-100">
                    NewHope<span className="text-lime-400">GGN</span>
                  </div>
                  <div className="text-xs text-orange-200/60">Once Human Community</div>
                </div>
              </Link>

              <MainNav />

              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard"
                  className="hidden h-10 items-center justify-center rounded-full border border-orange-400/20 bg-orange-400/5 px-4 text-sm font-semibold text-orange-100 transition hover:-translate-y-0.5 hover:bg-orange-400/10 sm:inline-flex"
                >
                  Dashboard
                </Link>
                <Link
                  href="/store"
                  className="hidden h-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f97316,#fbbf24)] px-5 text-sm font-bold text-stone-950 transition hover:scale-[1.03] sm:inline-flex"
                >
                  Store
                </Link>
                <MobileNav />
              </div>
            </div>
          </header>

          <main className="relative flex-1 overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(8,10,4,0.88),rgba(10,13,6,0.96))]" />
            <div className="rz-parallax-galaxy pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(249,115,22,0.12),transparent_38%),radial-gradient(circle_at_82%_22%,rgba(132,204,22,0.09),transparent_34%),radial-gradient(circle_at_50%_84%,rgba(251,191,36,0.07),transparent_40%)]" />
            <div className="rz-starfield pointer-events-none">
              {globalStars.map((star, idx) => (
                <span
                  key={`global-star-${idx}`}
                  className="rz-star"
                  style={{ top: star.top, left: star.left, animationDelay: star.delay }}
                />
              ))}
              <span
                className="rz-shooting-star"
                style={{ top: "16%", left: "-26%", animationDelay: "0.2s" }}
              />
              <span
                className="rz-shooting-star"
                style={{ top: "52%", left: "-30%", animationDelay: "2s" }}
              />
            </div>
            <div className="relative z-10 h-full">{children}</div>
          </main>

          <footer className="border-t border-orange-900/25 bg-[#0d110a]/80 backdrop-blur-xl">
            <div className="mx-auto w-full max-w-6xl px-4 py-12">

              {/* Top row: logo + discord CTA */}
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between mb-10">
                <div className="max-w-xs">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-xl border border-orange-400/30 bg-orange-400/10 overflow-hidden relative">
                      <Image src="/raidzone-bg.png" alt="NewHopeGGN" fill sizes="32px" className="object-cover opacity-90" />
                    </div>
                    <span className="font-bold text-orange-100 tracking-wide">NewHope<span className="text-lime-400">GGN</span></span>
                  </div>
                  <p className="text-xs text-stone-500 leading-relaxed">Once Human community server — wipe packs, VIP perks, live Discord feed, and fast staff support.</p>
                  <a
                    href="https://discord.gg/newhopeggn"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex h-9 items-center gap-2 rounded-full bg-[#5865F2] px-4 text-xs font-bold text-white transition hover:bg-[#4752c4]"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
                    Join Discord
                  </a>
                </div>

                {/* Nav columns */}
                <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 text-sm">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-600 mb-3">Play</div>
                    <ul className="space-y-2">
                      {[
                        { href: "/store",    label: "Wipe Store" },
                        { href: "/rules",    label: "Server Rules" },
                        { href: "/bans",     label: "Ban List" },
                        { href: "/streamers",label: "Streamers" },
                      ].map(l => (
                        <li key={l.href}><Link href={l.href} className="text-stone-400 hover:text-orange-200 transition">{l.label}</Link></li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-600 mb-3">Community</div>
                    <ul className="space-y-2">
                      {[
                        { href: "/community", label: "Discord Feed" },
                        { href: "/support",   label: "Support" },
                        { href: "/lottery",   label: "Lottery" },
                        { href: "/minigame",  label: "Whack-a-Mole" },
                      ].map(l => (
                        <li key={l.href}><Link href={l.href} className="text-stone-400 hover:text-orange-200 transition">{l.label}</Link></li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-600 mb-3">Info</div>
                    <ul className="space-y-2">
                      {[
                        { href: "/about",    label: "About" },
                        { href: "/policies", label: "Policies" },
                        { href: "/dashboard",label: "Dashboard" },
                        { href: "/admin",    label: "Staff Login" },
                      ].map(l => (
                        <li key={l.href}><Link href={l.href} className="text-stone-400 hover:text-orange-200 transition">{l.label}</Link></li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Bottom row */}
              <div className="border-t border-white/5 pt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-stone-600">
                <span>© {new Date().getFullYear()} NewHopeGGN — Once Human Community Server</span>
                <Link href="/store" className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#f97316,#fbbf24)] px-4 text-xs font-bold text-stone-950 transition hover:scale-[1.02]">
                  🛒 Wipe Store
                </Link>
              </div>
            </div>
          </footer>
        </div>
        <Analytics />
      </body>
    </html>
  );
}
