"use client";

import { useState, useEffect } from "react";

interface BetaStatus {
  isTester: boolean;
  request: {
    status: "pending" | "approved" | "denied";
    created_at: string;
  } | null;
}

export function BetaSection() {
  const [status, setStatus] = useState<BetaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [msg, setMsg] = useState("");

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/beta/check");
      const data = await res.json();
      setStatus({
        isTester: data.isBetaTester,
        request: data.request || (data.isBetaTester ? { status: "approved", created_at: data.joinedAt } : null)
      });
    } catch (e) {
      console.error("Failed to fetch beta status", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchStatus();
  }, []);

  const handleApply = async () => {
    setApplying(true);
    setMsg("");
    try {
      const res = await fetch("/api/beta/request", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setMsg("✓ Your application has been received! Our staff will review it soon.");
        void fetchStatus();
      } else {
        setMsg(data.error || "Failed to apply.");
      }
    } catch (e) {
      setMsg("Network error. Please try again.");
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <div className="text-4xl mb-4">🧪</div>
        <div className="text-slate-500 text-sm font-medium italic">Scanning experimental systems...</div>
      </div>
    );
  }

  const isApproved = status?.request?.status === "approved" || status?.isTester;
  const isPending = status?.request?.status === "pending";

  return (
    <div className="space-y-6 max-w-2xl mx-auto py-4">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-white tracking-tight">Beta Program</h2>
        <p className="text-slate-400 text-sm">Help us test futuristic features before they go global.</p>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-white/8 bg-slate-900/50 p-8 shadow-2xl">
        {/* Glow effect */}
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-orange-500/10 blur-3xl" />
        
        <div className="relative flex flex-col items-center text-center space-y-6">
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/20 flex items-center justify-center text-4xl shadow-inner">
            {isApproved ? "🛡️" : isPending ? "⏳" : "🧪"}
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">
              {isApproved ? "Welcome, Pioneer" : isPending ? "Application Pending" : "Join the Vanguard"}
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed max-w-md">
              {isApproved 
                ? "You have full access to our latest experimental features. Thank you for helping us grow NewHopeGGN!"
                : isPending 
                ? "We've received your request to join the Beta. Our staff is currently reviewing applications."
                : "Get early access to Voice Translation, Arena Tournaments, and Advanced AI features. Applications are currently open."}
            </p>
          </div>

          {!isApproved && !isPending && (
            <button
              onClick={handleApply}
              disabled={applying}
              className="px-8 py-3 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 text-sm font-black text-white shadow-lg shadow-orange-500/20 hover:opacity-90 transition transform active:scale-95 disabled:opacity-50"
            >
              {applying ? "Connecting..." : "Request Beta Access"}
            </button>
          )}

          {isApproved && (
            <div className="flex flex-col items-center gap-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 text-xs font-bold uppercase tracking-widest">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Access Granted
              </div>
              <a 
                href="/beta"
                className="px-8 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 text-sm font-black text-white shadow-lg shadow-cyan-500/20 hover:opacity-90 transition transform active:scale-95 flex items-center gap-2"
              >
                <span>🚀 Go to Beta Portal</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </a>
            </div>
          )}

          {isPending && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-400/20 bg-amber-400/10 text-amber-300 text-xs font-bold uppercase tracking-widest">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              In Review
            </div>
          )}

          {msg && (
            <p className={`text-sm font-medium ${msg.startsWith("✓") ? "text-emerald-400" : "text-orange-400"}`}>
              {msg}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { title: "Voice Translation", desc: "Real-time AI voice processing in Discord.", icon: "🎙️", link: "/beta" },
          { title: "Arena 2.0", desc: "Participate in automated tournament brackets.", icon: "⚔️", link: "/beta" }
        ].map((feat) => (
          isApproved ? (
            <a 
              key={feat.title} 
              href={feat.link}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-start gap-3 hover:bg-white/8 transition-all hover:border-cyan-500/30 group"
            >
              <div className="text-xl group-hover:scale-110 transition-transform">{feat.icon}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-slate-200">{feat.title}</div>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </div>
                <div className="text-xs text-slate-500">{feat.desc}</div>
              </div>
            </a>
          ) : (
            <div key={feat.title} className="rounded-2xl border border-white/5 bg-white/4 p-4 flex items-start gap-3 opacity-60">
              <div className="text-xl">{feat.icon}</div>
              <div>
                <div className="text-sm font-bold text-slate-200">{feat.title}</div>
                <div className="text-xs text-slate-500">{feat.desc}</div>
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
}
