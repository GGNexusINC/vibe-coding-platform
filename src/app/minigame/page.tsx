"use client";

import { useEffect, useState, useRef, useCallback } from "react";

const GRID = 9;
const GAME_DURATION = 30;

const RARITY_STYLE: Record<string, { text: string; border: string; bg: string; glow: string }> = {
  legendary: { text: "text-orange-400", border: "border-orange-400/50", bg: "bg-orange-400/10", glow: "shadow-[0_0_30px_rgba(251,146,60,0.5)]" },
  epic:      { text: "text-violet-400", border: "border-violet-400/50", bg: "bg-violet-400/10", glow: "shadow-[0_0_30px_rgba(167,139,250,0.5)]" },
  rare:      { text: "text-blue-400",   border: "border-blue-400/50",   bg: "bg-blue-400/10",   glow: "shadow-[0_0_25px_rgba(96,165,250,0.4)]" },
  uncommon:  { text: "text-emerald-400",border: "border-emerald-400/40",bg: "bg-emerald-400/10",glow: "shadow-[0_0_20px_rgba(52,211,153,0.3)]" },
  common:    { text: "text-slate-300",  border: "border-slate-400/30",  bg: "bg-slate-400/10",  glow: "" },
  none:      { text: "text-slate-500",  border: "border-slate-600/30",  bg: "bg-slate-600/10",  glow: "" },
};

