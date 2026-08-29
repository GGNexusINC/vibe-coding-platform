"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/pve", label: "PvE Server", icon: "🛡️" },
  { href: "/store", label: "Store", icon: "🛒" },
  { href: "/rewards", label: "Rewards", icon: "🎁" },
  { href: "/lottery", label: "Lottery", icon: "🎰" },
  { href: "/minigame", label: "Minigame", icon: "🎯" },
  { href: "/support", label: "Support", icon: "🎫" },
  { href: "/community", label: "Community", icon: "👥" },
  { href: "/streamers", label: "Streamers", icon: "📺" },
  { href: "/rules", label: "Rules", icon: "📋" },
];

export function MainNav() {
  const pathname = usePathname();
  const isPve = pathname.startsWith("/pve");

  const activeLinks = isPve
    ? [
        { href: "/pve", label: "PvE Server", icon: "🛡️" },
      ]
    : navLinks;

  return (
    <nav className={`hidden items-center gap-1 rounded-full border bg-black/20 px-2 py-1.5 lg:flex backdrop-blur transition-all ${
      isPve ? "border-emerald-900/40" : "border-orange-900/40"
    }`}>
      {activeLinks.map(({ href, label, icon }) => {
        // Handle matching query param / tab in pathname or query parameters
        const active = pathname === href ||
          (href.startsWith("/store") && pathname.startsWith("/store")) ||
          (href.startsWith("/support") && pathname.startsWith("/support")) ||
          (href !== "/" && pathname.startsWith(href + "/"));

        return (
          <Link
            key={href}
            href={href}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-300 ${
              active
                ? isPve
                  ? "scale-[1.03] bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-400/30 shadow-[0_0_16px_rgba(16,185,129,0.15)]"
                  : "scale-[1.03] bg-orange-400/15 text-orange-200 ring-1 ring-orange-400/30 shadow-[0_0_16px_rgba(249,115,22,0.15)]"
                : isPve
                  ? "text-stone-300 hover:bg-emerald-400/10 hover:text-emerald-100"
                  : "text-stone-300 hover:bg-orange-400/10 hover:text-orange-100"
            }`}
          >
            <span className="text-xs">{icon}</span>
            {label}
          </Link>
        );
      })}

      <div className="h-4 w-px bg-white/10 mx-1" />
    </nav>
  );
}
