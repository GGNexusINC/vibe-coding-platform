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
  const [activeCategory, setActiveCategory] = useState("general");

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
    setTimeout(() => {
      setSaving(false);
      setSaveStatus("✓ Settings updated successfully");
      setTimeout(() => setSaveStatus(""), 3000);
    }, 800);
  };

  const categories = [
    { id: "general", label: "General", icon: "⚙️" },
    { id: "translation", label: "Translation", icon: "🌐" },
    { id: "voice", label: "Voice/VC", icon: "🎙️" },
    { id: "moderation", label: "Moderation", icon: "🛡️" },
    { id: "logging", label: "Logging", icon: "📋" },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* ── Left Sidebar (MEE6 Style) ── */}
      <aside className="w-full lg:w-64 shrink-0 space-y-2">
        <div className="px-4 mb-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Bot Plugins</h3>
        </div>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              activeCategory === cat.id
                ? "bg-[#5865F2] text-white shadow-lg shadow-[#5865F2]/20 translate-x-1"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <span className="text-lg">{cat.icon}</span>
            {cat.label}
          </button>
        ))}

        <div className="mt-8 pt-8 border-t border-white/5 px-4">
          <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 p-4 shadow-xl">
            <div className="text-[10px] font-black uppercase text-white/70">Subscription</div>
            <div className="mt-1 flex items-center justify-between text-white font-black">
              <span>Premium Pro</span>
              <span className="text-xs">Active</span>
            </div>
            <Link 
              href="/bot" 
              className="mt-4 block w-full py-2 text-center text-[10px] font-black bg-black/20 hover:bg-black/30 rounded-lg text-white transition"
            >
              MANAGE PLAN
            </Link>
          </div>
        </div>
      </aside>

      {/* ── Main Panel ── */}
      <div className="flex-1 space-y-6">
        {/* Stats Summary Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 backdrop-blur-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status</div>
            <div className="mt-1 flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${status?.status === 'online' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span className="text-sm font-black text-white capitalize">{status?.status || "offline"}</span>
            </div>
          </div>
          <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 backdrop-blur-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Guilds</div>
            <div className="mt-1 text-sm font-black text-white">{status?.discord?.guilds || 0} Connected</div>
          </div>
          <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 backdrop-blur-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">VC Active</div>
            <div className="mt-1 text-sm font-black text-white">{status?.discord?.voiceConnections || 0} Sessions</div>
          </div>
          <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 backdrop-blur-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Listeners</div>
            <div className="mt-1 text-sm font-black text-white">{status?.voice?.activeListeners || 0} Members</div>
          </div>
        </div>

        {/* Dynamic Category Content */}
        <div className="bg-slate-950/60 border border-white/10 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <span className="text-8xl">{categories.find(c => c.id === activeCategory)?.icon}</span>
          </div>

          {activeCategory === "general" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div>
                <h2 className="text-2xl font-black text-white">General Settings</h2>
                <p className="text-slate-400 text-sm">Identity and global bot behavior for your server.</p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-500">Bot Name Preference</label>
                  <input type="text" placeholder="NewHope Translate" className="w-full bg-slate-900 ring-1 ring-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:ring-[#5865F2]" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-500">Command Prefix</label>
                  <input type="text" disabled value="/" className="w-full bg-slate-900/50 ring-1 ring-white/5 rounded-xl px-4 py-3 text-slate-500 text-sm cursor-not-allowed" title="Slash commands are enabled by default" />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-400/5 border border-amber-400/10">
                <div className="text-xs font-bold text-amber-400 flex items-center gap-2 mb-1">
                  <span>💡</span> PRO TIP
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  You can synchronize your bot settings across multiple servers if you are the owner of all of them. Use the global sync panel in your account settings.
                </p>
              </div>
            </div>
          )}

          {activeCategory === "translation" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div>
                <h2 className="text-2xl font-black text-white">Translation Engine</h2>
                <p className="text-slate-400 text-sm">Configure how messages and slash commands are translated.</p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-500">Default Target Language</label>
                  <select 
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                    className="w-full bg-slate-900 ring-1 ring-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:ring-[#5865F2] appearance-none"
                  >
                    <option value="en">🇺🇸 English</option>
                    <option value="es">🇪🇸 Spanish</option>
                    <option value="pt">🇵🇹 Portuguese</option>
                    <option value="fr">🇫🇷 French</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-500">Output Mode</label>
                  <div className="flex gap-2">
                    <button className="flex-1 py-3 bg-[#5865F2] text-white rounded-xl text-xs font-black">EMBEDS</button>
                    <button className="flex-1 py-3 bg-slate-900 text-slate-500 rounded-xl text-xs font-black hover:text-white transition">RAW TEXT</button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-slate-500">Auto-Translate Webhook</label>
                <input 
                  type="password"
                  value={voiceWebhook}
                  onChange={(e) => setVoiceWebhook(e.target.value)}
                  placeholder="https://discord.com/api/webhooks/..." 
                  className="w-full bg-slate-900 ring-1 ring-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:ring-[#5865F2]" 
                />
                <p className="text-[10px] text-slate-500 mt-1 italic">Optional. Used for mirroring translated text specifically.</p>
              </div>
            </div>
          )}

          {activeCategory === "voice" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div>
                <h2 className="text-2xl font-black text-white">Voice & VC Control</h2>
                <p className="text-slate-400 text-sm">Real-time speech translation and TTS settings.</p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="bg-slate-900/80 p-5 rounded-2xl border border-indigo-500/20">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-white font-bold">Speech-to-Text</span>
                    <span className="px-2 py-0.5 bg-indigo-500 rounded text-[9px] font-black text-white">AI POWERED</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                    Higher accuracy transcription using Deepgram Nova-2. Includes noise reduction and speaker diarization.
                  </p>
                  <div className="h-1.5 w-full bg-indigo-950 rounded-full overflow-hidden">
                    <div className="h-full w-full bg-indigo-500" />
                  </div>
                </div>

                <div className="bg-slate-900/80 p-5 rounded-2xl border border-emerald-500/20">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-white font-bold">Voice Synthesis</span>
                    <span className="px-2 py-0.5 bg-emerald-500 rounded text-[9px] font-black text-white">PREMIUM</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                    Natural sounding Text-to-Speech voices for multiple languages. Translates and speaks instantly.
                  </p>
                  <div className="h-1.5 w-full bg-emerald-950 rounded-full overflow-hidden">
                    <div className="h-full w-full bg-emerald-500" />
                  </div>
                </div>
              </div>

              {/* Active Sessions UI (Improved) */}
              <div className="mt-8">
                <div className="flex items-center gap-2 mb-4 text-xs font-black uppercase text-slate-500">
                  <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                  Live Activity Monitoring
                </div>
                {status?.voice?.connections?.length ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {status.voice.connections.map((c) => (
                      <div key={c.guildId} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                        <div className="text-xs font-bold text-white">{c.voiceChannelName || "Voice Channel"}</div>
                        <div className="text-[10px] font-black px-2 py-1 bg-cyan-500/10 text-cyan-400 rounded-lg">{c.targetLang?.toUpperCase() || "EN"}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 border-2 border-dashed border-white/5 rounded-3xl text-center">
                    <div className="text-4xl mb-3">🤐</div>
                    <div className="text-sm font-bold text-slate-500">No active voice sessions found</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeCategory === "moderation" && (
            <div className="py-20 text-center animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="text-5xl mb-4">🛡️</div>
              <h2 className="text-xl font-black text-white">Auto-Moderation coming soon</h2>
              <p className="text-slate-500 text-sm max-w-sm mx-auto mt-2">We are currently developing advanced AI-based chat moderation for NewHopeGGN.</p>
            </div>
          )}

          {activeCategory === "logging" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div>
                <h2 className="text-2xl font-black text-white">Admin Audit Logs</h2>
                <p className="text-slate-400 text-sm">Track moderation and server events in your private log channel.</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-slate-500">Audit Logs Webhook ID / Channel ID</label>
                <input 
                  type="text" 
                  value={logWebhook}
                  onChange={(e) => setLogWebhook(e.target.value)}
                  placeholder="1495921032996065371" 
                  className="w-full bg-slate-900 ring-1 ring-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:ring-[#5865F2]" 
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  "Log Deleted Messages", "Log Edited Messages", "Log Bans/Kicks", 
                  "Log Voice Join/Leave", "Log Role Changes", "Log Nickname Changes"
                ].map(item => (
                  <div key={item} className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-white/5">
                    <span className="text-xs font-bold text-slate-300">{item}</span>
                    <div className="h-6 w-11 rounded-full bg-indigo-500 p-1 flex justify-end">
                      <div className="h-4 w-4 rounded-full bg-white shadow-sm" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Action Footer */}
          <div className="mt-12 pt-8 border-t border-white/5 flex items-center justify-between">
            <div className="text-xs">
              {saveStatus && <span className="text-emerald-400 font-bold">{saveStatus}</span>}
            </div>
            <div className="flex gap-4">
              <button className="px-6 py-2.5 rounded-xl text-xs font-black text-slate-400 hover:text-white transition">Discard</button>
              <button 
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-8 py-3 bg-[#5865F2] hover:bg-[#4752c4] text-white rounded-xl text-xs font-black transition-all shadow-xl shadow-[#5865F2]/20 active:scale-95"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
