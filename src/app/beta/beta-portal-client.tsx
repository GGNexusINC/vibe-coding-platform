"use client";

import { useState, useEffect } from "react";
import { getSession } from "@/lib/session";
import { RaidDashboard } from "./raid-dashboard";

interface BetaStatus {
  ok: boolean;
  isBetaTester: boolean;
  permissions?: string[];
  notes?: string;
  joinedAt?: string;
}

export function BetaPortalClient() {
  const [loading, setLoading] = useState(true);
  const [betaStatus, setBetaStatus] = useState<BetaStatus | null>(null);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAccess() {
      try {
        // Check session
        const sessionRes = await fetch("/api/session");
        const sessionData = await sessionRes.json();
        
        if (!sessionData.user) {
          setError("Please sign in to access the Beta Portal");
          setLoading(false);
          return;
        }

        setUser(sessionData.user);

        // Check beta status
        const betaRes = await fetch("/api/beta/check");
        const betaData = await betaRes.json();
        
        setBetaStatus(betaData);
      } catch (e) {
        setError("Failed to verify beta access");
      } finally {
        setLoading(false);
      }
    }

    checkAccess();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-400">Checking Beta Access...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!betaStatus?.isBetaTester) {
    return (
      <div className="min-h-screen bg-slate-950">
        <div className="max-w-4xl mx-auto px-4 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 mb-6">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-sm font-bold text-amber-300 uppercase tracking-wider">Beta Access Required</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
              Beta Tester <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Portal</span>
            </h1>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Exclusive features for our beta testers. Join the program to access the raid system and other upcoming features.
            </p>
          </div>

          {/* Features Preview */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center mb-4">
                <span className="text-2xl">🚨</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Raid Alert System</h3>
              <p className="text-slate-400 text-sm">
                Notify your team instantly when a raid is happening. Assign roles like Miner, Builder, PvP Fighter, and more.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
                <span className="text-2xl">👥</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Team Coordination</h3>
              <p className="text-slate-400 text-sm">
                Organize your raid team with specialized roles. See who's joining and what role they're playing.
              </p>
            </div>
          </div>

          {/* Application CTA */}
          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-950/30 to-slate-950/60 p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Want to Become a Beta Tester?</h2>
            <p className="text-slate-400 mb-6">
              Contact the server staff or admins to request beta access. Active members with good standing are eligible.
            </p>
            <div className="flex justify-center gap-4">
              <a 
                href="/support" 
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold hover:opacity-90 transition"
              >
                Contact Staff
              </a>
              <a 
                href="/discord" 
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition"
              >
                Join Discord
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <span className="text-2xl">🧪</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Beta Portal</h1>
                <p className="text-sm text-slate-400">
                  Welcome back, {user?.username}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase">
                Beta Access
              </span>
              {betaStatus.joinedAt && (
                <span className="text-xs text-slate-500">
                  Member since {new Date(betaStatus.joinedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <RaidDashboard user={user} />
      </div>
    </div>
  );
}
