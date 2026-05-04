"use client";

import { useState, useEffect } from "react";
import { BuyButton } from "./buy-button";

const products = [
  {
    slug: "construction",
    badge: "Builder Favorite",
    name: "Construction Package",
    price: 5,
    buyUrl: "https://www.paypal.com/ncp/payment/2CPNCAMCWTVUN",
    summary: "A fast-start builder bundle for serious base progression.",
    bullets: ["5000 Stone", "7000 Wood", "5000 Steel", "5000 Tungsten"],
    addons: [
      "Advanced tables (Supplies and Armament)",
      "Box set (Storage boxes, Weapon box, Armor box)",
      "3 V3 tickets",
      "350 Gasoline",
    ],
    extra: "300 chips or deviant selector (your choice)",
    featured: false,
  },
  {
    slug: "defense",
    badge: "Stronghold Loadout",
    name: "Defense Package",
    price: 5,
    buyUrl: "https://www.paypal.com/ncp/payment/E33JYFS2JF8V2",
    summary: "Everything needed to harden a position and hold pressure.",
    bullets: [
      "10 Rifle Turrets (2000 bullets)",
      "4 Shotgun Turrets (400 bullets) or 4 Stun Traps (full bullets)",
      "6 Pulse Traps",
      "20 High Tungsten Walls",
      "2 High Tungsten Doors",
      "2 Large Biomass Generators",
    ],
    extra: "300 chips or special meals (your choice)",
    featured: false,
  },
  {
    slug: "tactical",
    badge: "Most Wanted",
    name: "Tactical Package",
    price: 5,
    buyUrl: "https://www.paypal.com/ncp/payment/74N3J2M7KPATS",
    summary: "The premium combat kit for players who want immediate battlefield value.",
    bullets: [
      "MK14 (full mods + 200 bullets) or KVD (full mods + 200 bullets)",
      "P90 (full mods + 200 bullets) or KV-SBR (full mods + 200 bullets)",
      "Stormweaver Set + Gas Mask or Refugee Set + Gas Mask",
      "20 Corn Soups",
      "20 Emergency Supplies",
      "2 Universal Repair Kits",
      "60 Gasoline",
    ],
    extra: "300 chips or Masamune Katana",
    featured: true,
  },
  {
    slug: "insurance",
    badge: "Security Pick",
    name: "Anti Raid Insurance",
    price: 5,
    buyUrl: "https://www.paypal.com/ncp/payment/V2L73MUBJV6EN",
    summary: "Protect your base and save farming time (Single Use per wipe).",
    bullets: [
      "Base blueprint resources are returned",
      "Single use per wipe",
      "Staff-verified fulfillment after purchase confirmation",
    ],
    extra: "VIP role during the corresponding wipe",
    featured: false,
  },
];

type User = {
  discord_id: string;
  username?: string;
  global_name?: string;
  avatar?: string | null;
};

