"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function BrawlEventFloat() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Hide on home page (has big banner), support page, and PvE page
    const isHome = pathname === "/" || pathname === "/en" || pathname === "/es";
    const isSupport = pathname.startsWith("/support");
    const isPve = pathname.startsWith("/pve");

    if (isHome || isSupport || isPve || dismissed) {
      setVisible(false);
      return;
    }

    // Show after a short delay on other pages
    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, [pathname, dismissed]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-24 left-4 sm:left-10 z-[100] animate-in fade-in slide-in-from-left-8 duration-700">
      <div className="group relative flex items-center gap-4 overflow-hidden rounded-[1.5rem] border border-orange-500/30 bg-black/90 p-1 pr-5 shadow-[0_0_40px_rgba(249,115,22,0.15)] backdrop-blur-xl transition hover:scale-[1.03] hover:border-orange-400/50 hover:shadow-orange-500/30 active:scale-95">
        
        {/* The entire card is a link */}
        <Link 
          href="/support?subject=Brawl%20Event%20Registration"
          className="absolute inset-0 z-10"
          aria-label="Join the Brawl"
        />

        {/* Glow effect */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(249,115,22,0.15),transparent_70%)]" />
        
        {/* Icon section */}
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.2rem] bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/20">
          <svg className="h-7 w-7 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <div className="absolute inset-0 rounded-[1.2rem] border-2 border-orange-400/40 animate-ping opacity-20" />
        </div>

        {/* Content */}
        <div className="flex flex-col relative z-20 pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400">Live Event</span>
            <span className="h-1 w-1 rounded-full bg-orange-500 animate-pulse" />
          </div>
          <div className="text-sm font-black uppercase tracking-tight text-white">
            Join the Brawl
          </div>
          <div className="text-[10px] text-slate-400 font-medium">Limited spots available!</div>
        </div>

        {/* Action Button */}
        <div className="ml-2 rounded-full bg-orange-500 px-3 py-1 text-[10px] font-bold text-black transition hover:bg-orange-400 relative z-20 pointer-events-none">
          Join
        </div>

        {/* Close button - must be above the link */}
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setVisible(false);
            setDismissed(true);
          }}
          className="ml-1 relative z-30 flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-slate-500 hover:bg-white/10 hover:text-white transition"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
