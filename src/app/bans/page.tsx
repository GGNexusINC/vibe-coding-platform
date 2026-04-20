"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Ban = {
  id: string;
  target_discord_id: string;
  actor_username: string;
  reason: string;
  created_at: string;
};

export default function BanListPage() {
  const [bans, setBans] = useState<Ban[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/bans")
      .then((r) => r.json())
      .then((d) => { setBans(d.bans ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = bans.filter((b) => {
    const q = search.toLowerCase();
    return (
      b.target_discord_id.includes(q) ||
      b.reason.toLowerCase().includes(q) ||
      b.actor_username.toLowerCase().includes(q)
    );
  });

  return (
    <div className="relative min-h-screen bg-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(239,68,68,0.07),transparent_55%)]" />

      <div className="relative mx-auto max-w-4xl px-4 py-14">
        {/* Header */}
        <div className="mb-2 flex items-center gap-2">
          <Link href="/" className="text-[11px] text-slate-600 hover:text-slate-400 transition">← Home</Link>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-rose-400/80 border border-rose-400/20 bg-rose-400/5 rounded-full px-3 py-1">🔨 Enforcement</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Ban List</h1>
            <p className="mt-1 text-sm text-slate-500">Public record of moderation actions on the NewHopeGGN server.</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span className="rounded-xl border border-white/6 bg-white/3 px-3 py-1.5">
              {bans.length} total bans
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="mb-5">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Discord ID, reason, or admin…"
            className="w-full h-11 rounded-2xl border border-white/8 bg-slate-900/80 px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-rose-400/30 transition"
          />
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-white/6 bg-gradient-to-b from-slate-900/80 to-slate-950/80 overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-500 animate-pulse">Loading ban records…</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-600">
              {search ? "No bans match your search." : "No bans recorded yet."}
            </div>
          ) : (
            <div className="divide-y divide-white/4">
              {/* Header row */}
              <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                <span>Player / Reason</span>
                <span className="text-right">Admin</span>
                <span className="text-right">Date</span>
              </div>
              {filtered.map((ban) => (
                <div key={ban.id} className="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-4 items-start hover:bg-white/2 transition">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-rose-400">🔨</span>
                      <code className="text-xs font-mono text-slate-300 bg-slate-800/60 px-2 py-0.5 rounded-lg">
                        {ban.target_discord_id}
                      </code>
                    </div>
                    <div className="mt-1 text-sm text-slate-400 leading-relaxed line-clamp-2">{ban.reason}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-semibold text-slate-400">{ban.actor_username}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs text-slate-600 tabular-nums">
                      {new Date(ban.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-[11px] text-slate-700">
          Bans are applied by NewHopeGGN staff. To appeal, open a{" "}
          <Link href="/support" className="text-slate-500 hover:text-slate-300 underline transition">support ticket</Link>.
        </p>
      </div>
    </div>
  );
}
