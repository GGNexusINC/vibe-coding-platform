"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/store", label: "Store" },
  { href: "/lottery", label: "Lottery" },
  { href: "/support", label: "Support" },
  { href: "/community", label: "Community" },
  { href: "/streamers", label: "Streamers" },
  { href: "/about", label: "About" },
  { href: "/rules", label: "Rules" },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-1 rounded-full border border-orange-900/40 bg-black/20 px-2 py-1.5 lg:flex backdrop-blur">
      {navLinks.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
              active
                ? "bg-orange-400/15 text-orange-200 ring-1 ring-orange-400/30"
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
