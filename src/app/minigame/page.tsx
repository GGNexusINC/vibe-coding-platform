"use client";

import { useEffect, useState, useRef } from "react";

const PRIZES = [
  { name: "M4A1 Assault Rifle", rarity: "rare", emoji: "🔫", bg: "#1d4ed8" },
  { name: "Flamethrower", rarity: "legendary", emoji: "🔥", bg: "#ea580c" },
  { name: "AK-47 Assault Rifle", rarity: "rare", emoji: "🔫", bg: "#1d4ed8" },
  { name: "Better Luck", rarity: "none", emoji: "😔", bg: "#334155" },
  { name: "Sniper Rifle (AWM)", rarity: "epic", emoji: "🎯", bg: "#7c3aed" },
  { name: "SPAS-12 Shotgun", rarity: "uncommon", emoji: "💥", bg: "#15803d" },
  { name: "MP5 SMG", rarity: "uncommon", emoji: "🔫", bg: "#15803d" },
  { name: "Minigun", rarity: "legendary", emoji: "⚙️", bg: "#dc2626" },
  { name: "Desert Eagle", rarity: "common", emoji: "🔫", bg: "#475569" },
  { name: "Crossbow", rarity: "common", emoji: "🏹", bg: "#475569" },
];

const RARITY_COLORS: Record<string, string> = {
  legendary: "text-orange-400 border-orange-400/30 bg-orange-400/10",
  epic: "text-violet-400 border-violet-400/30 bg-violet-400/10",
  rare: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  uncommon: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  common: "text-slate-300 border-slate-400/30 bg-slate-400/10",
  none: "text-slate-500 border-slate-600/30 bg-slate-600/10",
};

