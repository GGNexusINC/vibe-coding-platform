"use client";

import { useState, useEffect, useCallback } from "react";
import { REWARDS } from "@/lib/rewards";

/* ─── Types ──────────────────────────────────────────────────────────────── */

type User = {
  discord_id: string;
  username?: string;
  global_name?: string;
  avatar_url?: string | null;
};

type PointsHistoryEntry = {
  id: string;
  amount: number;
  reason: string;
  created_at: string;
};

type Reward = (typeof REWARDS)[number];

/* ─── Tier Config ────────────────────────────────────────────────────────── */

const TIERS = [
  {
    label: "Starter Rewards",
    range: "100 – 300 pts",
    borderColor: "border-emerald-500/30",
    glowColor: "rgba(16,185,129,0.25)",
    accentText: "text-emerald-400",
    bgTint: "from-emerald-500/5",
    min: 0,
    max: 400,
  },
  {
    label: "Combat Rewards",
    range: "500 – 1000 pts",
    borderColor: "border-cyan-500/30",
    glowColor: "rgba(6,182,212,0.25)",
    accentText: "text-cyan-400",
    bgTint: "from-cyan-500/5",
    min: 400,
    max: 1200,
  },
  {
    label: "Elite Rewards",
    range: "1500 – 2500 pts",
    borderColor: "border-violet-500/30",
    glowColor: "rgba(139,92,246,0.25)",
    accentText: "text-violet-400",
    bgTint: "from-violet-500/5",
    min: 1200,
    max: 4000,
  },
  {
    label: "Legendary Rewards",
    range: "5000+ pts",
    borderColor: "border-amber-500/30",
    glowColor: "rgba(245,158,11,0.25)",
    accentText: "text-amber-400",
    bgTint: "from-amber-500/5",
    min: 4000,
    max: Infinity,
  },
] as const;

function getTierForReward(cost: number) {
  return TIERS.find((t) => cost >= t.min && cost < t.max) ?? TIERS[0];
}

/* ─── Confirmation Modal ─────────────────────────────────────────────────── */

