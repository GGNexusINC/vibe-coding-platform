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
      { href: "/bot", emoji: "Bot", label: "Discord Bot" },
      { href: "/store", emoji: "Shop", label: "Wipe Store" },
      { href: "/support", emoji: "Help", label: "Support" },
    ],
  },
  {
    label: "More",
    links: [
      { href: "/community", emoji: "Chat", label: "Community" },
      { href: "/rules", emoji: "Rules", label: "Rules" },
      { href: "/lottery", emoji: "Win", label: "Lottery" },
      { href: "/minigame", emoji: "Game", label: "Whack-a-Mole" },
      { href: "/beta", emoji: "Beta", label: "Beta Portal" },
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
        className="flex h-10 w-10 items-center justify-center rounded-full border border-orange-400/20 bg-orange-400/5 text-orange-100 transition hover:bg-orange-400/10"
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
          <div className="fixed left-0 right-0 top-0 z-50 bg-[#0d110a]/98 backdrop-blur-2xl border-b border-orange-900/30 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <div>
                <div className="text-sm font-black text-orange-100 tracking-wide">
                  NewHope<span className="text-lime-400">GGN</span>
                </div>
                <div className="text-[10px] text-orange-200/50">Once Human Community</div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-stone-400 hover:text-white"
              >
                <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
                  <path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <nav className="px-4 py-4 space-y-4 max-h-[80vh] overflow-y-auto">
              {sections.map((section) => (
                <div key={section.label}>
                  <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-stone-600 px-2 mb-1.5">
                    {section.label}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {section.links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-2.5 rounded-xl px-3 py-3 border text-sm font-semibold transition-all ${
                          pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href))
                            ? "bg-orange-400/12 border-orange-400/25 text-orange-200"
                            : "bg-white/[0.03] border-white/6 text-stone-300 hover:bg-orange-400/8 hover:text-orange-100 hover:border-orange-400/20"
                        }`}
                      >
                        <span className="text-[10px] shrink-0 rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-stone-400">
                          {link.emoji}
                        </span>
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}

              <div className="pt-1 border-t border-white/6">
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-3 text-sm font-semibold text-stone-500 hover:bg-white/5 hover:text-stone-300 transition-all"
                >
                  <span className="text-[10px] rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5">Staff</span>
                  Staff Login
                </Link>
              </div>
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
