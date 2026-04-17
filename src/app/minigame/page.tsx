"use client";

import { useEffect, useState, useRef, useCallback } from "react";

// ---------- whack-a-mole game ----------

const GRID = 9; // 3×3
const GAME_DURATION = 30; // seconds

const RARITY_COLORS: Record<string, string> = {
  legendary: "text-orange-400 border-orange-400/30 bg-orange-400/10",
  epic: "text-violet-400 border-violet-400/30 bg-violet-400/10",
  rare: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  uncommon: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  common: "text-slate-300 border-slate-400/30 bg-slate-400/10",
  none: "text-slate-500 border-slate-600/30 bg-slate-600/10",
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
    const res = await fetch("/api/minigame/spin", { method: "POST" });
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
          {/* Game area */}
          <div className="flex flex-col items-center gap-5">

            {/* HUD */}
            {phase === "playing" && (
              <div className="w-full max-w-xs flex items-center justify-between gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{score}</div>
                  <div className="text-xs text-slate-400">Hits</div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Time</span><span>{timeLeft}s</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${timerPct}%`,
                        background: timerPct > 50 ? "#22c55e" : timerPct > 25 ? "#f97316" : "#ef4444",
                      }}
                    />
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-rose-400">{misses}</div>
                  <div className="text-xs text-slate-400">Misses</div>
                </div>
              </div>
            )}

            {/* Grid */}
            <div
              className="grid gap-3 select-none"
              style={{ gridTemplateColumns: "repeat(3, 1fr)", width: "min(320px, 100%)" }}
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
                    className={`relative aspect-square rounded-[1.5rem] border-2 transition-all duration-100 overflow-hidden
                      ${isHit ? "border-emerald-400 bg-emerald-400/20 scale-95" : ""}
                      ${isMiss ? "border-rose-400 bg-rose-400/10" : ""}
                      ${isActive && !isHit ? "border-amber-400/60 bg-amber-400/10 scale-105 shadow-[0_0_20px_rgba(250,204,21,0.3)]" : ""}
                      ${!isActive && !isHit && !isMiss ? "border-white/8 bg-slate-900/60" : ""}
                      ${phase === "playing" ? "cursor-pointer hover:border-white/20" : "cursor-default"}
                    `}
                  >
                    <div className={`absolute inset-0 flex items-center justify-center transition-all duration-100 ${isActive ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
                      <span className="text-4xl">🐹</span>
                    </div>
                    {isHit && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl animate-bounce">💥</span>
                      </div>
                    )}
                    {!isActive && !isHit && phase === "playing" && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-20">
                        <span className="text-2xl">�️</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Controls */}
            {phase === "idle" && (
              <div className="text-center mt-2">
                {checkLoading ? (
                  <div className="text-sm text-slate-400">Checking eligibility...</div>
                ) : canPlay ? (
                  <button
                    onClick={startGame}
                    className="h-14 w-52 rounded-2xl bg-[linear-gradient(135deg,#f97316,#ef4444)] text-base font-bold text-white hover:scale-[1.04] transition shadow-[0_0_30px_rgba(239,68,68,0.3)]"
                  >
                    🐹 Start Game!
                  </button>
                ) : (
                  <div className="text-center space-y-1">
                    <div className="text-xs text-slate-500">Next game available in</div>
                    <div className="text-2xl font-bold text-amber-400">{formatCountdown(msLeft)}</div>
                    {lastPrize && <div className="text-xs text-slate-400">Last prize: {lastPrize}</div>}
                  </div>
                )}
              </div>
            )}

            {phase === "submitting" && (
              <div className="text-sm text-slate-400 animate-pulse">Submitting your score...</div>
            )}

            {phase === "done" && (
              <div className="w-full max-w-xs text-center space-y-3 mt-2">
                <div className="text-lg font-bold text-white">Game Over! Score: <span className="text-amber-400">{score}</span></div>
                {result ? (
                  <div className={`rounded-[1.5rem] border px-5 py-4 ${RARITY_COLORS[result.rarity]}`}>
                    <div className="text-3xl mb-1">{result.emoji}</div>
                    <div className="text-lg font-bold text-white">{result.name}</div>
                    <div className={`text-xs font-semibold uppercase tracking-widest mt-1 ${RARITY_COLORS[result.rarity].split(" ")[0]}`}>
                      {result.rarity === "none" ? "No prize — try again next week!" : `${result.rarity} weapon`}
                    </div>
                    {result.rarity !== "none" && (
                      <div className="mt-2 text-xs text-slate-400">Admin will deliver this in-game. Check Discord!</div>
                    )}
                  </div>
                ) : null}
                {error && <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>}
                <div className="text-xs text-slate-500">Come back next week to play again!</div>
              </div>
            )}
          </div>

          {/* Side panel */}
          <div className="rz-surface rz-panel-border rounded-[2rem] p-5">
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Prize Tiers</div>
            <div className="space-y-2">
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
              ].map((t) => (
                <div key={t.score} className={`flex items-center gap-2 rounded-2xl border px-3 py-1.5 ${RARITY_COLORS[t.rarity]}`}>
                  <span>{t.emoji}</span>
                  <span className="text-xs text-slate-200 flex-1">{t.prize}</span>
                  <span className={`text-xs font-bold ${RARITY_COLORS[t.rarity].split(" ")[0]}`}>{t.score} hits</span>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-4 border-t border-white/8 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">Rules</div>
              {["One game per week", "30 seconds to whack moles", "Higher score = better gun", "Prize delivered in-game by admins"].map((r) => (
                <div key={r} className="flex items-start gap-2 text-xs text-slate-400">
                  <span className="text-amber-400 shrink-0">›</span>{r}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

