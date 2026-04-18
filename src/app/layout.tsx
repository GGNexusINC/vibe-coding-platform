import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import { MobileNav } from "@/app/_components/mobile-nav";
import { Heartbeat } from "@/app/_components/heartbeat";
import "./globals.css";

export const metadata: Metadata = {
  title: "NewHopeGGN | Once Human Community",
  description:
    "NewHopeGGN — your Once Human private server community. Wipe packs, VIP perks, live Discord feed, support tickets, and more.",
  icons: {
    icon: "/raidzone-bg.png",
    apple: "/raidzone-bg.png",
  },
  themeColor: "#0a0d06",
  applicationName: "NewHopeGGN",
  keywords: ["Once Human", "server", "community", "wipe packs", "VIP", "Discord"],
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

              <nav className="hidden items-center gap-1 rounded-full border border-orange-900/40 bg-black/20 px-2 py-1.5 lg:flex backdrop-blur">
                {([
                  { href: "/about",      label: "About" },
                  { href: "/store",      label: "Store" },
                  { href: "/support",    label: "Support" },
                  { href: "/policies",   label: "Policies" },
                  { href: "/rules",      label: "Rules" },
                  { href: "/community",  label: "Community" },
                  { href: "/streamers",  label: "Streamers" },
                ] as { href: string; label: string }[]).map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className="rounded-full px-3 py-1.5 text-sm font-medium text-stone-300 transition-all hover:bg-orange-400/10 hover:text-orange-100"
                  >
                    {label}
                  </Link>
                ))}

                {/* Divider */}
                <div className="h-4 w-px bg-white/10 mx-1" />

                <Link
                  href="/lottery"
                  className="rounded-full px-3 py-1.5 text-sm font-medium text-stone-300 transition-all hover:bg-orange-400/10 hover:text-orange-100"
                >
                  🎰 Lottery
                </Link>

                <Link
                  href="/minigame"
                  className="rounded-full px-3 py-1.5 text-sm font-medium text-stone-300 transition-all hover:bg-orange-400/10 hover:text-orange-100"
                >
                  🐹 Whack-a-Mole
                </Link>

                {/* Divider */}
                <div className="h-4 w-px bg-white/10 mx-1" />

                <Link
                  href="/admin"
                  className="rounded-full px-3 py-1.5 text-sm font-medium text-stone-400 transition-all hover:bg-orange-400/10 hover:text-orange-100"
                >
                  Admin
                </Link>
              </nav>

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

          <footer className="border-t border-orange-900/25 bg-[#0d110a]/70 backdrop-blur-xl">
            <div className="mx-auto w-full max-w-6xl px-4 py-8 text-sm text-stone-400">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  © {new Date().getFullYear()} NewHopeGGN |{" "}
                  <span className="font-semibold text-orange-200">Once Human Community Server</span>
                </div>
                <div className="text-xs text-stone-500">
                  Store, support, events, and live Discord feed — built for Once Human players
                </div>
              </div>
            </div>
          </footer>
        </div>
        <Analytics />
      </body>
    </html>
  );
}