export function StoreClient({ user }: { user: User | null }) {
  const [insuranceStatus, setInsuranceStatus] = useState<{
    available: boolean;
    hours_remaining?: number;
    reason?: string;
  }>({ available: true });
  const [loading, setLoading] = useState(true);
  const [wipeMs, setWipeMs] = useState<number | null>(null);
  const [wipeLabel, setWipeLabel] = useState("Server Wipe");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    fetchInsuranceStatus();
    fetch("/api/admin/wipe-timer", { cache: "no-store" })
      .then(r => r.json())
      .then(d => { if (d.ok && d.wipeAt) { setWipeMs(new Date(d.wipeAt).getTime()); setWipeLabel(d.label ?? "Server Wipe"); } })
      .catch(() => {});
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  async function fetchInsuranceStatus() {
    try {
      const res = await fetch("/api/store/insurance-status");
      const data = await res.json();
      if (data.ok) {
        setInsuranceStatus({
          available: data.available,
          hours_remaining: data.hours_remaining,
          reason: data.reason,
        });
      }
    } catch (e) {
      console.error("Failed to fetch insurance status:", e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden text-slate-200">

      <div className="relative mx-auto w-full max-w-7xl px-4 py-10 sm:py-14">

      {/* Wipe status banner */}
      {wipeMs && (() => {
        const ms = wipeMs - now;
        const past = ms <= 0;
        const abs = Math.abs(ms);
        const d = Math.floor(abs / 86400000);
        const h = Math.floor((abs % 86400000) / 3600000);
        const m = Math.floor((abs % 3600000) / 60000);
        const pad = (n: number) => String(n).padStart(2, "0");
        const display = d > 0 ? `${pad(d)}d ${pad(h)}h ${pad(m)}m` : `${pad(h)}h ${pad(m)}m`;
        return past ? (
          <div className="mb-8 flex items-center gap-4 rounded-[2rem] border border-rose-500/30 bg-rose-500/10 p-6 backdrop-blur-xl shadow-[0_0_40px_-10px_rgba(244,63,94,0.2)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/20 text-2xl">⚠️</div>
            <div>
              <div className="text-lg font-black tracking-tight text-rose-100 uppercase">Wipe has occurred</div>
              <div className="text-sm text-rose-300/80 font-medium">New wipe timer will be set soon. Packs purchased now apply to the next wipe.</div>
            </div>
          </div>
        ) : (
          <div className="mb-8 flex flex-wrap items-center justify-between gap-6 rounded-[2rem] border border-orange-500/30 bg-orange-500/10 p-6 backdrop-blur-xl shadow-[0_0_40px_-10px_rgba(249,115,22,0.2)]">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/20 text-2xl">⏳</div>
              <div>
                <div className="text-lg font-black tracking-tight text-orange-100 uppercase">Wipe Status: Active</div>
                <div className="text-sm text-orange-300/80 font-medium">Secure your pack and VIP before the next server reset.</div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-400/60">{wipeLabel} starting in</div>
              <div className="font-mono text-3xl font-black text-orange-200 tabular-nums drop-shadow-[0_0_15px_rgba(251,146,60,0.5)]">{display}</div>
            </div>
          </div>
        );
      })()}

      <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-xl group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-cyan-500/5" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
              Intelligence Store
            </div>
            <h1 className="mt-6 text-5xl font-black leading-none tracking-tight text-white sm:text-6xl">
              Resource <br />
              <span className="bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">Deployment</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-medium leading-relaxed text-slate-400">
              High-tier tactical resources for survival and dominance. All packs include automated Discord logging and VIP status.
            </p>

            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/5 bg-black/40 p-5 transition-colors hover:border-white/10">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Price Point</div>
                <div className="mt-2 text-3xl font-black text-white">$5<span className="text-sm font-medium text-slate-500 ml-1">USD</span></div>
                <div className="mt-2 text-xs text-slate-500 font-medium">Standardized flat pricing.</div>
              </div>
              <div className="rounded-2xl border border-white/5 bg-black/40 p-5 transition-colors hover:border-white/10">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Protocol</div>
                <div className="mt-2 text-3xl font-black text-white">Secure</div>
                <div className="mt-2 text-xs text-slate-500 font-medium">Encrypted PayPal flow.</div>
              </div>
              <div className="rounded-2xl border border-white/5 bg-black/40 p-5 transition-colors hover:border-white/10">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Authorization</div>
                <div className="mt-2 text-3xl font-black text-white">Instant</div>
                <div className="mt-2 text-xs text-slate-500 font-medium">Automated staff alerts.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[2.5rem] border border-white/10 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
            System Requirements
          </div>
          <div className="mt-6 space-y-4">
            {[
              { id: "01", t: "Discord Integration", d: "OAuth identity verification required for delivery." },
              { id: "02", t: "UID Syncing", d: "Packs are bound to your linked game identifier." },
              { id: "03", t: "Staff Monitoring", d: "Every transaction generates a secure staff ticket." }
            ].map(step => (
              <div key={step.id} className="flex gap-4 group">
                <span className="text-xl font-black text-white/10 group-hover:text-cyan-500/40 transition-colors">{step.id}</span>
                <div>
                  <div className="text-sm font-black text-slate-200 tracking-tight uppercase">{step.t}</div>
                  <div className="text-xs text-slate-500 mt-1 font-medium">{step.d}</div>
                </div>
              </div>
            ))}
          </div>

          {!user ? (
            <div className="mt-6 rounded-[1.5rem] border border-amber-300/20 bg-amber-400/10 p-4">
              <div className="text-sm font-semibold text-amber-100">Login required to buy</div>
              <div className="mt-2 text-sm text-amber-50/90">
                You can browse the store now, but checkout starts after Discord login.
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <a
                  className="inline-flex h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#67e8f9,#facc15)] px-5 text-sm font-semibold text-slate-950 transition hover:scale-[1.01]"
                  href="/auth/discord/start?next=/store"
                >
                  Sign in with Discord
                </a>
                <a
                  className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
                  href="/dashboard"
                >
                  Go to Dashboard
                </a>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-[1.5rem] border border-emerald-300/20 bg-emerald-400/10 p-4">
              <div className="text-sm font-semibold text-emerald-100">
                Signed in as {user.global_name || user.username}
              </div>
              <div className="mt-2 text-sm text-emerald-50/90">
                Account securely linked. Purchases will be automatically delivered to your in-game inventory.
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Insurance Status Banner */}
      {!loading && !insuranceStatus.available && (
        <div className="mt-6 rounded-2xl border border-rose-300/20 bg-rose-400/10 p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <div className="text-sm font-semibold text-rose-100">Insurance Currently Unavailable</div>
              <div className="text-sm text-rose-50/80">
                {insuranceStatus.reason || "Insurance is disabled during the final days of the wipe."}
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && insuranceStatus.available && insuranceStatus.hours_remaining !== undefined && insuranceStatus.hours_remaining < 48 && (
        <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⏰</span>
            <div>
              <div className="text-sm font-semibold text-amber-100">Insurance Available - Limited Time</div>
              <div className="text-sm text-amber-50/80">
                Insurance will be disabled in ~{insuranceStatus.hours_remaining} hours. Purchase soon!
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="mt-12 grid gap-8 md:grid-cols-2">
        {products.map((product) => {
          const isInsurance = product.slug === "insurance";
          const isDisabled = isInsurance && !insuranceStatus.available;

          let cardBg = "bg-indigo-500/5";
          if (product.slug === "construction") cardBg = "bg-amber-500/5";
          if (product.slug === "defense") cardBg = "bg-slate-500/5";
          if (product.slug === "tactical") cardBg = "bg-rose-500/5";
          if (product.slug === "clan") cardBg = "bg-indigo-500/5";
          if (product.slug === "vip") cardBg = "bg-emerald-500/5";

          return (
            <article
              key={product.slug}
              className={`group relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:border-cyan-500/50 hover:shadow-[0_0_40px_-10px_rgba(6,182,212,0.2)] ${
                isDisabled ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              <div className={`absolute inset-0 -z-10 ${cardBg}`} />
              
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
                    {product.badge}
                  </div>
                  <div className="text-3xl font-black text-white tracking-tighter">
                    ${product.price}
                  </div>
                </div>

                <h2 className="mt-6 text-3xl font-black leading-tight text-white tracking-tight uppercase">{product.name}</h2>
                <p className="mt-3 text-sm font-medium leading-relaxed text-slate-400">{product.summary}</p>

                <div className="mt-8 space-y-3">
                  {product.bullets.map((item) => {
                    const lItem = item.toLowerCase();
                    let styleClass = "bg-white/5 border-white/10 text-slate-200";
                    let dotColor = "text-cyan-400";

                    if (lItem.includes("stone")) { 
                      styleClass = "bg-gradient-to-br from-stone-800 to-stone-700 border-stone-500/60 text-stone-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_6px_-1px_rgba(0,0,0,0.5)]"; 
                      dotColor = "text-stone-300";
                    }
                    else if (lItem.includes("wood")) { 
                      styleClass = "bg-gradient-to-br from-[#5c3e29] to-[#422a1b] border-[#8a5d3c]/60 text-[#f5e5d5] shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_4px_6px_-1px_rgba(0,0,0,0.5)]"; 
                      dotColor = "text-[#d19466]";
                    }
                    else if (lItem.includes("steel")) { 
                      styleClass = "bg-gradient-to-br from-slate-500 via-slate-400 to-slate-500 border-slate-300 text-slate-900 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),0_4px_6px_-1px_rgba(0,0,0,0.5)]"; 
                      dotColor = "text-slate-900";
                    }
                    else if (lItem.includes("tungsten")) { 
                      styleClass = "bg-gradient-to-br from-cyan-900 via-teal-700 to-cyan-950 border-cyan-400/80 text-white shadow-[inset_0_1px_3px_rgba(34,211,238,0.5),0_4px_6px_-1px_rgba(0,0,0,0.5)]"; 
                      dotColor = "text-cyan-200";
                    }
                    else if (lItem.includes("rifle") || lItem.includes("ammo") || lItem.includes("p90") || lItem.includes("mk14") || lItem.includes("shotgun")) { 
                      styleClass = "bg-gradient-to-br from-rose-950 to-red-900 border-red-500/40 text-rose-100 shadow-md"; 
                      dotColor = "text-rose-400";
                    }
                    else if (lItem.includes("pulse") || lItem.includes("generator") || lItem.includes("trap")) { 
                      styleClass = "bg-gradient-to-br from-indigo-950 to-violet-900 border-violet-500/40 text-indigo-100 shadow-md"; 
                      dotColor = "text-indigo-400";
                    }
                    else if (lItem.includes("blueprint") || lItem.includes("use") || lItem.includes("returned")) {
                      styleClass = "bg-gradient-to-br from-emerald-950 to-green-900 border-emerald-500/40 text-emerald-100 shadow-md";
                      dotColor = "text-emerald-400";
                    }

                    return (
                      <div key={item} className={`flex items-center gap-4 rounded-2xl border p-4 transition-all group/item ${styleClass}`}>
                         <span className={`flex h-2 w-2 rounded-full animate-pulse shrink-0 ${dotColor} bg-current shadow-[0_0_8px_currentColor]`} />
                         <span className="text-sm font-black tracking-tight uppercase">{item}</span>
                      </div>
                    );
                  })}
                </div>

                {product.addons?.length ? (
                  <div className="mt-8 rounded-3xl border border-white/5 bg-black/40 p-6">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                      Supplemental Hardware
                    </div>
                    <div className="mt-4 grid gap-3">
                      {product.addons.map((addon) => (
                        <div key={addon} className="flex items-center gap-3 text-xs font-bold text-slate-400 uppercase tracking-tight">
                          <span className="h-1 w-1 rounded-full bg-slate-600" />
                          {addon}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-8 flex items-center justify-between gap-4 pt-6 border-t border-white/10">
                   <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Status</span>
                      <span className="text-xs font-black text-cyan-400 uppercase tracking-widest">{isDisabled ? "Protocol Locked" : "System Ready"}</span>
                   </div>
                   {user && !isDisabled ? (
                    <BuyButton 
                      packName={product.name} 
                      packPrice={product.price} 
                      packSlug={product.slug}
                      buyUrl={product.buyUrl} 
                      user={user} 
                    />
                  ) : (
                    <a className="inline-flex h-12 items-center justify-center rounded-2xl bg-white/10 px-8 text-xs font-black text-white transition hover:bg-white/20 uppercase tracking-[0.1em]" href={isDisabled ? "#" : "/dashboard"}>
                      {isDisabled ? "Locked" : "Login to Deploy"}
                    </a>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </section>
      </div>
    </div>
  );
}
