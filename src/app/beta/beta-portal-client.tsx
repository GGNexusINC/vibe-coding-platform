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
  const [showSignupForm, setShowSignupForm] = useState(false);

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

        // If not a beta tester, check for existing request
        if (!betaData.isBetaTester) {
          const requestRes = await fetch("/api/beta/request");
          const requestData = await requestRes.json();
          if (requestData.ok && requestData.request) {
            setExistingRequest(requestData.request);
          }
        }
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
          <BetaSignupSection 
            existingRequest={existingRequest}
            user={user}
          />
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

// Beta Signup Section Component
function BetaSignupSection({ existingRequest, user }: { existingRequest: BetaRequest | null; user: any }) {
  const [form, setForm] = useState({ reason: '', experience: '', playTime: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
        setMessage('Application submitted! Check your DMs for updates.');
        setForm({ reason: '', experience: '', playTime: '' });
      } else {
        setMessage(data.error || 'Failed to submit');
      }
    } catch (e) {
      setMessage('Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  // Show pending status
  if (existingRequest?.status === 'pending') {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-950/30 to-slate-950/60 p-8 text-center">
        <div className="text-4xl mb-4">⏳</div>
        <h2 className="text-2xl font-bold text-white mb-2">Application Pending</h2>
        <p className="text-slate-400 mb-4">
          Your beta tester application was submitted on {new Date(existingRequest.requested_at).toLocaleDateString()}.
        </p>
        <p className="text-amber-400 text-sm">
          Admins are reviewing your request. You'll receive a DM when approved.
        </p>
      </div>
    );
  }

  // Show rejected status
  if (existingRequest?.status === 'rejected') {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-gradient-to-b from-red-950/30 to-slate-950/60 p-8 text-center">
        <div className="text-4xl mb-4">❌</div>
        <h2 className="text-2xl font-bold text-white mb-2">Application Not Approved</h2>
        <p className="text-slate-400 mb-4">
          Your previous application was not approved at this time.
        </p>
        <p className="text-slate-500 text-sm">
          You can apply again in the future.
        </p>
      </div>
    );
  }

  // Show signup form
  return (
    <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-950/30 to-slate-950/60 p-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Apply for Beta Access</h2>
        <p className="text-slate-400">
          Active members with good standing are eligible. Tell us why you want to join!
        </p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-xl text-center ${
          message.includes('submitted') 
            ? 'bg-green-500/20 border border-green-500/30 text-green-400' 
            : 'bg-red-500/20 border border-red-500/30 text-red-400'
        }`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Why do you want to join the beta? *
          </label>
          <textarea
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            placeholder="Tell us what excites you about testing new features..."
            required
            rows={3}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 focus:border-amber-500/50 focus:outline-none resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            What's your experience with Once Human?
          </label>
          <textarea
            value={form.experience}
            onChange={(e) => setForm({ ...form, experience: e.target.value })}
            placeholder="How long have you played? What do you enjoy most?"
            rows={2}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 focus:border-amber-500/50 focus:outline-none resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            How often do you play?
          </label>
          <select
            value={form.playTime}
            onChange={(e) => setForm({ ...form, playTime: e.target.value })}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-white focus:border-amber-500/50 focus:outline-none"
          >
            <option value="">Select play time...</option>
            <option value="daily">Daily (2+ hours)</option>
            <option value="few_times_week">Few times a week</option>
            <option value="weekends">Weekends only</option>
            <option value="casual">Casual (occasionally)</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading || !form.reason.trim()}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? 'Submitting...' : '📝 Submit Application'}
        </button>

        <p className="text-center text-xs text-slate-500">
          Admins will review your application and you'll receive a DM with the decision.
        </p>
      </form>
    </div>
  );
}
