"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function TicketStatusFloat() {
  const [activeTicket, setActiveTicket] = useState<{ id: string; subject: string } | null>(null);
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Don't show the floating window if we are already on the support page
    if (pathname.startsWith("/support")) {
      console.log("[TicketStatusFloat] Hidden because on support page");
      setVisible(false);
      return;
    }

    async function checkTicket() {
      try {
        console.log("[TicketStatusFloat] Checking for active ticket...");
        const res = await fetch("/api/support/active-ticket");
        const data = await res.json();
        console.log("[TicketStatusFloat] API Response:", data);
        if (data.ok && data.ticket) {
          setActiveTicket(data.ticket);
          setVisible(true);
        } else {
          setVisible(false);
        }
      } catch (e) {
        console.error("[TicketStatusFloat] Failed to check active ticket:", e);
      }
    }

    checkTicket();
    
    // Re-check every 2 minutes
    const interval = setInterval(checkTicket, 2 * 60 * 1000);
    // Also re-check when window regains focus
    window.addEventListener("focus", checkTicket);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", checkTicket);
    };
  }, [pathname]);

  if (!visible || !activeTicket) return null;

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-10 sm:right-36 z-[60] animate-in fade-in slide-in-from-bottom-8 duration-700">
      <Link
        href={`/support?ticketId=${activeTicket.id}`}
        className="group relative flex items-center gap-4 overflow-hidden rounded-[1.5rem] border border-cyan-500/30 bg-black/80 p-1 pr-5 shadow-2xl backdrop-blur-xl transition hover:scale-[1.03] hover:border-cyan-400/50 hover:shadow-cyan-500/20 active:scale-95"
      >
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-violet-500/10 opacity-0 transition-opacity group-hover:opacity-100" />
        
        {/* Icon section */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.2rem] bg-gradient-to-br from-cyan-500 to-violet-600 shadow-lg shadow-cyan-500/20">
          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </div>

        {/* Content */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">Open Ticket</span>
            <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="max-w-[160px] truncate text-sm font-bold text-white">
            {activeTicket.subject}
          </div>
          <div className="text-[10px] text-slate-400">Click to resume chat</div>
        </div>

        {/* Close button (simulated as hide) */}
        <button 
          onClick={(e) => {
            e.preventDefault();
            setVisible(false);
          }}
          className="ml-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-slate-500 hover:bg-white/10 hover:text-white transition"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </Link>
    </div>
  );
}
