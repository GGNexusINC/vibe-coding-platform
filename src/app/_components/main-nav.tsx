"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/pve", label: "PvE Server" },
  { href: "/store", label: "Store" },
  { href: "/rewards", label: "Rewards" },
  { href: "/lottery", label: "Lottery" },
  { href: "/minigame", label: "Minigame" },
  { href: "/support", label: "Support" },
  { href: "/community", label: "Community" },
  { href: "/streamers", label: "Streamers" },
  { href: "/rules", label: "Rules" },
];

export function MainNav() {
  const pathname = usePathname();
  const isPve = pathname.startsWith("/pve");

  const activeLinks = isPve 
    ? [
        { href: "/pve", label: "PvE Server" },
      ]
    : navLinks;

  return (
    <nav className={`hidden items-center gap-1 rounded-full border bg-black/20 px-2 py-1.5 lg:flex backdrop-blur transition-all ${
      isPve ? "border-emerald-900/40" : "border-orange-900/40"
    }`}>
      {activeLinks.map(({ href, label }) => {
        // Handle matching query param / tab in pathname or query parameters
        const active = pathname === href || 
          (href.startsWith("/store") && pathname.startsWith("/store")) ||
          (href.startsWith("/support") && pathname.startsWith("/support")) ||
          (href !== "/" && pathname.startsWith(href + "/"));

        return (
          <Link
            key={href}
            href={href}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
              active
                ? isPve
                  ? "bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-400/30"
                  : "bg-orange-400/15 text-orange-200 ring-1 ring-orange-400/30"
                : isPve
                  ? "text-stone-300 hover:bg-emerald-400/10 hover:text-emerald-100"
                  : "text-stone-300 hover:bg-orange-400/10 hover:text-orange-100"
            }`}
          >
            {label}
          </Link>
        );
      })}

      <div className="h-4 w-px bg-white/10 mx-1" />
    </nav>
  );
}
