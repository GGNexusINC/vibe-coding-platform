import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 — Page Not Found | NewHopeGGN",
};

export default function NotFound() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950">
      {/* Atmospheric background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(239,68,68,0.08),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_80%,rgba(139,92,246,0.06),transparent_50%)]" />

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg">
        {/* Big number */}
        <div className="text-[10rem] font-black leading-none tabular-nums select-none"
          style={{ background: "linear-gradient(135deg,#ef4444 0%,#a855f7 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          404
        </div>

        {/* Icon */}
        <div className="text-5xl -mt-4 mb-4">☣️</div>

        <h1 className="text-2xl font-black text-white tracking-tight">Zone Not Found</h1>
        <p className="mt-2 text-sm text-slate-400 leading-relaxed">
          This sector has been wiped. The page you&apos;re looking for doesn&apos;t exist or was moved.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/"
            className="h-11 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 text-sm font-bold text-white hover:opacity-90 hover:scale-[1.02] transition flex items-center gap-2 shadow-lg shadow-cyan-500/10">
            🏠 Back to Base
          </Link>
          <Link href="/community"
            className="h-11 px-6 rounded-2xl border border-white/10 bg-white/4 text-sm font-semibold text-slate-300 hover:bg-white/8 transition flex items-center gap-2">
            👥 Community
          </Link>
          <Link href="/support"
            className="h-11 px-6 rounded-2xl border border-white/10 bg-white/4 text-sm font-semibold text-slate-300 hover:bg-white/8 transition flex items-center gap-2">
            🎫 Support
          </Link>
        </div>

        <div className="mt-8 text-[11px] text-slate-700 uppercase tracking-widest">
          NewHopeGGN · Once Human Community
        </div>
      </div>
    </div>
  );
}