function formatCountdown(ms: number) {
  if (ms <= 0) return "Ready!";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function MinigamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [spinning, setSpinning] = useState(false);
  const [canSpin, setCanSpin] = useState(false);
  const [msLeft, setMsLeft] = useState(0);
  const [result, setResult] = useState<{ name: string; rarity: string; emoji: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastPrize, setLastPrize] = useState("");
  const rotRef = useRef(0);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    void fetch("/api/minigame/spin")
      .then((r) => r.json())
      .then((d) => {
        setCanSpin(d.canSpin ?? false);
        setMsLeft(d.msLeft ?? 0);
        setLastPrize(d.lastPrize ?? "");
        setLoading(false);
      });
  }, []);

  // Countdown timer
  useEffect(() => {
    if (msLeft <= 0) return;
    const t = window.setInterval(() => {
      setMsLeft((prev) => {
        const next = prev - 1000;
        if (next <= 0) { setCanSpin(true); return 0; }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [msLeft]);

  // Draw wheel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawWheel(canvas, rotRef.current);
  }, []);

  function drawWheel(canvas: HTMLCanvasElement, rotation: number) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = cx - 8;
    const slice = (2 * Math.PI) / PRIZES.length;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, r + 6, 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 6;
    ctx.stroke();

    PRIZES.forEach((p, i) => {
      const start = rotation + i * slice;
      const end = start + slice;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();
      ctx.fillStyle = p.bg;
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + slice / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px sans-serif";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 4;
      ctx.fillText(p.emoji + " " + p.name.split(" ")[0], r - 10, 4);
      ctx.restore();
    });

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, 2 * Math.PI);
    ctx.fillStyle = "#0f172a";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Pointer at top
    ctx.beginPath();
    ctx.moveTo(cx, 4);
    ctx.lineTo(cx - 10, 22);
    ctx.lineTo(cx + 10, 22);
    ctx.closePath();
    ctx.fillStyle = "#facc15";
    ctx.fill();
  }

  async function handleSpin() {
    if (spinning || !canSpin) return;
    setSpinning(true);
    setResult(null);
    setError("");

    const canvas = canvasRef.current;
    if (!canvas) { setSpinning(false); return; }

    // Animate spin first (visual only)
    const totalRotation = (Math.PI * 2 * (8 + Math.random() * 5));
    const duration = 4000;
    const startTime = performance.now();
    const startRot = rotRef.current;

    function easeOut(t: number) { return 1 - Math.pow(1 - t, 3); }

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      rotRef.current = startRot + totalRotation * easeOut(progress);
      drawWheel(canvas!, rotRef.current);
      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        finalizeResult();
      }
    }
    animRef.current = requestAnimationFrame(animate);

    async function finalizeResult() {
      const res = await fetch("/api/minigame/spin", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      setSpinning(false);
      if (!res.ok) {
        setError(data?.error || "Could not spin.");
        if (data?.msLeft) { setMsLeft(data.msLeft); setCanSpin(false); }
      } else {
        setResult(data.prize);
        setCanSpin(false);
        setMsLeft(7 * 24 * 60 * 60 * 1000);
      }
    }
  }

  return (
    <div className="relative mx-auto w-full max-w-4xl px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(239,68,68,0.12),transparent_60%)]" />

      <div className="relative">
        <div className="rz-chip mb-4">🎮 Mini-Game</div>
        <h1 className="text-4xl font-bold text-white">
          Weekly <span className="bg-[linear-gradient(135deg,#f97316,#ef4444)] bg-clip-text text-transparent">Gun Spin</span>
        </h1>
        <p className="mt-2 text-slate-400">Spin once per week for a chance to win Once Human weapons. Winners are notified via Discord.</p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* Wheel */}
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <canvas
                ref={canvasRef}
                width={340}
                height={340}
                className="rounded-full shadow-[0_0_60px_rgba(239,68,68,0.2)]"
              />
            </div>

            {loading ? (
              <div className="text-sm text-slate-400">Checking eligibility...</div>
            ) : (
              <button
                onClick={() => void handleSpin()}
                disabled={spinning || !canSpin}
                className={`h-14 w-48 rounded-2xl text-base font-bold transition ${
                  canSpin && !spinning
                    ? "bg-[linear-gradient(135deg,#f97316,#ef4444)] text-white hover:scale-[1.04] shadow-[0_0_30px_rgba(239,68,68,0.3)]"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                }`}
              >
                {spinning ? "Spinning..." : canSpin ? "🎰 SPIN!" : formatCountdown(msLeft)}
              </button>
            )}

            {!canSpin && msLeft > 0 && !spinning && (
              <div className="text-center">
                <div className="text-xs text-slate-500">Next spin available in</div>
                <div className="text-lg font-bold text-amber-400">{formatCountdown(msLeft)}</div>
                {lastPrize && <div className="mt-1 text-xs text-slate-400">Last win: {lastPrize}</div>}
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300 text-center">
                {error}
              </div>
            )}

            {result && (
              <div className={`rounded-[1.5rem] border px-6 py-5 text-center w-full max-w-sm ${RARITY_COLORS[result.rarity]}`}>
                <div className="text-4xl mb-2">{result.emoji}</div>
                <div className="text-xl font-bold text-white">{result.name}</div>
                <div className={`mt-1 text-xs font-semibold uppercase tracking-widest ${RARITY_COLORS[result.rarity].split(" ")[0]}`}>
                  {result.rarity === "none" ? "No prize this week" : `${result.rarity} item`}
                </div>
                {result.rarity !== "none" && (
                  <div className="mt-3 text-xs text-slate-400">
                    An admin will deliver this item to you in-game. Check Discord for confirmation!
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Prize table */}
          <div className="rz-surface rz-panel-border rounded-[2rem] p-5">
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Prize Pool</div>
            <div className="space-y-2">
              {[
                { rarity: "legendary", prizes: ["Flamethrower", "Minigun"], chance: "3%" },
                { rarity: "epic", prizes: ["Sniper Rifle (AWM)"], chance: "6%" },
                { rarity: "rare", prizes: ["M4A1", "AK-47"], chance: "24%" },
                { rarity: "uncommon", prizes: ["SPAS-12", "MP5"], chance: "30%" },
                { rarity: "common", prizes: ["Desert Eagle", "Crossbow"], chance: "40%" },
              ].map((tier) => (
                <div key={tier.rarity} className={`rounded-2xl border px-3 py-2 ${RARITY_COLORS[tier.rarity]}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold uppercase ${RARITY_COLORS[tier.rarity].split(" ")[0]}`}>{tier.rarity}</span>
                    <span className="text-xs text-slate-400">{tier.chance}</span>
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">{tier.prizes.join(", ")}</div>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-4 border-t border-white/8 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">Rules</div>
              {[
                "One spin per Discord account per week",
                "Prizes delivered in-game by admins",
                "Must be signed in with Discord",
                "Results posted to Discord automatically",
              ].map((r) => (
                <div key={r} className="flex items-start gap-2 text-xs text-slate-400">
                  <span className="text-amber-400 shrink-0">›</span>
                  {r}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
