"use client";

import { useEffect, useState } from "react";

const CURRENT_PRIZE = "Once Human Supply Pack (Rare Gear + Resources)";

export default function LotteryPage() {
  const [totalEntries, setTotalEntries] = useState<number | null>(null);
  const [entered, setEntered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [draws, setDraws] = useState<{ winnerUsername: string; prize: string; drawnAt: string }[]>([]);

  useEffect(() => {
    void fetch("/api/lottery/enter")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setTotalEntries(d.totalEntries); });
  }, []);

  async function handleEnter() {
    setLoading(true);
    setError("");
    setStatus("");
    const res = await fetch("/api/lottery/enter", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prize: CURRENT_PRIZE }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data?.error || "Could not enter lottery.");
    } else {
      setEntered(true);
      setTotalEntries(data.totalEntries);
      setStatus("You're in! Good luck! 🎉");
    }
  }

  return (
    <div className="relative mx-auto w-full max-w-4xl px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(250,204,21,0.12),transparent_60%)]" />

      <div className="relative">
        <div className="rz-chip mb-4">🎰 Lottery</div>
        <h1 className="text-4xl font-bold text-white sm:text-5xl">
          Win Once Human <span className="bg-[linear-gradient(135deg,#facc15,#f97316)] bg-clip-text text-transparent">Items</span>
        </h1>
        <p className="mt-3 text-slate-400">Enter the lottery for a chance to win in-game items. Winners are drawn by admins and notified via Discord.</p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {/* Prize Card */}
          <div className="rz-surface rz-panel-border rounded-[2rem] p-7">
            <div className="text-xs font-semibold uppercase tracking-widest text-amber-400">Current Prize</div>
            <div className="mt-3 text-xl font-bold text-white">{CURRENT_PRIZE}</div>
            <div className="mt-2 text-sm text-slate-400">One winner drawn randomly from all entries.</div>

            <div className="mt-6 flex items-center gap-3">
              <div className="text-3xl font-bold text-white">{totalEntries ?? "—"}</div>
              <div className="text-sm text-slate-400">entries so far</div>
            </div>

            {entered ? (
              <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300">
                ✅ {status}
              </div>
            ) : (
              <button
                onClick={handleEnter}
                disabled={loading}
                className="mt-6 w-full h-12 rounded-2xl bg-[linear-gradient(135deg,#facc15,#f97316)] text-sm font-bold text-slate-950 transition hover:scale-[1.02] disabled:opacity-60"
              >
                {loading ? "Entering..." : "Enter Lottery — It's Free!"}
              </button>
            )}

            {error ? (
              <div className="mt-3 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                {error}
              </div>
            ) : null}

            <p className="mt-4 text-xs text-slate-500">You must be signed in with Discord. One entry per account.</p>
          </div>

          {/* How it works */}
          <div className="rz-surface rz-panel-border rounded-[2rem] p-7">
            <div className="text-xs font-semibold uppercase tracking-widest text-cyan-400">How It Works</div>
            <ul className="mt-4 space-y-4">
              {[
                ["🔐", "Sign in with Discord", "Your Discord account is your entry ticket."],
                ["🎟️", "Enter for free", "Click the button — no cost, no catch."],
                ["🎲", "Admin draws winner", "A random winner is picked from all entries."],
                ["📢", "Winner announced", "Result posted on Discord & shown below."],
                ["📦", "Prize delivered", "Admin contacts winner in-game to deliver items."],
              ].map(([icon, title, desc]) => (
                <li key={title} className="flex gap-3">
                  <span className="text-xl">{icon}</span>
                  <div>
                    <div className="text-sm font-semibold text-white">{title}</div>
                    <div className="text-xs text-slate-400">{desc}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Past Winners */}
        {draws.length > 0 && (
          <div className="mt-10">
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Past Winners</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {draws.map((d, i) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-slate-950/60 px-4 py-3">
                  <span className="text-2xl">🏆</span>
                  <div>
                    <div className="text-sm font-semibold text-white">{d.winnerUsername}</div>
                    <div className="text-xs text-slate-400">{d.prize}</div>
                    <div className="text-xs text-slate-500">{new Date(d.drawnAt).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