function scoreToPrize(score: number) {
  if (score >= 30) return { name: "Minigun", rarity: "legendary", emoji: "⚙️" };
  if (score >= 25) return { name: "Flamethrower", rarity: "legendary", emoji: "🔥" };
  if (score >= 20) return { name: "Sniper Rifle (AWM)", rarity: "epic", emoji: "🎯" };
  if (score >= 15) return { name: "M4A1 Assault Rifle", rarity: "rare", emoji: "🔫" };
  if (score >= 10) return { name: "AK-47 Assault Rifle", rarity: "rare", emoji: "🔫" };
  if (score >= 7)  return { name: "SPAS-12 Shotgun", rarity: "uncommon", emoji: "💥" };
  if (score >= 4)  return { name: "MP5 SMG", rarity: "uncommon", emoji: "🔫" };
  if (score >= 1)  return { name: "Desert Eagle", rarity: "common", emoji: "🔫" };
  return { name: "Better Luck Next Time", rarity: "none", emoji: "😔" };
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

export default function MinigamePage() {
  const [phase, setPhase] = useState<"idle" | "playing" | "submitting" | "done">("idle");
  const [canPlay, setCanPlay] = useState(false);
  const [msLeft, setMsLeft] = useState(0);
  const [lastPrize, setLastPrize] = useState("");
  const [checkLoading, setCheckLoading] = useState(true);

  // game state
  const [activeMole, setActiveMole] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [hitIdx, setHitIdx] = useState<number | null>(null);
  const [missIdx, setMissIdx] = useState<number | null>(null);

  // result
  const [result, setResult] = useState<{ name: string; rarity: string; emoji: string } | null>(null);
  const [error, setError] = useState("");

  const moleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const scoreRef = useRef(0);

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

  // Cooldown countdown
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

  const stopGame = useCallback(() => {
    if (moleTimer.current) clearTimeout(moleTimer.current);
    if (gameTimer.current) clearInterval(gameTimer.current);
    setActiveMole(null);
  }, []);

  const spawnMole = useCallback(() => {
    if (moleTimer.current) clearTimeout(moleTimer.current);
    const idx = Math.floor(Math.random() * GRID);
    setActiveMole(idx);
    const delay = Math.max(400, 900 - scoreRef.current * 20);
    moleTimer.current = setTimeout(() => {
      setActiveMole(null);
      spawnMole();
    }, delay);
  }, []);

  function startGame() {
    setPhase("playing");
    setScore(0);
    setMisses(0);
    setTimeLeft(GAME_DURATION);
    setResult(null);
    setError("");
    scoreRef.current = 0;

    spawnMole();

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
    if (phase !== "playing") return;
    if (idx === activeMole) {
      scoreRef.current += 1;
      setScore((s) => s + 1);
      setHitIdx(idx);
      setTimeout(() => setHitIdx(null), 200);
      setActiveMole(null);
      if (moleTimer.current) clearTimeout(moleTimer.current);
      spawnMole();
    } else {
      setMisses((m) => m + 1);
      setMissIdx(idx);
      setTimeout(() => setMissIdx(null), 250);
    }
  }

  const timerPct = (timeLeft / GAME_DURATION) * 100;

  return (
    <div className="relative mx-auto w-full max-w-4xl px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(239,68,68,0.1),transparent_60%)]" />
      <div className="relative">
        <div className="rz-chip mb-4">🎮 Mini-Game</div>
        <h1 className="text-4xl font-bold text-white">
          Whack-a-Mole <span className="bg-[linear-gradient(135deg,#f97316,#ef4444)] bg-clip-text text-transparent">Gun Game</span>
        </h1>
        <p className="mt-2 text-slate-400">Whack as many moles as you can in 30 seconds. Your score determines the prize you win — once per week!</p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_300px]">
          {/* ── Game area ── */}
          <div className="flex flex-col items-center gap-5">

            {/* HUD bar */}
            {(phase === "playing" || phase === "submitting") && (
              <div className="w-full max-w-sm rounded-[1.5rem] border border-white/8 bg-slate-900/80 px-5 py-3 flex items-center gap-4">
                {/* Hits */}
                <div className="text-center min-w-[40px]">
                  <div className="text-3xl font-black text-white leading-none">{score}</div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">Hits</div>
                </div>
                {/* Timer bar */}
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                    <span className="font-semibold">Time</span>
                    <span className={`font-bold ${timerPct < 25 ? "text-rose-400" : timerPct < 50 ? "text-amber-400" : "text-emerald-400"}`}>{timeLeft}s</span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-800 overflow-hidden border border-white/5">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${timerPct}%`,
                        background: timerPct > 50
                          ? "linear-gradient(90deg,#22c55e,#4ade80)"
                          : timerPct > 25
                          ? "linear-gradient(90deg,#f97316,#fbbf24)"
                          : "linear-gradient(90deg,#ef4444,#f97316)",
                        boxShadow: timerPct < 25 ? "0 0 10px rgba(239,68,68,0.6)" : "none",
                      }}
                    />
                  </div>
                </div>
                {/* Misses */}
                <div className="text-center min-w-[40px]">
                  <div className="text-3xl font-black text-rose-400 leading-none">{misses}</div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">Miss</div>
                </div>
              </div>
            )}

            {/* ── Mole Grid ── */}
            <div
              className={`grid gap-3 select-none p-4 rounded-[2rem] border border-white/8 bg-[#0a1a12]/80 ${phase === "playing" ? "cursor-crosshair" : ""}`}
              style={{ gridTemplateColumns: "repeat(3, 1fr)", width: "min(360px, 100%)" }}
            >
              {Array.from({ length: GRID }).map((_, i) => {
                const isActive = activeMole === i;
                const isHit = hitIdx === i;
                const isMiss = missIdx === i;
                return (
                  <button
                    key={i}
                    onClick={() => whack(i)}
                    disabled={phase !== "playing"}
                    style={{ aspectRatio: "1" }}
                    className={`relative rounded-[1.2rem] overflow-hidden transition-all duration-75 focus:outline-none
                      ${phase === "playing" ? "cursor-crosshair" : "cursor-default"}
                      ${isHit ? "scale-90" : isActive ? "scale-105" : "scale-100"}
                    `}
                  >
                    {/* Dirt hole base */}
                    <div className={`absolute inset-0 rounded-[1.2rem] transition-all duration-75 ${
                      isHit ? "bg-emerald-900/60 shadow-[inset_0_4px_12px_rgba(0,0,0,0.8)]" :
                      isMiss ? "bg-rose-900/30" :
                      isActive ? "bg-amber-900/40 shadow-[0_0_20px_rgba(251,191,36,0.4)]" :
                      "bg-[#1a2e1a] shadow-[inset_0_4px_12px_rgba(0,0,0,0.6)]"
                    }`}>
                      {/* Hole ellipse */}
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-[30%] rounded-full bg-black/60 blur-[2px]" />
                      {/* Grass ring */}
                      <div className={`absolute inset-0 rounded-[1.2rem] border-2 transition-all duration-75 ${
                        isHit ? "border-emerald-400/60" :
                        isMiss ? "border-rose-500/40" :
                        isActive ? "border-amber-400/70" :
                        "border-green-900/60"
                      }`} />
                    </div>

                    {/* Mole pop-up */}
                    <div className={`absolute inset-x-0 bottom-0 flex flex-col items-center justify-end pb-1 transition-all duration-100 ${
                      isActive && !isHit ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
                    }`}>
                      <div className="text-[2.4rem] drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] leading-none">
                        🐹
                      </div>
                    </div>

                    {/* Hit flash */}
                    {isHit && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                        <div className="text-[1.8rem] leading-none drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">💥</div>
                        <div className="text-[0.6rem] font-black text-emerald-300 mt-0.5 tracking-widest">+1</div>
                      </div>
                    )}

                    {/* Miss flash */}
                    {isMiss && (
                      <div className="absolute inset-0 flex items-center justify-center z-10">
                        <div className="text-rose-400 text-xs font-black">✗</div>
                      </div>
                    )}

                    {/* Idle hole indicator */}
                    {!isActive && !isHit && !isMiss && (
                      <div className="absolute inset-0 flex items-end justify-center pb-2">
                        <div className="w-[50%] h-[15%] rounded-full bg-black/40" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Controls */}
            {phase === "idle" && (
              <div className="text-center mt-2 space-y-3">
                {checkLoading ? (
                  <div className="text-sm text-slate-400 animate-pulse">Checking eligibility...</div>
                ) : canPlay ? (
                  <button
                    onClick={startGame}
                    className="h-14 w-56 rounded-2xl bg-[linear-gradient(135deg,#f97316,#ef4444)] text-base font-black text-white hover:scale-[1.04] active:scale-95 transition shadow-[0_0_40px_rgba(239,68,68,0.4)] tracking-wide"
                  >
                    🐹 WHACK! START!
                  </button>
                ) : (
                  <div className="space-y-1">
                    <div className="text-xs text-slate-500">Next game available in</div>
                    <div className="text-3xl font-black text-amber-400">{formatCountdown(msLeft)}</div>
                    {lastPrize && <div className="text-xs text-slate-400">Last prize: {lastPrize}</div>}
                  </div>
                )}
              </div>
            )}

            {phase === "submitting" && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <div className="h-4 w-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                Submitting your score...
              </div>
            )}

            {phase === "done" && result && (() => {
              const rs = RARITY_STYLE[result.rarity];
              return (
                <div className={`w-full max-w-sm text-center space-y-3 mt-2 rounded-[2rem] border p-6 ${rs.border} ${rs.bg} ${rs.glow}`}>
                  <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Game Over</div>
                  <div className="text-2xl font-black text-white">Score: <span className="text-amber-400">{score} hits</span></div>
                  <div className="text-5xl my-2 drop-shadow-[0_0_16px_rgba(255,255,255,0.3)]">{result.emoji}</div>
                  <div className="text-xl font-black text-white">{result.name}</div>
                  <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border ${rs.border} ${rs.text}`}>
                    {result.rarity === "none" ? "No prize" : result.rarity}
                  </div>
                  {result.rarity !== "none" ? (
                    <div className="mt-1 text-xs text-slate-400">🎮 An admin will deliver this in-game. Check Discord!</div>
                  ) : (
                    <div className="mt-1 text-xs text-slate-400">Score 1+ hits next week to win a weapon!</div>
                  )}
                  {error && <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>}
                  <div className="text-xs text-slate-600">Come back next week to play again!</div>
                </div>
              );
            })()}
          </div>

          {/* ── Side panel ── */}
          <div className="rz-surface rz-panel-border rounded-[2rem] p-5">
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">🏆 Prize Tiers</div>
            <div className="space-y-1.5">
              {[
                { score: "30+", prize: "Minigun", rarity: "legendary", emoji: "⚙️" },
                { score: "25+", prize: "Flamethrower", rarity: "legendary", emoji: "🔥" },
                { score: "20+", prize: "Sniper (AWM)", rarity: "epic", emoji: "🎯" },
                { score: "15+", prize: "M4A1", rarity: "rare", emoji: "🔫" },
                { score: "10+", prize: "AK-47", rarity: "rare", emoji: "🔫" },
                { score: "7+",  prize: "SPAS-12", rarity: "uncommon", emoji: "💥" },
                { score: "4+",  prize: "MP5", rarity: "uncommon", emoji: "🔫" },
                { score: "1+",  prize: "Desert Eagle", rarity: "common", emoji: "🔫" },
                { score: "0",   prize: "No prize", rarity: "none", emoji: "😔" },
              ].map((t) => {
                const rs = RARITY_STYLE[t.rarity];
                return (
                  <div key={t.score} className={`flex items-center gap-2 rounded-2xl border px-3 py-2 ${rs.border} ${rs.bg}`}>
                    <span className="text-base">{t.emoji}</span>
                    <span className={`text-xs font-semibold flex-1 ${rs.text}`}>{t.prize}</span>
                    <span className={`text-[11px] font-black tabular-nums ${rs.text}`}>{t.score}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 pt-4 border-t border-white/8 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">Rules</div>
              {["One game per week", "30 seconds to whack moles", "Moles speed up as you score", "Higher score = rarer weapon", "Prize delivered in-game by admins", "Results posted to Discord automatically"].map((r) => (
                <div key={r} className="flex items-start gap-2 text-xs text-slate-400">
                  <span className="text-amber-400 shrink-0 mt-0.5">›</span>{r}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

