import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MobileNav } from "@/app/_components/mobile-nav";
import { Heartbeat } from "@/app/_components/heartbeat";
import "./globals.css";

export const metadata: Metadata = {
  title: "NewHopeGGN | Future Ops Hub",
  description:
    "Premium Once Human server hub with Discord support, store access, and live admin operations.",
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
      <body className="rz-corporate-shell min-h-full flex flex-col bg-[#041018]">
        <Heartbeat />
        <div className="relative z-10 min-h-screen flex flex-col">
          <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07131c]/75 backdrop-blur-2xl">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
              <Link href="/" className="flex items-center gap-3">
                <div className="relative h-10 w-10 overflow-hidden rounded-2xl border border-cyan-300/25 bg-cyan-400/10 shadow-[0_0_32px_rgba(34,211,238,0.14)]">
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
                  <div className="font-[family:var(--font-brand-display)] text-sm font-semibold uppercase tracking-[0.28em] text-cyan-50">
                    NewHope
                  </div>
                  <div className="text-xs text-slate-300">GG Nexus Operations</div>
                </div>
              </Link>

              <nav className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1 lg:flex">
                <Link
                  className="rounded-full px-3 py-2 text-sm text-slate-200 transition hover:bg-white/5 hover:text-white"
                  href="/about"
                >
                  About
                </Link>
                <Link
                  className="rounded-full px-3 py-2 text-sm text-slate-200 transition hover:bg-white/5 hover:text-white"
                  href="/store"
                >
                  Store
                </Link>
                <Link
                  className="rounded-full px-3 py-2 text-sm text-slate-200 transition hover:bg-white/5 hover:text-white"
                  href="/support"
                >
                  Support
                </Link>
                <Link
                  className="rounded-full px-3 py-2 text-sm text-slate-200 transition hover:bg-white/5 hover:text-white"
                  href="/policies"
                >
                  Policies
                </Link>
                <Link
                  className="rounded-full px-3 py-2 text-sm text-slate-200 transition hover:bg-white/5 hover:text-white"
                  href="/rules"
                >
                  Rules
                </Link>
                <Link
                  className="rounded-full px-3 py-2 text-sm text-slate-200 transition hover:bg-white/5 hover:text-white"
                  href="/admin"
                >
                  Admin
                </Link>
              </nav>

              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard"
                  className="hidden h-10 items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10 sm:inline-flex"
                >
                  Dashboard
                </Link>
                <Link
                  href="/store"
                  className="hidden h-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#67e8f9,#facc15)] px-5 text-sm font-bold text-slate-950 transition hover:scale-[1.03] sm:inline-flex"
                >
                  Store
                </Link>
                <MobileNav />
              </div>
            </div>
          </header>

          <main className="relative flex-1 overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,12,19,0.86),rgba(4,16,24,0.96))]" />
            <div className="rz-parallax-galaxy pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(103,232,249,0.16),transparent_38%),radial-gradient(circle_at_82%_22%,rgba(34,197,94,0.11),transparent_34%),radial-gradient(circle_at_50%_84%,rgba(251,191,36,0.09),transparent_40%)]" />
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

          <footer className="border-t border-white/10 bg-[#07131c]/65 backdrop-blur-xl">
            <div className="mx-auto w-full max-w-6xl px-4 py-8 text-sm text-slate-400">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  (c) {new Date().getFullYear()} NewHopeGGN |{" "}
                  <span className="font-semibold text-slate-100">Future Ops by GG Nexus</span>
                </div>
                <div className="text-xs text-slate-500">
                  Premium player operations, Discord-first support, and admin command tooling
                </div>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
