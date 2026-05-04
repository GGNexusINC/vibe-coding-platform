"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const RaidDashboard = dynamic(
  () => import("./raid-dashboard").then((m) => ({ default: m.RaidDashboard })),
  { ssr: false, loading: () => <DashboardSkeleton /> }
);

interface BetaStatus {
  ok: boolean;
  isBetaTester: boolean;
  permissions?: string[];
  notes?: string;
  joinedAt?: string;
}

interface BetaRequest {
  id: string;
  status: string;
  requested_at: string;
  reason?: string;
}

function Scanlines() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Deep space background */}
      <div className="absolute inset-0 bg-[#020617]" />
      {/* Glow orbs */}
      <div className="absolute -left-[20%] top-[-15%] h-[70%] w-[70%] rounded-full bg-cyan-500/[0.04] blur-[130px]" />
      <div className="absolute -right-[20%] bottom-[-15%] h-[70%] w-[70%] rounded-full bg-orange-500/[0.04] blur-[130px]" />
      <div className="absolute left-[40%] top-[30%] h-[40%] w-[40%] rounded-full bg-indigo-500/[0.03] blur-[100px]" />
      {/* Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:48px_48px]" />
      {/* Scan line */}
      <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent" style={{ top: "30%" }} />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-64 rounded-[2.5rem] bg-white/[0.03] border border-white/5" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-96 rounded-[2.5rem] bg-white/[0.03] border border-white/5" />
        <div className="h-96 rounded-[2.5rem] bg-white/[0.03] border border-white/5" />
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="relative min-h-screen bg-[#020617] flex items-center justify-center overflow-hidden">
      <Scanlines />
      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Animated ring */}
        <div className="relative h-24 w-24">
          <div className="absolute inset-0 rounded-full border border-white/5" />
          <div className="absolute inset-0 rounded-full border-2 border-t-cyan-400 border-r-cyan-400/30 border-b-transparent border-l-transparent animate-spin" />
          <div className="absolute inset-3 rounded-full border border-white/5" />
          <div className="absolute inset-3 rounded-full border-2 border-b-orange-400 border-l-orange-400/30 border-t-transparent border-r-transparent animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-3 w-3 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)] animate-pulse" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-400 mb-1">GGN Hive Command</p>
          <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-600">Synchronizing Access Protocol...</p>
        </div>
      </div>
    </div>
  );
}

