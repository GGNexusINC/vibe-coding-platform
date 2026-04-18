"use client";

import { useEffect, useState, useRef, useCallback } from "react";

// ── Once Human Whack-a-Mole ──────────────────────────────────────────────────
// Harder: faster moles, multiple simultaneous, infected bomb moles (-2 penalty),
// miss penalty (-1), shrinking windows as score climbs.
// Theme: Once Human post-apocalyptic / biohazard.

const GRID = 9;
const GAME_DURATION = 30;
// Spawn delay: starts at 900ms, floors at 350ms. Gentler ramp.
const BASE_DELAY = 900;
const MIN_DELAY = 350;
const SPEED_STEP = 15; // ms faster per hit
// Infected moles appear 15% of the time after score ≥ 5
const BOMB_CHANCE = 0.15;
// How many simultaneous active cells (increases with score)
const MAX_ACTIVE = (score: number) => score >= 25 ? 3 : score >= 12 ? 2 : 1;

const RARITY_STYLE: Record<string, { text: string; border: string; bg: string; glow: string }> = {
  legendary: { text: "text-orange-400", border: "border-orange-400/50", bg: "bg-orange-400/10",  glow: "shadow-[0_0_40px_rgba(251,146,60,0.6)]" },
  epic:      { text: "text-violet-400", border: "border-violet-400/50", bg: "bg-violet-400/10",  glow: "shadow-[0_0_40px_rgba(167,139,250,0.6)]" },
  rare:      { text: "text-blue-400",   border: "border-blue-400/50",   bg: "bg-blue-400/10",    glow: "shadow-[0_0_30px_rgba(96,165,250,0.5)]" },
  uncommon:  { text: "text-emerald-400",border: "border-emerald-400/40",bg: "bg-emerald-400/10", glow: "shadow-[0_0_20px_rgba(52,211,153,0.3)]" },
  common:    { text: "text-slate-300",  border: "border-slate-400/30",  bg: "bg-slate-400/10",   glow: "" },
  none:      { text: "text-slate-500",  border: "border-slate-600/30",  bg: "bg-slate-600/10",   glow: "" },
};

