import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 — Page Not Found | NewHopeGGN",
};

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-20 text-center">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/5 blur-[120px]" />
      </div>

      <div className="rz-surface rz-panel-border relative max-w-lg rounded-[2.5rem] p-10 sm:p-14">
        <div className="flex flex-col items-center">
          <div className="mb-6 rounded-3xl border border-indigo-400/30 bg-indigo-400/10 p-6 text-indigo-400 shadow-[0_0_40px_rgba(99,102,241,0.15)]">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>

          <h1 className="text-6xl font-black text-white sm:text-7xl">404</h1>
          <h2 className="mt-4 text-2xl font-bold text-indigo-100">Signal Lost</h2>
          <p className="mt-6 text-stone-400 leading-relaxed">
            The coordinate you requested does not exist in our registry. You may have typed an incorrect URL or the page has been declassified.
          </p>

          <div className="mt-10 flex flex-col gap-3 w-full sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="inline-flex h-12 items-center justify-center rounded-full bg-indigo-600 px-8 text-sm font-bold text-white transition hover:scale-[1.03]"
            >
              Back to Home
            </Link>
            <Link
              href="/support"
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/10 bg-white/5 px-8 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Get Support
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-8 font-mono text-[10px] uppercase tracking-[0.3em] text-stone-600">
        NewHopeGGN · Once Human Community
      </div>
    </div>
  );
}
