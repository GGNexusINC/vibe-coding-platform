"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [
  {
    label: "Start Here",
    links: [
      { href: "/", emoji: "Home", label: "Home" },
      { href: "/dashboard", emoji: "Dash", label: "Dashboard" },
      { href: "/store", emoji: "Shop", label: "Wipe Store" },
      { href: "/support", emoji: "Help", label: "Support" },
      { href: "/about", emoji: "Info", label: "About" },
    ],
  },
  {
    label: "More",
    links: [
      { href: "/community", emoji: "Chat", label: "Community" },
      { href: "/streamers", emoji: "Live", label: "Streamers" },
      { href: "/rules", emoji: "Rules", label: "Rules" },
      { href: "/lottery", emoji: "Win", label: "Lottery" },
      { href: "/minigame", emoji: "Game", label: "Whack-a-Mole" },
    ],
  },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label="Toggle menu"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-2xl border border-orange-400/30 bg-[radial-gradient(circle_at_30%_20%,rgba(249,115,22,0.22),rgba(251,191,36,0.08))] text-orange-100 shadow-[0_0_22px_rgba(249,115,22,0.18)] transition hover:scale-105 hover:border-amber-300/40"
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="fixed left-0 right-0 top-0 z-50 border-b border-orange-900/35 bg-[linear-gradient(180deg,rgba(13,17,25,0.99),rgba(5,8,12,0.98))] shadow-[0_24px_80px_rgba(0,0,0,0.65)] backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
              <div>
                <div className="text-sm font-black text-orange-100 tracking-wide">
                  NewHope<span className="text-lime-400">GGN</span>
                </div>
                <div className="text-[10px] text-orange-200/50">Once Human Community</div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-2xl border border-orange-400/20 bg-orange-400/10 text-orange-100 transition hover:border-amber-300/35 hover:text-amber-100"
              >
                <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
                  <path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <nav className="px-4 py-4 space-y-4 max-h-[80vh] overflow-y-auto">
              {sections.map((section) => (
                <div key={section.label}>
                  <div className="mb-1.5 px-2 text-[9px] font-black uppercase tracking-[0.22em] text-orange-300/70">
                    {section.label}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {section.links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setOpen(false)}
                        className={`flex min-h-14 items-center gap-2.5 rounded-2xl border px-3 py-3 text-sm font-bold transition-all ${
                          pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href))
                            ? "border-orange-400/35 bg-[linear-gradient(135deg,rgba(249,115,22,0.22),rgba(251,191,36,0.10))] text-orange-100 shadow-[0_0_24px_rgba(249,115,22,0.14)]"
                            : "border-orange-900/25 bg-black/25 text-stone-300 hover:border-amber-400/25 hover:bg-amber-400/[0.06] hover:text-amber-100"
                        }`}
                      >
                        <span className="shrink-0 rounded-full border border-orange-400/20 bg-orange-400/10 px-1.5 py-0.5 text-[10px] text-orange-200">
                          {link.emoji}
                        </span>
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
