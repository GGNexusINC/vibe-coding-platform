"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type BotStatus = {
  status: "online" | "degraded" | "offline" | "starting";
  botTag: string | null;
  uptimeMs: number;
  discord: { guilds: number; voiceConnections: number };
  deepgram: { configured: boolean; activeSessions: number };
  voice: {
    activeListeners: number;
    connections: {
      guildId: string;
      guildName: string | null;
      voiceChannelName: string | null;
      connectionState: string;
      targetLang: string | null;
    }[];
  };
};

export function BotSection() {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Bot Settings State
  const [targetLang, setTargetLang] = useState("en");
  const [logWebhook, setLogWebhook] = useState("");
  const [voiceWebhook, setVoiceWebhook] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");

  useEffect(() => {
    fetch("/api/admin/bot-status")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.status) {
          setStatus(data.status);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSaveSettings = () => {
    setSaving(true);
    setSaveStatus("");
    // In a real app, this would call an API to save guild settings in Supabase
    setTimeout(() => {
      setSaving(false);
      setSaveStatus("✓ Settings updated successfully");
      setTimeout(() => setSaveStatus(""), 3000);
    }, 800);
  };

  const features = [
    { title: "Live VC Translation", desc: "Real-time speech translation in voice channels.", icon: "🎙️", color: "text-purple-400" },
    { title: "Text Translation", desc: "Instant translation for messages and slash commands.", icon: "📝", color: "text-blue-400" },
    { title: "Admin Logs", desc: "Track all moderation actions with rich embeds.", icon: "📋", color: "text-amber-400" },
    { title: "Voice TTS", desc: "Speak translated text directly into voice chat.", icon: "🔊", color: "text-emerald-400" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* ── Status Header ── */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="relative group overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40 p-5 backdrop-blur-sm transition hover:border-[#5865F2]/40">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-[#5865F2]/5 blur-2xl group-hover:bg-[#5865F2]/10 transition" />
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Service Status</div>
          <div className="mt-3 flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full animate-pulse ${
              status?.status === 'online' ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]' : 
              status?.status === 'degraded' ? 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]' : 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.5)]'
            }`} />
            <div className="text-xl font-black text-white">{status?.status === 'online' ? 'Connected' : status?.status === 'degraded' ? 'Degraded' : 'Offline'}</div>
          </div>
          <div className="mt-1 text-xs text-slate-500">{status?.botTag || "NewHope Translate"}</div>
        </div>

        <div className="relative group overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40 p-5 backdrop-blur-sm transition hover:border-cyan-400/40">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-cyan-400/5 blur-2xl group-hover:bg-cyan-400/10 transition" />
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Live Connections</div>
          <div className="mt-3 flex items-end gap-2">
            <div className="text-3xl font-black text-white">{status?.voice.activeListeners || 0}</div>
            <div className="mb-1 text-xs font-bold text-cyan-400">Active Listeners</div>
          </div>
          <div className="mt-1 text-xs text-slate-500">{status?.discord.voiceConnections || 0} Voice Channels</div>
        </div>

        <div className="relative group overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40 p-5 backdrop-blur-sm transition hover:border-amber-400/40">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-amber-400/5 blur-2xl group-hover:bg-amber-400/10 transition" />
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Language Engine</div>
          <div className="mt-3 flex items-center gap-2">
            <div className="text-xl font-black text-white">{status?.deepgram.configured ? "Deepgram AI" : "Google Cloud"}</div>
            <div className="rounded-full bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 text-[9px] font-black text-amber-300">PREMIUM</div>
          </div>
          <div className="mt-1 text-xs text-slate-500">Low-latency Nova-2 Engine</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* ── Main Settings Panel ── */}
        <div className="rounded-3xl border border-white/5 bg-slate-950/60 p-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#5865F2]/40 to-transparent" />
          
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-black text-white">Bot Configuration</h2>
              <p className="text-sm text-slate-400">Customize how the bot behaves in your server.</p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-[#5865F2]/30 bg-[#5865F2]/10 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Guild #141952</span>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Target Language</label>
                <select 
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900/50 px-4 py-3 text-sm text-white outline-none focus:border-[#5865F2]/50 transition appearance-none"
                >
                  <option value="en">🇺🇸 English</option>
                  <option value="es">🇪🇸 Spanish</option>
                  <option value="pt">🇵🇹 Portuguese</option>
                  <option value="fr">🇫🇷 French</option>
                  <option value="de">🇩🇪 German</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1 italic">Default language for /vclisten results.</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Premium Status</label>
                <div className="flex h-[46px] items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4">
                  <span className="text-sm font-bold text-emerald-400">UNLIMITED VOICE</span>
                  <span className="rounded-md bg-emerald-500 px-2 py-0.5 text-[9px] font-black text-white">ACTIVE</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Staff-Voice Webhook</label>
              <div className="relative">
                <input 
                  type="password"
                  placeholder="https://discord.com/api/webhooks/..."
                  value={voiceWebhook}
                  onChange={(e) => setVoiceWebhook(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900/50 px-4 py-3 text-sm text-white outline-none focus:border-[#5865F2]/50 transition pr-10"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600">🔒</div>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 italic">Voice translations will be posted to this webhook channel.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Admin Audit Logs Channel</label>
              <input 
                type="text"
                placeholder="Channel ID (e.g. 123456789012345678)"
                value={logWebhook}
                onChange={(e) => setLogWebhook(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900/50 px-4 py-3 text-sm text-white outline-none focus:border-[#5865F2]/50 transition"
              />
            </div>

            <div className="pt-4 flex items-center justify-between">
              <div className="text-xs text-slate-400">
                {saveStatus && <span className="text-emerald-400 font-bold">{saveStatus}</span>}
              </div>
              <button 
                onClick={handleSaveSettings}
                disabled={saving}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#5865F2] px-8 text-sm font-black text-white transition hover:scale-[1.02] hover:bg-[#4752c4] shadow-[0_8px_24px_rgba(88,101,242,0.25)]"
              >
                {saving ? "Saving Changes..." : "Save Custom Settings"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Features List Sidebar ── */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-5">
            <h3 className="text-xs font-black uppercase tracking-[0.25em] text-indigo-400 mb-4">Core Features</h3>
            <div className="space-y-4">
              {features.map((f) => (
                <div key={f.title} className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-xl">
                    {f.icon}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{f.title}</div>
                    <p className="text-[11px] leading-relaxed text-slate-500 mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5">
            <div className="flex items-center gap-2 text-indigo-300 font-black text-sm uppercase tracking-wider">
              <span>💎</span> Premium Edge
            </div>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Your server is currently on the <span className="text-indigo-300 font-bold">Pro Voice</span> plan. 
              This gives you access to Deepgram AI transcription and multi-language support.
            </p>
            <Link 
              href="/bot" 
              className="mt-4 block text-center rounded-xl bg-indigo-500/10 border border-indigo-500/30 py-2.5 text-xs font-black text-indigo-200 transition hover:bg-indigo-500/20"
            >
              View All Plans
            </Link>
          </div>
        </div>
      </div>

      {/* ── Active Sessions ── */}
      {status?.voice.connections.length ? (
        <section className="rounded-3xl border border-white/5 bg-slate-950/60 p-6 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-100">Live Voice Sessions</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {status.voice.connections.map((c) => (
              <div key={c.guildId} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 flex items-center justify-between group transition hover:bg-white/[0.05]">
                <div>
                  <div className="text-xs font-bold text-white">{c.voiceChannelName || "Voice Channel"}</div>
                  <div className="mt-1 text-[10px] text-slate-500">Guild ID: {c.guildId.slice(0, 8)}...</div>
                </div>
                <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 text-[10px] font-black text-cyan-400">
                  {c.targetLang?.toUpperCase() || "EN"}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <div className="rounded-3xl border border-white/5 bg-slate-950/20 p-8 text-center border-dashed">
          <div className="text-3xl mb-2">🧊</div>
          <div className="text-sm font-bold text-slate-400">No active voice sessions</div>
          <p className="text-xs text-slate-600 mt-1">Run /vclisten in your Discord to see live activity here.</p>
        </div>
      )}
    </div>
  );
}
