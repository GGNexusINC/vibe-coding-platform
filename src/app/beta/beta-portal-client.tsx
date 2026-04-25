"use client";

import { useState, useEffect } from "react";
import { RaidDashboard } from "./raid-dashboard";

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
        const sessionData = await sessionRes.json();
        
        if (!sessionData.user) {
          setError("Authentication required for Beta Access.");
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
        setError("Network sync failed. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    checkAccess();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="relative h-16 w-16 mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-orange-500/10" />
            <div className="absolute inset-0 rounded-full border-4 border-t-orange-500 animate-spin" />
          </div>
          <p className="text-orange-400 font-black uppercase tracking-[0.3em] text-xs">Synchronizing Access...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-[2.5rem] border border-white/5 bg-slate-900/40 p-10 text-center backdrop-blur-xl">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-rose-500/10 text-4xl shadow-[0_0_30px_rgba(244,63,94,0.1)]">
            🔒
          </div>
          <h1 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Signal Restricted</h1>
          <p className="text-slate-400 mb-8 font-medium leading-relaxed">{error}</p>
          <a href="/auth/sign-in" className="inline-flex h-12 items-center justify-center rounded-2xl bg-white px-8 text-sm font-black text-slate-950 transition hover:scale-[1.02]">
            Sign In to GGN
          </a>
        </div>
      </div>
    );
  }

  if (!betaStatus?.isBetaTester) {
    return (
      <div className="min-h-screen bg-[#020617] selection:bg-orange-500/30">
        {/* Background FX */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -left-[10%] top-[-10%] h-[60%] w-[60%] rounded-full bg-orange-500/5 blur-[120px]" />
          <div className="absolute -bottom-[10%] -right-[10%] h-[60%] w-[60%] rounded-full bg-cyan-500/5 blur-[120px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:40px_40px]" />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 py-16 md:py-24">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-3 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.3em] text-orange-300 mb-8 shadow-[0_0_20px_rgba(249,115,22,0.15)]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500"></span>
              </span>
              Operational Testing Phase
            </div>
            <h1 className="text-4xl md:text-7xl font-black text-white leading-none tracking-tight mb-6">
              GGN <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">Hive Command</span>
            </h1>
            <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto font-medium leading-relaxed">
              Unlock the next level of Once Human server coordination. Live raid maps, hive XP rewards, and real-time team auditing.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 mb-16">
            <div className="group rounded-[2rem] border border-white/5 bg-slate-900/30 p-8 backdrop-blur-xl transition hover:border-orange-500/30">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 text-3xl shadow-[0_0_20px_rgba(249,115,22,0.1)] group-hover:scale-110 transition">
                🗺️
              </div>
              <h3 className="text-xl font-black text-white mb-3 tracking-tight">Hive Network</h3>
              <p className="text-slate-400 font-medium leading-relaxed">
                Pin your territory on the shared community map. Coordinate defenses, mark high-tier loot zones, and track rival movements.
              </p>
            </div>
            <div className="group rounded-[2rem] border border-white/5 bg-slate-900/30 p-8 backdrop-blur-xl transition hover:border-cyan-500/30">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-3xl shadow-[0_0_20px_rgba(34,211,238,0.1)] group-hover:scale-110 transition">
                💎
              </div>
              <h3 className="text-xl font-black text-white mb-3 tracking-tight">Elite Rewards</h3>
              <p className="text-slate-400 font-medium leading-relaxed">
                Level up your Hive to unlock free store packs, server-wide recognition, and exclusive VIP metadata for your profile.
              </p>
            </div>
          </div>

          <BetaSignupSection existingRequest={existingRequest} user={user} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617]">
      <div className="border-b border-white/5 bg-slate-900/30 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5">
              <div className="relative h-14 w-14 rounded-[1.25rem] bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-xl shadow-orange-500/20">
                <span className="text-2xl">🧪</span>
                <div className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-[#020617] bg-emerald-500 animate-pulse" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white leading-none tracking-tight">Beta Portal</h1>
                <p className="mt-1 text-sm font-medium text-slate-400">
                  Welcome back, <span className="text-white">{user?.username}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 px-4 py-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">Beta Clearance</span>
              </div>
              {betaStatus.joinedAt && (
                <div className="hidden lg:block text-right">
                  <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">Access Established</div>
                  <div className="text-xs font-bold text-slate-300">{new Date(betaStatus.joinedAt).toLocaleDateString()}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">
        <RaidDashboard user={user} />
      </div>
    </div>
  );
}

function BetaSignupSection({ existingRequest, user }: { existingRequest: BetaRequest | null; user: any }) {
  const [form, setForm] = useState({ reason: '', experience: '', playTime: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/beta/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (data.ok) {
        setMessage({ text: 'Neural scan complete. Application submitted for review.', type: 'success' });
        setForm({ reason: '', experience: '', playTime: '' });
      } else {
        if (String(data.error || '').toLowerCase().includes('already')) {
          setMessage({ text: 'Clearance verified. Synchronizing portal...', type: 'success' });
          window.setTimeout(() => window.location.reload(), 900);
          return;
        }
        setMessage({ text: data.error || 'Transmission failed.', type: 'error' });
      }
    } catch (e) {
      setMessage({ text: 'Fatal error during submission.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (existingRequest?.status === 'pending') {
    return (
      <div className="rounded-[2.5rem] border border-orange-500/20 bg-orange-500/5 p-12 text-center backdrop-blur-xl">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-orange-500/10 text-4xl animate-pulse">⏳</div>
        <h2 className="text-2xl font-black text-white mb-3 uppercase tracking-tight">Signal Pending</h2>
        <p className="text-slate-400 mb-6 font-medium leading-relaxed max-w-md mx-auto">
          Your request was logged on {new Date(existingRequest.requested_at).toLocaleDateString()}. Admins are currently verifying your hive metrics.
        </p>
        <div className="inline-flex rounded-xl bg-orange-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">
          Status: Review Ongoing
        </div>
      </div>
    );
  }

  if (existingRequest?.status === 'approved') {
    return (
      <div className="rounded-[2.5rem] border border-emerald-500/20 bg-emerald-500/5 p-12 text-center backdrop-blur-xl">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-4xl">✓</div>
        <h2 className="text-2xl font-black text-white mb-3 uppercase tracking-tight">Access Verified</h2>
        <p className="text-slate-400 mb-8 font-medium leading-relaxed">Your application was successful. Welcome to the inner hive.</p>
        <button onClick={() => window.location.reload()} className="h-12 rounded-2xl bg-white px-8 text-sm font-black text-slate-950 transition hover:scale-[1.02]">
          Enter Beta Portal
        </button>
      </div>
    );
  }

  if (existingRequest?.status === 'rejected') {
    return (
      <div className="rounded-[2.5rem] border border-rose-500/20 bg-rose-500/5 p-12 text-center backdrop-blur-xl">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-rose-500/10 text-4xl">❌</div>
        <h2 className="text-2xl font-black text-white mb-3 uppercase tracking-tight">Clearance Denied</h2>
        <p className="text-slate-400 mb-4 font-medium leading-relaxed">Your profile does not currently meet the requirements for beta testing.</p>
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-600">Re-evaluation available in 30 days</p>
      </div>
    );
  }

  return (
    <div className="rounded-[3rem] border border-white/5 bg-slate-900/40 p-10 md:p-16 backdrop-blur-xl">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-black text-white mb-4 uppercase tracking-tight">Request Beta Access</h2>
        <p className="text-slate-400 font-medium leading-relaxed max-w-lg mx-auto">
          Hive Command is in active development. We are looking for experienced survivors to stress-test our raid and coordination systems.
        </p>
      </div>

      {message && (
        <div className={`mb-8 p-6 rounded-2xl text-center font-bold text-sm ${
          message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl mx-auto">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">Play Schedule</label>
              <select
                value={form.playTime}
                onChange={(e) => setForm({ ...form, playTime: e.target.value })}
                className="h-14 w-full rounded-2xl border border-white/10 bg-slate-950 px-5 text-sm font-bold text-white focus:border-orange-500/50 outline-none transition appearance-none"
              >
                <option value="">Operational Hours...</option>
                <option value="daily">Daily (High-tier Active)</option>
                <option value="few_times_week">Frequent (3-4x week)</option>
                <option value="weekends">Surgical (Weekends)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">Experience Protocol</label>
              <textarea
                value={form.experience}
                onChange={(e) => setForm({ ...form, experience: e.target.value })}
                placeholder="Once Human history, previous hives, specialization..."
                rows={4}
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-sm font-bold text-white focus:border-orange-500/50 outline-none transition resize-none placeholder:text-slate-700"
              />
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">Primary Objective</label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="Why do you want to join the beta program?"
                required
                rows={9}
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-5 py-4 text-sm font-bold text-white focus:border-orange-500/50 outline-none transition resize-none placeholder:text-slate-700"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !form.reason.trim()}
          className="h-16 w-full rounded-[1.5rem] bg-gradient-to-r from-orange-500 to-amber-600 text-sm font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-orange-500/20 transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
        >
          {loading ? 'Transmitting Data...' : 'Submit Clearance Request'}
        </button>
      </form>
    </div>
  );
}