export function BetaPortalClient() {
  const [loading, setLoading] = useState(true);
  const [betaStatus, setBetaStatus] = useState<BetaStatus | null>(null);
  const [existingRequest, setExistingRequest] = useState<BetaRequest | null>(null);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAccess() {
      try {
        const sessionRes = await fetch("/api/session");
        if (!sessionRes.ok) throw new Error("Session unavailable");
        const sessionData = await sessionRes.json();

        if (!sessionData.user) {
          setError("auth");
          setLoading(false);
          return;
        }
        setUser(sessionData.user);

        const betaRes = await fetch("/api/beta/check");
        const betaData = await betaRes.json();
        setBetaStatus(betaData);

        if (!betaData.isBetaTester) {
          const requestRes = await fetch("/api/beta/request");
          const requestData = await requestRes.json();
          if (requestData.ok && requestData.request) {
            setExistingRequest(requestData.request);
          }
        }
      } catch (e) {
        setError("network");
      } finally {
        setLoading(false);
      }
    }
    checkAccess();
  }, []);

  if (loading) return <LoadingScreen />;

  if (error === "auth") {
    return (
      <div className="relative min-h-screen bg-[#020617] flex items-center justify-center p-4 overflow-hidden">
        <Scanlines />
        <div className="relative z-10 max-w-sm w-full text-center">
          <div className="mb-8 inline-flex h-24 w-24 items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/5 shadow-[0_0_40px_rgba(244,63,94,0.08)]">
            <svg className="h-10 w-10 text-rose-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-rose-400 mb-3">Access Restricted</p>
          <h1 className="text-3xl font-black text-white mb-3 tracking-tight">Signal Blocked</h1>
          <p className="text-slate-500 mb-10 font-medium text-sm leading-relaxed">Discord authentication is required to enter the Hive Command portal.</p>
          <a href="/auth/sign-in" className="inline-flex h-14 items-center justify-center gap-3 rounded-2xl bg-white px-10 text-sm font-black text-slate-950 transition hover:scale-[1.02] active:scale-[0.98] shadow-xl">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.101 18.082.11 18.1.128 18.12a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
            Sign In with Discord
          </a>
        </div>
      </div>
    );
  }

  if (error === "network") {
    return (
      <div className="relative min-h-screen bg-[#020617] flex items-center justify-center p-4 overflow-hidden">
        <Scanlines />
        <div className="relative z-10 max-w-sm w-full text-center">
          <div className="mb-8 inline-flex h-24 w-24 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/5">
            <svg className="h-10 w-10 text-amber-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
          </div>
          <h1 className="text-3xl font-black text-white mb-3 tracking-tight">Sync Failed</h1>
          <p className="text-slate-500 mb-10 text-sm font-medium">Network signal interrupted. Check your connection and retry.</p>
          <button onClick={() => window.location.reload()} className="inline-flex h-14 items-center justify-center rounded-2xl bg-white px-10 text-sm font-black text-slate-950 transition hover:scale-[1.02] active:scale-[0.98]">
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (!betaStatus?.isBetaTester) {
    return <BetaLandingPage existingRequest={existingRequest} user={user} />;
  }

  return (
    <div className="relative min-h-screen bg-[#020617] overflow-hidden">
      <Scanlines />
      {/* Sticky header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.05] bg-[#020617]/80 backdrop-blur-2xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/20 shadow-lg shadow-cyan-500/10">
              <span className="text-lg">🧪</span>
              <div className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-[#020617] bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
            </div>
            <div>
              <h1 className="text-base font-black text-white tracking-tight leading-none">Hive Command</h1>
              <p className="text-[10px] font-bold text-slate-600 mt-0.5 uppercase tracking-wider">
                Beta Portal · <span className="text-slate-400">{user?.username}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 px-4 py-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)] animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Beta Clearance</span>
            </div>
            {betaStatus?.joinedAt && (
              <div className="hidden lg:block text-right">
                <div className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-600">Since</div>
                <div className="text-xs font-bold text-slate-400">{new Date(betaStatus.joinedAt).toLocaleDateString()}</div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <RaidDashboard user={user} />
      </main>
    </div>
  );
}

function BetaLandingPage({ existingRequest, user }: { existingRequest: BetaRequest | null; user: any }) {
  return (
    <div className="relative min-h-screen bg-[#020617] overflow-hidden">
      <Scanlines />
      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 py-20 md:py-32">
        {/* Hero */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-orange-500/25 bg-orange-500/8 px-5 py-2 mb-8 shadow-[0_0_24px_rgba(249,115,22,0.08)]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.35em] text-orange-300">Operational Testing Phase</span>
          </div>
          <h1 className="text-5xl md:text-8xl font-black text-white leading-none tracking-tight mb-6">
            GGN{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-orange-400">
              Hive
            </span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Command</span>
          </h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto font-medium leading-relaxed">
            The next level of Once Human coordination. Live raid maps, hive XP rewards, and real-time team command.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid gap-4 sm:grid-cols-3 mb-20">
          {[
            { icon: "🗺️", label: "Hive Network", desc: "Pin territory, mark loot zones, coordinate defense on a live shared map.", accent: "orange" },
            { icon: "⚡", label: "Raid Switch", desc: "Launch raid, counter-raid, and defense alerts that your squad sees instantly.", accent: "cyan" },
            { icon: "💎", label: "Elite Rewards", desc: "Earn XP and level up your Hive to unlock free store packs and VIP status.", accent: "indigo" },
          ].map((f) => (
            <div key={f.label} className={`group rounded-[2rem] border border-white/5 bg-slate-900/30 p-8 backdrop-blur-xl transition-all duration-300 hover:border-${f.accent}-500/25 hover:bg-slate-900/50 hover:-translate-y-1`}>
              <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-${f.accent}-500/10 text-2xl shadow-[0_0_20px_rgba(0,0,0,0.2)] transition-transform group-hover:scale-110`}>{f.icon}</div>
              <h3 className="text-lg font-black text-white mb-2 tracking-tight">{f.label}</h3>
              <p className="text-sm font-medium text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Signup / status section */}
        <BetaSignupSection existingRequest={existingRequest} user={user} />
      </div>
    </div>
  );
}

function BetaSignupSection({ existingRequest, user }: { existingRequest: BetaRequest | null; user: any }) {
  const [form, setForm] = useState({ reason: "", experience: "", playTime: "" });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/beta/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.ok) {
        setSubmitted(true);
        setMessage({ text: "Neural scan complete. Application submitted for review.", type: "success" });
        setForm({ reason: "", experience: "", playTime: "" });
      } else {
        if (String(data.error || "").toLowerCase().includes("already")) {
          setMessage({ text: "Clearance verified. Synchronizing portal...", type: "success" });
          setTimeout(() => window.location.reload(), 900);
          return;
        }
        setMessage({ text: data.error || "Transmission failed. Try again.", type: "error" });
      }
    } catch {
      setMessage({ text: "Fatal signal error. Check your connection.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (existingRequest?.status === "pending" || submitted) {
    return (
      <div className="rounded-[2.5rem] border border-orange-500/15 bg-orange-500/[0.04] p-16 text-center backdrop-blur-xl">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-orange-500/20 bg-orange-500/10 text-3xl animate-pulse shadow-[0_0_30px_rgba(249,115,22,0.08)]">⏳</div>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-orange-400 mb-3">Signal Pending</p>
        <h2 className="text-3xl font-black text-white mb-4 tracking-tight">Review In Progress</h2>
        <p className="text-slate-500 font-medium max-w-md mx-auto leading-relaxed text-sm">
          Your request was logged{existingRequest?.requested_at ? ` on ${new Date(existingRequest.requested_at).toLocaleDateString()}` : ""}. Admins are verifying your hive metrics.
        </p>
      </div>
    );
  }

  if (existingRequest?.status === "approved") {
    return (
      <div className="rounded-[2.5rem] border border-emerald-500/15 bg-emerald-500/[0.04] p-16 text-center backdrop-blur-xl">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-3xl shadow-[0_0_30px_rgba(52,211,153,0.08)]">✓</div>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-400 mb-3">Access Verified</p>
        <h2 className="text-3xl font-black text-white mb-4 tracking-tight">Welcome to the Hive</h2>
        <p className="text-slate-500 mb-10 font-medium text-sm">Your application was approved. Reload to enter the portal.</p>
        <button onClick={() => window.location.reload()} className="h-14 rounded-2xl bg-white px-10 text-sm font-black text-slate-950 transition hover:scale-[1.02] active:scale-[0.98] shadow-xl">
          Enter Beta Portal →
        </button>
      </div>
    );
  }

  if (existingRequest?.status === "rejected") {
    return (
      <div className="rounded-[2.5rem] border border-rose-500/15 bg-rose-500/[0.04] p-16 text-center backdrop-blur-xl">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10 text-3xl">✕</div>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-rose-400 mb-3">Clearance Denied</p>
        <h2 className="text-3xl font-black text-white mb-4 tracking-tight">Access Not Granted</h2>
        <p className="text-slate-500 font-medium text-sm max-w-md mx-auto">Your profile does not currently meet beta requirements.</p>
        <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-700">Re-evaluation available in 30 days</p>
      </div>
    );
  }

  return (
    <div className="rounded-[2.5rem] border border-white/[0.06] bg-slate-900/30 p-10 md:p-16 backdrop-blur-xl">
      <div className="text-center mb-12">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-400 mb-3">Apply for Access</p>
        <h2 className="text-4xl font-black text-white mb-4 tracking-tight">Request Beta Clearance</h2>
        <p className="text-slate-500 font-medium text-sm leading-relaxed max-w-lg mx-auto">
          We're looking for experienced survivors to stress-test the raid and hive coordination systems.
        </p>
      </div>

      {message && (
        <div className={`mb-8 rounded-2xl border px-6 py-4 text-center text-sm font-bold ${
          message.type === "success"
            ? "border-emerald-500/25 bg-emerald-500/8 text-emerald-300"
            : "border-rose-500/25 bg-rose-500/8 text-rose-300"
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
        <div>
          <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mb-2">Play Schedule</label>
          <select
            value={form.playTime}
            onChange={(e) => setForm({ ...form, playTime: e.target.value })}
            className="h-14 w-full rounded-2xl border border-white/8 bg-slate-950 px-5 text-sm font-bold text-white focus:border-cyan-500/40 outline-none transition appearance-none cursor-pointer"
          >
            <option value="">Select your availability...</option>
            <option value="daily">Daily — High-tier Active</option>
            <option value="few_times_week">Frequent — 3-4x per week</option>
            <option value="weekends">Surgical — Weekends only</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mb-2">Gaming Background</label>
          <textarea
            value={form.experience}
            onChange={(e) => setForm({ ...form, experience: e.target.value })}
            placeholder="Once Human history, previous hives, specialization..."
            rows={3}
            className="w-full rounded-2xl border border-white/8 bg-slate-950 px-5 py-4 text-sm font-bold text-white focus:border-cyan-500/40 outline-none transition resize-none placeholder:text-slate-700"
          />
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mb-2">
            Primary Objective <span className="text-rose-400">*</span>
          </label>
          <textarea
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            placeholder="Why do you want to join the beta program?"
            required
            rows={5}
            className="w-full rounded-2xl border border-white/8 bg-slate-950 px-5 py-4 text-sm font-bold text-white focus:border-cyan-500/40 outline-none transition resize-none placeholder:text-slate-700"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !form.reason.trim()}
          className="h-16 w-full rounded-[1.5rem] bg-gradient-to-r from-orange-500 to-amber-500 text-sm font-black uppercase tracking-[0.25em] text-white shadow-xl shadow-orange-500/20 transition hover:scale-[1.01] hover:shadow-orange-500/30 active:scale-[0.99] disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
        >
          {loading ? "Transmitting Data..." : "Submit Clearance Request"}
        </button>
      </form>
    </div>
  );
}