function scoreToPrize(score: number) {
  if (score >= 60) return { name: "AWS.338 - Bullseye",   rarity: "legendary", emoji: "🎯", image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2139460/ss_1.jpg" };
  if (score >= 48) return { name: "HAMR - Brahminy",       rarity: "legendary", emoji: "🦅", image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2139460/ss_2.jpg" };
  if (score >= 36) return { name: "SN700 - Gulped Lore",  rarity: "epic",      emoji: "🐍", image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2139460/ss_3.jpg" };
  if (score >= 28) return { name: "M416 - Scorched Earth",rarity: "rare",      emoji: "�", image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2139460/ss_4.jpg" };
  if (score >= 20) return { name: "SOCR - Outsider",      rarity: "rare",      emoji: "⚔️", image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2139460/ss_5.jpg" };
  if (score >= 14) return { name: "ACS12 - Corrosion",    rarity: "uncommon",  emoji: "☣️", image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2139460/ss_6.jpg" };
  if (score >= 8)  return { name: "KV-SBR - Little Jaws",  rarity: "uncommon",  emoji: "🦈", image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2139460/ss_7.jpg" };
  if (score >= 2)  return { name: "DE.50",                rarity: "common",    emoji: "🔫", image: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2139460/ss_8.jpg" };
  return              { name: "Better Luck Next Time",  rarity: "none",      emoji: "☣️", image: "" };
}

function formatCountdown(ms: number) {
  if (ms <= 0) return "Ready!";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// cell state type: null = empty, "mole" = good, "bomb" = infected/penalty
type CellState = null | "mole" | "bomb";

export default function MinigamePage() {
  const [phase, setPhase] = useState<"idle" | "playing" | "submitting" | "done">("idle");
  const [canPlay, setCanPlay] = useState(false);
  const [msLeft, setMsLeft] = useState(0);
  const [lastPrize, setLastPrize] = useState("");
  const [checkLoading, setCheckLoading] = useState(true);

  // game state — cells array instead of single active index
  const [cells, setCells] = useState<CellState[]>(Array(GRID).fill(null));
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [hitIdx, setHitIdx] = useState<number | null>(null);
  const [penaltyIdx, setPenaltyIdx] = useState<number | null>(null);
  const [missIdx, setMissIdx] = useState<number | null>(null);
  const [scoreFlash, setScoreFlash] = useState<string | null>(null);

  // result
  const [result, setResult] = useState<{ name: string; rarity: string; emoji: string } | null>(null);
  const [error, setError] = useState("");

  const moleTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const gameTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const scoreRef = useRef(0);
  const phaseRef = useRef<"idle" | "playing" | "submitting" | "done">("idle");
  const audioCtx = useRef<AudioContext | null>(null);

  function getAudio() {
    if (!audioCtx.current) audioCtx.current = new AudioContext();
    return audioCtx.current;
  }

  function playHit() {
    try {
      const ctx = getAudio();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = "square";
      o.frequency.setValueAtTime(520, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(260, ctx.currentTime + 0.08);
      g.gain.setValueAtTime(0.18, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      o.start(); o.stop(ctx.currentTime + 0.12);
    } catch {}
  }

  function playBomb() {
    try {
      const ctx = getAudio();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = "sawtooth";
      o.frequency.setValueAtTime(180, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.2);
      g.gain.setValueAtTime(0.22, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      o.start(); o.stop(ctx.currentTime + 0.22);
    } catch {}
  }

  function playMiss() {
    try {
      const ctx = getAudio();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = "sine";
      o.frequency.setValueAtTime(200, ctx.currentTime);
      g.gain.setValueAtTime(0.07, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      o.start(); o.stop(ctx.currentTime + 0.08);
    } catch {}
  }

  useEffect(() => {
    void fetch("/api/minigame/spin")
      .then((r) => r.json())
      .then((d) => {
        setCanPlay(d.canSpin ?? false);
        setMsLeft(d.msLeft ?? 0);
        setLastPrize(d.lastPrize ?? "");
        setCheckLoading(false);
      });
  }, []);

  useEffect(() => {
    if (msLeft <= 0) return;
    const t = window.setInterval(() => {
      setMsLeft((p) => {
        const n = p - 1000;
        if (n <= 0) { setCanPlay(true); return 0; }
        return n;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [msLeft]);

  const clearCell = useCallback((idx: number) => {
    setCells((prev) => { const n = [...prev]; n[idx] = null; return n; });
    moleTimers.current.delete(idx);
  }, []);

  const spawnOne = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    // pick a free cell
    setCells((prev) => {
      const free = prev.map((v, i) => v === null ? i : -1).filter(i => i >= 0);
      if (free.length === 0) return prev;
      const idx = free[Math.floor(Math.random() * free.length)];
      const isBomb = scoreRef.current >= 3 && Math.random() < BOMB_CHANCE;
      const next = [...prev];
      next[idx] = isBomb ? "bomb" : "mole";
      const delay = Math.max(MIN_DELAY, BASE_DELAY - scoreRef.current * SPEED_STEP);
      // auto-despawn
      if (moleTimers.current.has(idx)) clearTimeout(moleTimers.current.get(idx)!);
      moleTimers.current.set(idx, setTimeout(() => {
        clearCell(idx);
        // spawn replacement
        if (phaseRef.current === "playing") spawnOne();
      }, delay));
      return next;
    });
  }, [clearCell]);

  const stopGame = useCallback(() => {
    moleTimers.current.forEach((t) => clearTimeout(t));
    moleTimers.current.clear();
    if (gameTimer.current) clearInterval(gameTimer.current);
    setCells(Array(GRID).fill(null));
  }, []);

  function startGame() {
    phaseRef.current = "playing";
    setPhase("playing");
    setScore(0);
    setMisses(0);
    setTimeLeft(GAME_DURATION);
    setResult(null);
    setError("");
    scoreRef.current = 0;
    setCells(Array(GRID).fill(null));

    // spawn initial mole + 2nd after brief delay for challenge
    spawnOne();
    setTimeout(() => { if (phaseRef.current === "playing") spawnOne(); }, 300);

    gameTimer.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          stopGame();
          setPhase("submitting");
          void submitScore();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  async function submitScore() {
    const res = await fetch("/api/minigame/spin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ score: scoreRef.current }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data?.error || "Could not submit score.");
      setCanPlay(false);
      setMsLeft(data?.msLeft ?? 0);
    } else {
      const prize = scoreToPrize(scoreRef.current);
      setResult(prize);
      setCanPlay(false);
      setMsLeft(7 * 24 * 60 * 60 * 1000);
    }
    setPhase("done");
  }

  function whack(idx: number) {
    if (phaseRef.current !== "playing") return;
    const cellType = cells[idx];

    if (cellType === "mole") {
      playHit();
      if (moleTimers.current.has(idx)) clearTimeout(moleTimers.current.get(idx)!);
      clearCell(idx);
      scoreRef.current += 1;
      setScore((s) => s + 1);
      setHitIdx(idx);
      setScoreFlash("+1");
      setTimeout(() => { setHitIdx(null); setScoreFlash(null); }, 300);
      const needed = MAX_ACTIVE(scoreRef.current);
      const active = cells.filter((c, ci) => c !== null && ci !== idx).length;
      for (let x = active; x < needed; x++) spawnOne();
      spawnOne();
    } else if (cellType === "bomb") {
      playBomb();
      if (moleTimers.current.has(idx)) clearTimeout(moleTimers.current.get(idx)!);
      clearCell(idx);
      scoreRef.current = Math.max(0, scoreRef.current - 2);
      setScore(Math.max(0, scoreRef.current));
      setPenaltyIdx(idx);
      setScoreFlash("-2 ☣️");
      setTimeout(() => { setPenaltyIdx(null); setScoreFlash(null); }, 400);
      spawnOne();
    } else {
      playMiss();
      scoreRef.current = Math.max(0, scoreRef.current - 1);
      setScore(Math.max(0, scoreRef.current));
      setMisses((m) => m + 1);
      setMissIdx(idx);
      setScoreFlash("-1 ❌");
      setTimeout(() => { setMissIdx(null); setScoreFlash(null); }, 300);
    }
  }

  const timerPct = (timeLeft / GAME_DURATION) * 100;

  return (
    <div className="relative mx-auto w-full max-w-4xl px-4 py-12 min-h-screen">
      {/* ── Once Human background atmosphere ── */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(34,197,94,0.07),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_80%,rgba(139,92,246,0.06),transparent_50%)]" />

      <div className="relative">
        {/* ── Header ── */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-400/80 border border-emerald-400/20 bg-emerald-400/5 rounded-full px-3 py-1">☣ Once Human</span>
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Weekly Challenge</span>
        </div>
        <h1 className="text-4xl font-black text-white leading-tight">
          Infected Mole <span className="bg-[linear-gradient(135deg,#4ade80,#22c55e)] bg-clip-text text-transparent">Hunt</span>
        </h1>
        <p className="mt-2 text-slate-400 text-sm max-w-lg">
          Survivors are emerging from contaminated ground. Whack the regular moles 🐹 for +1 pt. <span className="text-rose-400 font-semibold">Miss and lose −1 pt</span>. <span className="text-rose-400 font-semibold">Hit infected ☣️ and lose −2 pts</span>. Once per week.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]">
          {/* ── Game area ── */}
          <div className="flex flex-col items-center gap-4">

            {/* ── HUD ── */}
            {(phase === "playing" || phase === "submitting") && (
              <div className="w-full max-w-sm">
                {/* Score flash — fixed height so it never shifts the grid */}
                <div className="h-6 flex items-center justify-center mb-1">
                  {scoreFlash && (
                    <div className={`text-base font-black ${
                      scoreFlash.startsWith("+") ? "text-emerald-400" : "text-rose-400"
                    }`}>{scoreFlash}</div>
                  )}
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/60 backdrop-blur px-5 py-3 flex items-center gap-4">
                  <div className="text-center min-w-[44px]">
                    <div className="text-3xl font-black text-emerald-400 leading-none tabular-nums">{score}</div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">Score</div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-500">Survival Timer</span>
                      <span className={`font-black ${
                        timerPct < 25 ? "text-rose-400" : timerPct < 50 ? "text-amber-400" : "text-emerald-400"
                      }`}>{timeLeft}s</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-800/80 overflow-hidden border border-white/5">
                      <div className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${timerPct}%`,
                          background: timerPct > 50 ? "linear-gradient(90deg,#16a34a,#4ade80)" : timerPct > 25 ? "linear-gradient(90deg,#d97706,#fbbf24)" : "linear-gradient(90deg,#dc2626,#f97316)",
                          boxShadow: timerPct < 25 ? "0 0 12px rgba(239,68,68,0.7)" : timerPct < 50 ? "0 0 8px rgba(245,158,11,0.4)" : "none",
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-center min-w-[44px]">
                    <div className="text-3xl font-black text-rose-500 leading-none tabular-nums">{misses}</div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">Miss</div>
                  </div>
                </div>
                {/* Mole speed indicator */}
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="text-[10px] text-slate-600">Speed:</span>
                  {[1,2,3,4,5].map(n => (
                    <div key={n} className={`h-1.5 w-5 rounded-full ${
                      score >= (n-1)*8 ? "bg-emerald-400" : "bg-slate-700"
                    }`} />
                  ))}
                  <span className="text-[10px] text-slate-500">{score >= 32 ? "MAX" : score >= 24 ? "FAST" : score >= 16 ? "HIGH" : score >= 8 ? "MED" : "LOW"}</span>
                </div>
              </div>
            )}

            {/* ── Grid ── */}
            <div
              className={`grid gap-2.5 select-none p-4 rounded-[2rem] border ${
                phase === "playing"
                  ? "border-emerald-900/60 bg-[#060f09] shadow-[inset_0_0_60px_rgba(0,0,0,0.8),0_0_30px_rgba(34,197,94,0.08)] cursor-crosshair"
                  : "border-white/5 bg-[#060f09]/60 cursor-default"
              }`}
              style={{ gridTemplateColumns: "repeat(3, 1fr)", width: "min(380px, 100%)", position: "relative" }}
            >
              {/* biohazard corner decor */}
              <div className="absolute -top-3 -left-3 text-emerald-900/40 text-2xl pointer-events-none select-none">☣</div>
              <div className="absolute -bottom-3 -right-3 text-emerald-900/40 text-2xl pointer-events-none select-none">☣</div>

              {cells.map((cell, i) => {
                const isHit     = hitIdx === i;
                const isPenalty = penaltyIdx === i;
                const isMiss    = missIdx === i;
                const isMole    = cell === "mole";
                const isBomb    = cell === "bomb";

                return (
                  <button
                    key={i}
                    onClick={() => whack(i)}
                    disabled={phase !== "playing"}
                    style={{ aspectRatio: "1" }}
                    className={`relative rounded-[1.1rem] overflow-hidden focus:outline-none ${
                      phase === "playing" ? "cursor-crosshair" : "cursor-default"
                    }`}
                  >
                    {/* ── Cell background ── */}
                    <div className={`absolute inset-0 rounded-[1.1rem] transition-colors duration-75 ${
                      isHit     ? "bg-emerald-800/70" :
                      isPenalty ? "bg-rose-900/70"    :
                      isMiss    ? "bg-rose-900/30"    :
                      isBomb    ? "bg-[#1a0a0a]"      :
                      isMole    ? "bg-[#0f2010]"      :
                                  "bg-[#0c160e]"
                    }`}>
                      {/* Contamination cracks on bomb cells */}
                      {isBomb && !isPenalty && (
                        <div className="absolute inset-0 opacity-30" style={{
                          backgroundImage: "repeating-linear-gradient(45deg,rgba(239,68,68,0.15) 0,rgba(239,68,68,0.15) 1px,transparent 0,transparent 50%)",
                          backgroundSize: "8px 8px",
                        }} />
                      )}
                      {/* Dirt hole shadow */}
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[75%] h-[28%] rounded-full bg-black/70 blur-[3px]" />
                      {/* Border */}
                      <div className={`absolute inset-0 rounded-[1.1rem] border-2 transition-colors duration-75 ${
                        isHit     ? "border-emerald-400/70" :
                        isPenalty ? "border-rose-500/70"    :
                        isMiss    ? "border-rose-700/40"    :
                        isBomb    ? "border-rose-800/60 shadow-[0_0_14px_rgba(239,68,68,0.35)]" :
                        isMole    ? "border-emerald-700/50 shadow-[0_0_14px_rgba(34,197,94,0.2)]" :
                                    "border-emerald-950/50"
                      }`} />
                    </div>

                    {/* ── Survivor mole ── */}
                    <div className={`absolute inset-x-0 bottom-0 flex flex-col items-center justify-end transition-all duration-100 ${
                      isMole && !isHit ? "translate-y-0 opacity-100 pb-1" : "translate-y-full opacity-0 pb-0"
                    }`}>
                      {/* survivor helmet */}
                      <div className="text-[11px] text-slate-400 leading-none mb-[-2px]">🪖</div>
                      <div className="text-[2.2rem] leading-none drop-shadow-[0_0_6px_rgba(34,197,94,0.6)]">🐹</div>
                    </div>

                    {/* ── Infected bomb mole ── */}
                    <div className={`absolute inset-x-0 bottom-0 flex flex-col items-center justify-end transition-all duration-100 ${
                      isBomb && !isPenalty ? "translate-y-0 opacity-100 pb-1" : "translate-y-full opacity-0 pb-0"
                    }`}>
                      <div className="text-[9px] text-rose-500 font-black leading-none mb-[-1px] tracking-widest">INFECTED</div>
                      <div className="text-[2.2rem] leading-none drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] grayscale-[0.3] hue-rotate-[330deg]">🐹</div>
                      <div className="absolute top-1 right-1 text-[10px]">☣️</div>
                    </div>

                    {/* ── Hit flash ── */}
                    {isHit && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                        <div className="text-2xl">💥</div>
                        <div className="text-[0.55rem] font-black text-emerald-300 tracking-widest mt-0.5">WHACKED</div>
                      </div>
                    )}

                    {/* ── Penalty flash ── */}
                    {isPenalty && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                        <div className="text-2xl">☣️</div>
                        <div className="text-[0.55rem] font-black text-rose-400 tracking-widest mt-0.5">INFECTED!</div>
                      </div>
                    )}

                    {/* ── Miss flash ── */}
                    {isMiss && (
                      <div className="absolute inset-0 flex items-center justify-center z-10">
                        <div className="text-rose-500 text-sm font-black">✕</div>
                      </div>
                    )}

                    {/* Idle hole */}
                    {!cell && !isMiss && (
                      <div className="absolute inset-0 flex items-end justify-center pb-2">
                        <div className="w-[48%] h-[14%] rounded-full bg-black/50" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* ── Controls / status ── */}
            {phase === "idle" && (
              <div className="text-center space-y-3">
                {checkLoading ? (
                  <div className="text-sm text-slate-500 animate-pulse">Scanning for survivors...</div>
                ) : canPlay ? (
                  <>
                    <button
                      onClick={startGame}
                      className="h-14 w-60 rounded-2xl bg-[linear-gradient(135deg,#16a34a,#4ade80)] text-base font-black text-black hover:scale-[1.05] active:scale-95 transition shadow-[0_0_40px_rgba(74,222,128,0.35)] tracking-widest"
                    >
                      ☣ ENTER THE ZONE
                    </button>
                    <div className="text-[11px] text-slate-600">Infected moles appear after 3 hits — avoid them!</div>
                  </>
                ) : (
                  <div className="space-y-2 rounded-2xl border border-white/8 bg-black/40 px-6 py-4">
                    <div className="text-[11px] text-slate-500 uppercase tracking-widest">Zone locked — recharging</div>
                    <div className="text-3xl font-black text-emerald-400">{formatCountdown(msLeft)}</div>
                    {lastPrize && <div className="text-xs text-slate-400">Last haul: <span className="text-white">{lastPrize}</span></div>}
                  </div>
                )}
              </div>
            )}

            {phase === "submitting" && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <div className="h-4 w-4 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                Transmitting results...
              </div>
            )}

            {phase === "done" && result && (() => {
              const rs = RARITY_STYLE[result.rarity];
              return (
                <div className={`w-full max-w-sm text-center space-y-3 rounded-[2rem] border p-6 ${rs.border} ${rs.bg} ${rs.glow}`}>
                  <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">☣ Mission Complete</div>
                  <div className="text-2xl font-black text-white">Final Score: <span className="text-emerald-400">{score}</span></div>
                  <div className="text-5xl my-1 drop-shadow-[0_0_20px_rgba(255,255,255,0.25)]">{result.emoji}</div>
                  <div className="text-xl font-black text-white">{result.name}</div>
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border ${rs.border} ${rs.text}`}>
                    <span>⬡</span>{result.rarity === "none" ? "No reward" : result.rarity}
                  </div>
                  {result.rarity !== "none" ? (
                    <div className="text-xs text-slate-400">An admin will deliver your weapon in-game. Watch Discord! 📡</div>
                  ) : (
                    <div className="text-xs text-slate-500">Score 2+ to earn a weapon. Watch out for infected moles!</div>
                  )}
                  {error && <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>}
                  <div className="text-[10px] text-slate-600 pt-1">Zone re-opens in 7 days</div>
                </div>
              );
            })()}
          </div>

          {/* ── Side panel ── */}
          <div className="space-y-4">
            {/* Bomb warning */}
            <div className="rounded-2xl border border-rose-900/50 bg-rose-950/30 px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">☣️</span>
                <span className="text-xs font-black text-rose-400 uppercase tracking-widest">Infected Moles</span>
              </div>
              <p className="text-[11px] text-rose-300/70 leading-relaxed">Red-glowing moles are <span className="text-rose-400 font-bold">infected survivors</span>. Hitting them costs <span className="font-bold">−2 points</span>. Let them retreat into their hole.</p>
            </div>

            {/* Prize table */}
            <div className="rz-surface rz-panel-border rounded-[2rem] p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3">🔫 Weapon Rewards</div>
              <div className="space-y-1">
                {[
                  { score: "30+", prize: "Minigun",      rarity: "legendary", emoji: "⚙️" },
                  { score: "24+", prize: "Flamethrower", rarity: "legendary", emoji: "🔥" },
                  { score: "18+", prize: "Sniper (AWM)", rarity: "epic",      emoji: "🎯" },
                  { score: "14+", prize: "M4A1",         rarity: "rare",      emoji: "🔫" },
                  { score: "10+", prize: "AK-47",        rarity: "rare",      emoji: "🔫" },
                  { score: "7+",  prize: "SPAS-12",      rarity: "uncommon",  emoji: "💥" },
                  { score: "4+",  prize: "MP5",          rarity: "uncommon",  emoji: "🔫" },
                  { score: "1+",  prize: "Desert Eagle", rarity: "common",    emoji: "🔫" },
                  { score: "0",   prize: "No reward",    rarity: "none",      emoji: "☣️" },
                ].map((t) => {
                  const rs = RARITY_STYLE[t.rarity];
                  return (
                    <div key={t.score} className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 ${ rs.border} ${rs.bg}`}>
                      <span className="text-sm">{t.emoji}</span>
                      <span className={`text-[11px] font-semibold flex-1 ${rs.text}`}>{t.prize}</span>
                      <span className={`text-[10px] font-black tabular-nums ${rs.text}`}>{t.score}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rules */}
            <div className="rz-surface rz-panel-border rounded-[2rem] p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">Survival Rules</div>
              {[
                ["☣", "Infected moles = −2 pts if hit"],
                ["✕", "Empty cell click = −1 pt"],
                ["⚡", "Moles speed up as score rises"],
                ["👥", "Multiple moles above score 10"],
                ["📅", "One run per week"],
                ["📡", "Result sent to Discord"],
              ].map(([icon, rule]) => (
                <div key={rule} className="flex items-start gap-2 text-[11px] text-slate-400 mb-1">
                  <span className="text-emerald-500/70 shrink-0">{icon}</span>{rule}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