function ConfirmModal({
  reward,
  onConfirm,
  onCancel,
  loading,
}: {
  reward: Reward;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* card */}
      <div className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 fade-in duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-rose-500/5 pointer-events-none" />
        <div className="relative space-y-6 text-center">
          <div className="text-6xl">{reward.emoji}</div>
          <h3 className="text-2xl font-black uppercase tracking-tight text-white">
            Confirm Redemption
          </h3>
          <p className="text-sm text-slate-400 font-medium leading-relaxed">
            You are about to redeem{" "}
            <span className="text-white font-black">{reward.name}</span> for{" "}
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent font-black">
              ✨ {reward.cost.toLocaleString()} pts
            </span>
          </p>
          <p className="text-xs text-slate-500">
            This action cannot be undone. Points will be deducted immediately.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-black uppercase tracking-wider text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-6 py-3 text-sm font-black uppercase tracking-wider text-white shadow-[0_0_30px_-5px_rgba(251,146,60,0.5)] transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Redeeming…
                </span>
              ) : (
                "Redeem Now"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Success Toast ──────────────────────────────────────────────────────── */

function SuccessToast({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="fixed top-6 left-1/2 z-50 -translate-x-1/2 animate-in slide-in-from-top fade-in duration-500">
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-4 shadow-[0_0_40px_-10px_rgba(16,185,129,0.4)] backdrop-blur-xl">
        <span className="text-2xl">🎉</span>
        <span className="text-sm font-black uppercase tracking-tight text-emerald-200">
          {message}
        </span>
      </div>
    </div>
  );
}

/* ─── Error Toast ────────────────────────────────────────────────────────── */

function ErrorToast({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="fixed top-6 left-1/2 z-50 -translate-x-1/2 animate-in slide-in-from-top fade-in duration-500">
      <div className="flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-6 py-4 shadow-[0_0_40px_-10px_rgba(244,63,94,0.4)] backdrop-blur-xl">
        <span className="text-2xl">⚠️</span>
        <span className="text-sm font-black uppercase tracking-tight text-rose-200">
          {message}
        </span>
      </div>
    </div>
  );
}

/* ─── Reward Card ────────────────────────────────────────────────────────── */

function RewardCard({
  reward,
  canAfford,
  loggedIn,
  onRedeem,
  tier,
}: {
  reward: Reward;
  canAfford: boolean;
  loggedIn: boolean;
  onRedeem: (r: Reward) => void;
  tier: (typeof TIERS)[number];
}) {
  const affordable = loggedIn && canAfford;

  return (
    <article
      className={`group relative overflow-hidden rounded-[2.5rem] border bg-slate-900/40 p-8 shadow-2xl backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl ${
        tier.borderColor
      } ${!affordable ? "opacity-60" : ""}`}
      style={{
        boxShadow: affordable
          ? `0 0 60px -15px ${tier.glowColor}`
          : undefined,
      }}
    >
      {/* Background tint */}
      <div
        className={`absolute inset-0 -z-10 bg-gradient-to-br ${tier.bgTint} to-transparent`}
      />

      {/* Hover glow orb */}
      <div
        className="absolute -top-20 -right-20 h-64 w-64 rounded-full opacity-0 blur-[100px] transition-opacity duration-700 group-hover:opacity-30 pointer-events-none"
        style={{ backgroundColor: tier.glowColor }}
      />

      <div className="relative flex flex-col h-full">
        {/* Emoji */}
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/5 bg-black/40 text-5xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
          {reward.emoji}
        </div>

        {/* Name */}
        <h3 className="mt-6 text-xl font-black uppercase tracking-tight text-white leading-tight">
          {reward.name}
        </h3>

        {/* Description */}
        <p className="mt-3 flex-1 text-sm font-medium leading-relaxed text-slate-400">
          {reward.description}
        </p>

        {/* Cost */}
        <div className="mt-6 flex items-center gap-2">
          <span className="text-lg">✨</span>
          <span
            className={`text-2xl font-black tabular-nums tracking-tight ${tier.accentText}`}
          >
            {reward.cost.toLocaleString()}
          </span>
          <span className="text-xs font-black uppercase tracking-widest text-slate-500">
            pts
          </span>
        </div>

        {/* Action */}
        <div className="mt-6 pt-6 border-t border-white/10">
          {!loggedIn ? (
            <a
              href="/auth/discord/start?next=/rewards"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#67e8f9,#facc15)] px-6 text-sm font-black uppercase tracking-wider text-slate-950 transition hover:scale-[1.02] active:scale-[0.98]"
            >
              Sign in with Discord
            </a>
          ) : (
            <button
              onClick={() => onRedeem(reward)}
              disabled={!canAfford}
              className={`flex h-12 w-full items-center justify-center rounded-2xl px-6 text-sm font-black uppercase tracking-wider transition ${
                canAfford
                  ? "bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white shadow-[0_0_30px_-5px_rgba(251,146,60,0.4)] hover:scale-[1.02] active:scale-[0.98]"
                  : "bg-white/5 text-slate-500 cursor-not-allowed border border-white/5"
              }`}
            >
              {canAfford ? "Redeem" : "Not Enough Points"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */

export function RewardsClient({ user }: { user: User | null }) {
  const [points, setPoints] = useState(0);
  const [history, setHistory] = useState<PointsHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmReward, setConfirmReward] = useState<Reward | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchPoints = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/user/points");
      const data = await res.json();
      if (data.ok) {
        setPoints(data.points ?? 0);
        setHistory(data.history ?? []);
      }
    } catch (e) {
      console.error("Failed to fetch points:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPoints();
  }, [fetchPoints]);

  async function handleRedeem(reward: Reward) {
    setConfirmReward(reward);
  }

  async function confirmRedeem() {
    if (!confirmReward) return;
    setRedeeming(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/store/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewardSlug: confirmReward.slug }),
      });
      const data = await res.json();

      if (data.ok) {
        setPoints((prev) => prev - confirmReward.cost);
        setSuccessMsg(
          `${confirmReward.emoji} ${confirmReward.name} redeemed successfully!`
        );
        setConfirmReward(null);
        // Refresh points and history
        fetchPoints();
      } else {
        setErrorMsg(data.error || "Redemption failed. Please try again.");
        setConfirmReward(null);
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setConfirmReward(null);
    } finally {
      setRedeeming(false);
    }
  }

  /* ── Group rewards by tier ────────────────────────────────────────────── */

  const rewardsByTier = TIERS.map((tier) => ({
    tier,
    rewards: REWARDS.filter(
      (r) => r.cost >= tier.min && r.cost < tier.max
    ),
  })).filter((group) => group.rewards.length > 0);

  /* ── Render ───────────────────────────────────────────────────────────── */

  return (
    <div className="relative min-h-screen w-full overflow-hidden text-slate-200">
      {/* Toasts */}
      {successMsg && (
        <SuccessToast
          message={successMsg}
          onDismiss={() => setSuccessMsg(null)}
        />
      )}
      {errorMsg && (
        <ErrorToast message={errorMsg} onDismiss={() => setErrorMsg(null)} />
      )}

      {/* Confirm modal */}
      {confirmReward && (
        <ConfirmModal
          reward={confirmReward}
          onConfirm={confirmRedeem}
          onCancel={() => setConfirmReward(null)}
          loading={redeeming}
        />
      )}

      <div className="relative mx-auto w-full max-w-7xl px-4 py-10 sm:py-14">
        {/* ─── Hero Section ───────────────────────────────────────────────── */}
        <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Left hero */}
          <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-xl group">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-rose-500/5" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                Loyalty Program
              </div>
              <h1 className="mt-6 text-5xl font-black leading-none tracking-tight text-white sm:text-6xl">
                Rewards{" "}
                <br />
                <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 bg-clip-text text-transparent">
                  Arsenal
                </span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg font-medium leading-relaxed text-slate-400">
                Earn points with every store purchase and redeem them for
                exclusive in-game rewards, VIP status, custom packs, rare
                weapons, and legendary gear. Your loyalty is your currency.
              </p>

              {/* Stats row */}
              <div className="mt-10 grid gap-6 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/5 bg-black/40 p-5 transition-colors hover:border-white/10">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    Earn Rate
                  </div>
                  <div className="mt-2 text-3xl font-black text-white">
                    100
                    <span className="text-sm font-medium text-slate-500 ml-1">
                      pts/$5
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-slate-500 font-medium">
                    Points per pack purchase.
                  </div>
                </div>
                <div className="rounded-2xl border border-white/5 bg-black/40 p-5 transition-colors hover:border-white/10">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    Tiers
                  </div>
                  <div className="mt-2 text-3xl font-black text-white">4</div>
                  <div className="mt-2 text-xs text-slate-500 font-medium">
                    Unlock higher tiers.
                  </div>
                </div>
                <div className="rounded-2xl border border-white/5 bg-black/40 p-5 transition-colors hover:border-white/10">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    Rewards
                  </div>
                  <div className="mt-2 text-3xl font-black text-white">
                    {REWARDS.length}
                  </div>
                  <div className="mt-2 text-xs text-slate-500 font-medium">
                    Exclusive items available.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Points balance + CTA */}
          <div className="rounded-[2.5rem] border border-white/10 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-xl flex flex-col">
            {/* Points balance card */}
            <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-rose-500/10 p-8 flex-1">
              <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-amber-500/10 blur-[80px] pointer-events-none" />
              <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-rose-500/10 blur-[60px] pointer-events-none" />

              <div className="relative">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400/60">
                  Your Points Balance
                </div>

                {!user ? (
                  <div className="mt-4">
                    <div className="text-4xl font-black text-white/20">
                      — — —
                    </div>
                    <p className="mt-4 text-sm text-slate-400 font-medium">
                      Sign in to view your balance and start redeeming rewards.
                    </p>
                    <a
                      href="/auth/discord/start?next=/rewards"
                      className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#67e8f9,#facc15)] px-5 text-sm font-semibold text-slate-950 transition hover:scale-[1.01]"
                    >
                      Sign in with Discord
                    </a>
                  </div>
                ) : loading ? (
                  <div className="mt-4 flex items-center gap-3">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500/20 border-t-amber-400" />
                    <span className="text-sm text-slate-400 font-medium">
                      Loading balance…
                    </span>
                  </div>
                ) : (
                  <div className="mt-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-6xl font-black tabular-nums bg-gradient-to-r from-amber-300 via-orange-300 to-rose-300 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(251,146,60,0.4)]">
                        {points.toLocaleString()}
                      </span>
                      <span className="text-lg font-black uppercase tracking-widest text-amber-500/40">
                        pts
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-400 font-medium">
                      Signed in as{" "}
                      <span className="text-white">
                        {user.global_name || user.username}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Earn CTA */}
            <a
              href="/store"
              className="mt-6 flex items-center gap-4 rounded-[1.5rem] border border-white/5 bg-black/40 p-5 transition-all hover:border-white/10 hover:bg-black/60 group/cta"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-2xl transition-transform group-hover/cta:scale-110">
                🛒
              </div>
              <div className="flex-1">
                <div className="text-sm font-black uppercase tracking-tight text-white">
                  Earn points by purchasing packs
                </div>
                <div className="mt-1 text-xs text-slate-500 font-medium">
                  Every store purchase earns loyalty points automatically.
                </div>
              </div>
              <span className="text-lg text-slate-500 transition-transform group-hover/cta:translate-x-1">
                →
              </span>
            </a>
          </div>
        </section>

        {/* ─── Tier Sections ──────────────────────────────────────────────── */}
        {rewardsByTier.map(({ tier, rewards }) => (
          <section key={tier.label} className="mt-16">
            {/* Tier header */}
            <div className="flex items-center gap-4 mb-8">
              <div
                className={`h-px flex-1 ${tier.borderColor.replace(
                  "border",
                  "bg"
                )}`}
              />
              <div
                className={`inline-flex items-center gap-3 rounded-full border ${tier.borderColor} bg-black/40 px-5 py-2 backdrop-blur-sm`}
              >
                <span
                  className={`text-sm font-black uppercase tracking-tight ${tier.accentText}`}
                >
                  {tier.label}
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  {tier.range}
                </span>
              </div>
              <div
                className={`h-px flex-1 ${tier.borderColor.replace(
                  "border",
                  "bg"
                )}`}
              />
            </div>

            {/* Rewards grid */}
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {rewards.map((reward) => (
                <RewardCard
                  key={reward.slug}
                  reward={reward}
                  canAfford={points >= reward.cost}
                  loggedIn={!!user}
                  onRedeem={handleRedeem}
                  tier={tier}
                />
              ))}
            </div>
          </section>
        ))}

        {/* ─── Points History ─────────────────────────────────────────────── */}
        {user && (
          <section className="mt-20">
            <div className="flex items-center gap-4 mb-8">
              <div className="h-px flex-1 bg-white/5" />
              <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-black/40 px-5 py-2 backdrop-blur-sm">
                <span className="text-sm font-black uppercase tracking-tight text-slate-300">
                  Points History
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Recent Activity
                </span>
              </div>
              <div className="h-px flex-1 bg-white/5" />
            </div>

            <div className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-900/40 shadow-2xl backdrop-blur-xl">
              {loading ? (
                <div className="flex items-center justify-center p-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/10 border-t-amber-400" />
                </div>
              ) : history.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-4xl mb-4">📭</div>
                  <div className="text-sm font-black uppercase tracking-tight text-slate-500">
                    No activity yet
                  </div>
                  <p className="mt-2 text-xs text-slate-600 font-medium">
                    Your points transactions will appear here after your first
                    purchase or redemption.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {/* Header */}
                  <div className="grid grid-cols-[1fr_auto_1.5fr] gap-4 px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    <span>Date</span>
                    <span className="text-right">Amount</span>
                    <span>Reason</span>
                  </div>

                  {/* Rows */}
                  {history.slice(0, 10).map((entry) => (
                    <div
                      key={entry.id}
                      className="grid grid-cols-[1fr_auto_1.5fr] gap-4 px-8 py-4 transition-colors hover:bg-white/[0.02] group"
                    >
                      <span className="text-xs font-medium text-slate-500 tabular-nums">
                        {new Date(entry.created_at).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
                      </span>
                      <span
                        className={`text-right text-sm font-black tabular-nums ${
                          entry.amount >= 0
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }`}
                      >
                        {entry.amount >= 0 ? "+" : ""}
                        {entry.amount.toLocaleString()}
                      </span>
                      <span className="text-xs font-medium text-slate-400 truncate">
                        {entry.reason}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Bottom spacer */}
        <div className="h-20" />
      </div>
    </div>
  );
}
