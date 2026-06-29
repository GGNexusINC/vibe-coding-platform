"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function PveServerPage() {
  const [wipeMs, setWipeMs] = useState<number | null>(null);
  const [wipeLabel, setWipeLabel] = useState("PvE Season Reset");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    fetch("/api/admin/pve-wipe-timer", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.wipeAt) {
          setWipeMs(new Date(d.wipeAt).getTime());
          setWipeLabel(d.label ?? "PvE Season Reset");
        }
      })
      .catch(() => {});
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(tick);
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden text-slate-200">
      {/* Background aesthetics matching forest theme */}
      <div className="pointer-events-none absolute inset-0 rz-bg opacity-20 rz-drift" />
      <div className="pointer-events-none absolute inset-0 rz-grid opacity-10" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#061e14]/50 via-[#030a08]/90 to-slate-950" />
      <div className="pointer-events-none absolute -left-40 top-10 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute right-[-6rem] top-36 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl" />

      <section className="relative mx-auto w-full max-w-7xl px-4 py-16 sm:py-24">
        {/* Banner header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="rz-chip border-emerald-500/30 bg-emerald-500/10 text-emerald-300 before:bg-emerald-400">PvE Realm</div>
          <h1 className="mt-6 font-[family:var(--font-brand-display)] text-5xl font-black uppercase tracking-[0.06em] text-white sm:text-6xl">
            Once Human <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">PvE Server</span>
          </h1>
          <p className="mt-6 text-base sm:text-lg text-slate-400 leading-relaxed">
            Cooperate, survive, and build together in a customized, peaceful Once Human realm. Explore high-tier boss encounters, participate in building contests, and progress without open-world PvP pressure.
          </p>
        </div>

        {/* Wipe Countdown Timer Banner */}
        {wipeMs ? (() => {
          const ms = wipeMs - now;
          const past = ms <= 0;
          const abs = Math.abs(ms);
          const d = Math.floor(abs / 86400000);
          const h = Math.floor((abs % 86400000) / 3600000);
          const m = Math.floor((abs % 3600000) / 60000);
          const s = Math.floor((abs % 60000) / 1000);
          const pad = (n: number) => String(n).padStart(2, "0");
          const display = `${pad(d)}d : ${pad(h)}h : ${pad(m)}m : ${pad(s)}s`;
          return (
            <div className="mb-12 rounded-[2rem] border border-emerald-500/30 bg-emerald-500/5 p-8 backdrop-blur-xl shadow-[0_0_50px_-10px_rgba(16,185,129,0.15)] flex flex-col md:flex-row items-center justify-between gap-6 max-w-4xl mx-auto">
              <div className="flex items-center gap-4 text-left">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-2xl">⏳</div>
                <div>
                  <div className="text-lg font-black tracking-tight text-emerald-100 uppercase">{wipeLabel}</div>
                  <div className="text-sm text-slate-400 font-medium">Secure your wipe packs and build plans before the next seasonal shift.</div>
                </div>
              </div>
              <div className="flex flex-col items-center md:items-end gap-1">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">Season starts in</div>
                <div className="font-mono text-3xl font-black text-emerald-300 tabular-nums drop-shadow-[0_0_15px_rgba(52,211,153,0.4)]">{past ? "00d : 00h : 00m : 00s" : display}</div>
              </div>
            </div>
          );
        })() : (
          <div className="mb-12 rounded-[2rem] border border-emerald-500/20 bg-emerald-500/5 p-8 backdrop-blur-xl shadow-[0_0_30px_-10px_rgba(16,185,129,0.08)] flex flex-col md:flex-row items-center justify-between gap-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4 text-left">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-2xl">🛡️</div>
              <div>
                <div className="text-lg font-black tracking-tight text-emerald-100 uppercase">Season Status: Stable & Active</div>
                <div className="text-sm text-slate-400 font-medium">No Wipe Scheduled. The PvE server wipe cycle will only happen when announced by Admins.</div>
              </div>
            </div>
            <div className="flex flex-col items-center md:items-end gap-1">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">Next Season Reset</div>
              <div className="font-mono text-lg font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-4 py-1.5 rounded-lg border border-emerald-500/20">Pending Admin Call</div>
            </div>
          </div>
        )}

        {/* Server specifications grid */}
        <div className="grid gap-6 md:grid-cols-3 mb-16">
          {[
            { title: "EXP Rate", value: "2x Boost", desc: "Enjoy a speedier level progression to dive straight into endgame dungeons.", emoji: "⚡" },
            { title: "Gathering Yield", value: "2x Yield", desc: "Spend less time grinding resources. Stone, wood, and iron gathering speeds are doubled.", emoji: "🪵" },
            { title: "World Difficulty", value: "Hard Mode", desc: "Dungeons, bosses, and Prime Wars feature increased difficulty for maximum cooperative challenge.", emoji: "💀" }
          ].map((spec) => (
            <div key={spec.title} className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 text-left hover:border-emerald-500/20 transition duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 opacity-10 bg-emerald-500 rounded-full blur-2xl group-hover:opacity-20 transition" />
              <span className="text-3xl">{spec.emoji}</span>
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mt-4">{spec.title}</h3>
              <div className="text-2xl font-black text-white mt-1 uppercase tracking-tight">{spec.value}</div>
              <p className="text-xs text-slate-400 mt-2 font-medium leading-relaxed">{spec.desc}</p>
            </div>
          ))}
        </div>

        {/* Rules and guidelines */}
        <div className="grid gap-8 lg:grid-cols-2 items-start mb-16">
          <div className="rounded-[2rem] border border-white/10 bg-slate-900/30 p-8 sm:p-10 text-left relative overflow-hidden">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300 mb-6">
              Server Guidelines
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-4">PvE Rules & Etiquette</h2>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              Our PvE realm is built on trust, cooperation, and community. Please review our server code of conduct below. Violations will result in warnings or bans.
            </p>
            
            <div className="space-y-4">
              {[
                { id: "01", t: "No Base Griefing", d: "Do not block resources, spawn points, or build close enough to prevent another player from expanding their base." },
                { id: "02", t: "Free Trade Market", d: "Trading hubs are encouraged. Keep public marketplace regions clear and vendor pricing fair to maintain a stable economy." },
                { id: "03", t: "Co-op Boss Etiquette", d: "Coordinate with other players before triggering high-tier world events or Prime Wars. Let others join the reward pool." },
                { id: "04", t: "Report System Exploits", d: "Using terrain bugs or duping glitches to bypass mechanics is strictly bannable. Report issues directly via Support." }
              ].map(rule => (
                <div key={rule.id} className="flex gap-4 group">
                  <span className="text-lg font-black text-emerald-500/30 group-hover:text-emerald-400 transition-colors font-mono">{rule.id}</span>
                  <div>
                    <h4 className="text-sm font-black text-slate-200 tracking-tight uppercase">{rule.t}</h4>
                    <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">{rule.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Connect / Actions Card */}
          <div className="flex flex-col gap-6">
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/30 p-8 text-left relative overflow-hidden">
              <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">How to Connect</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Locate our server directly inside the Once Human client using the connection details below:
              </p>
              
              <div className="space-y-3 bg-black/40 p-5 rounded-2xl border border-white/5 font-mono text-xs mb-6">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-500 uppercase">Realm:</span>
                  <span className="text-emerald-400 font-bold">NewHopeGGN [PvE]</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-500 uppercase">Region:</span>
                  <span className="text-slate-300">North America (NA)</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-slate-500 uppercase">Status:</span>
                  <span className="text-emerald-400 font-bold animate-pulse">Online</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Link
                  href="/store?tab=pve"
                  className="flex h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-xs font-black text-white hover:scale-105 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition uppercase tracking-wider"
                >
                  🛒 Get PvE Wipe Packs
                </Link>
                <Link
                  href="/support"
                  className="flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-xs font-black text-slate-200 hover:bg-white/10 transition uppercase tracking-wider"
                >
                  🎫 Support Center
                </Link>
              </div>
            </div>

            {/* Quick Discord sync callout */}
            <div className="rounded-2xl border border-white/5 bg-slate-900/10 p-6 text-left">
              <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider">Discord Integration</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed mt-2 font-medium">
                Packs purchased on this site link automatically to your linked Discord profile. Link your Discord in the Dashboard to coordinate with your squad and check queue positions.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
