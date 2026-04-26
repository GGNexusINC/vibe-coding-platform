"use client";

import { useEffect, useMemo, useState } from "react";

type Guild = {
  id: string;
  name: string;
  icon: string | null;
};

type BotSettings = {
  prefix: string;
  language: string;
  botNickname: string;
  logging: {
    enabled: boolean;
    channelId: string;
    events: string[];
  };
  translation: {
    enabled: boolean;
    targetLang: string;
    channelIds: string[];
    includeBotMessages: boolean;
  };
  ai: {
    enabled: boolean;
    tone: string;
    frequency: string;
    bilingual: boolean;
    channelIds: string[];
  };
  premium: {
    enabled: boolean;
    plan: "free" | "starter" | "pro_voice" | "server_ops" | "internal";
    priceMonthlyUsd: number;
    expiresAt?: string | null;
    features: Record<string, boolean>;
  };
};

type BotStatus = {
  status: "online" | "degraded" | "offline" | "starting";
  botTag?: string | null;
  uptimeMs?: number;
  discord?: {
    guilds?: number;
    voiceConnections?: number;
  };
  deepgram?: {
    configured?: boolean;
    activeSessions?: number;
  };
  voice?: {
    activeListeners?: number;
    connections?: {
      guildId: string;
      guildName: string | null;
      voiceChannelName: string | null;
      connectionState: string;
      targetLang: string | null;
    }[];
  };
};

const defaultSettings: BotSettings = {
  prefix: "/",
  language: "en",
  botNickname: "",
  logging: {
    enabled: false,
    channelId: "",
    events: ["joins", "leaves", "bans", "commands", "voice", "errors"],
  },
  translation: {
    enabled: false,
    targetLang: "auto",
    channelIds: [],
    includeBotMessages: false,
  },
  ai: {
    enabled: false,
    tone: "default",
    frequency: "sometimes",
    bilingual: false,
    channelIds: [],
  },
  premium: {
    enabled: false,
    plan: "free",
    priceMonthlyUsd: 0,
    expiresAt: null,
    features: {
      textTranslate: true,
      liveVoice: false,
      spokenVoice: false,
      staffLogs: false,
      reliability: false,
    },
  },
};

const modules = [
  {
    title: "Auto Text Translate",
    desc: "Translate typed chat automatically with server-level target language control.",
    tier: "Starter",
    feature: "textTranslate",
  },
  {
    title: "Live VC Translate",
    desc: "Auto-detect speech and post translated embeds with speaker names.",
    tier: "Pro Voice",
    feature: "liveVoice",
  },
  {
    title: "VC Spoken Replies",
    desc: "Use /nhtranslate speak:true to talk back into voice channels.",
    tier: "Pro Voice",
    feature: "spokenVoice",
  },
  {
    title: "Staff Audit Logs",
    desc: "Professional Discord embeds for joins, bans, commands, setup, and errors.",
    tier: "Server Ops",
    feature: "staffLogs",
  },
  {
    title: "Reliability Monitor",
    desc: "Heartbeat, Deepgram stream, Fly bot health, and emergency restart visibility.",
    tier: "Server Ops",
    feature: "reliability",
  },
  {
    title: "AI Conversation",
    desc: "Autonomous AI responses in text channels with funny, sassy, or professional tones.",
    tier: "Pro Voice",
    feature: "aiChat",
  },
];

const planLabels = {
  free: "Free",
  starter: "Starter",
  pro_voice: "Pro Voice",
  server_ops: "Server Ops",
  internal: "VoxBridge Internal",
};

const planPrices = {
  starter: 19,
  pro_voice: 59,
  server_ops: 149,
};

const languages = [
  ["auto", "Auto Detect"],
  ["en", "English"],
  ["es", "Spanish"],
  ["pt", "Portuguese"],
  ["fr", "French"],
  ["de", "German"],
];

const commandHighlights = [
  ["/autotext", "Enable or disable automatic text translation directly from Discord."],
  ["/nhtranslate", "Translate a one-off message publicly."],
  ["/vclisten", "Join VC and translate to a target language."],
  ["/vcauto", "Fast English/Spanish voice mode for live staff use."],
  ["/vcpermcheck", "Confirm the bot has the exact voice permissions it needs."],
];

const logEvents = [
  ["joins", "Member joins"],
  ["leaves", "Member leaves"],
  ["bans", "Bans and unbans"],
  ["commands", "Slash commands"],
  ["voice", "Voice translation"],
  ["errors", "Errors and outages"],
];

function statusTone(status?: string) {
  if (status === "online") return "border-lime-400/25 bg-lime-400/10 text-lime-300";
  if (status === "degraded" || status === "starting") return "border-amber-400/25 bg-amber-400/10 text-amber-300";
  return "border-rose-400/25 bg-rose-400/10 text-rose-300";
}

function formatUptime(ms?: number) {
  if (!ms) return "Waiting for heartbeat";
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${mins}m uptime`;
}

export function BotSection({
  guilds = [],
  initialGuildId,
  isAdminPanel = false,
}: {
  guilds?: Guild[];
  isAdminPanel?: boolean;
  initialGuildId?: string;
}) {
  const [selectedGuildId, setSelectedGuildId] = useState(() => initialGuildId || guilds[0]?.id || "");
  const [settings, setSettings] = useState<BotSettings>(defaultSettings);
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [activePanel, setActivePanel] = useState<"overview" | "translation" | "voice" | "logs" | "ai" | "premium">("overview");
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [notice, setNotice] = useState("");
  const [guildChannels, setGuildChannels] = useState<{ id: string; name: string; type: number }[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);

  const selectedGuild = useMemo(
    () => guilds.find((guild) => guild.id === selectedGuildId) || guilds[0],
    [guilds, selectedGuildId],
  );

  useEffect(() => {
    if (!selectedGuildId && guilds[0]?.id) setSelectedGuildId(guilds[0].id);
  }, [guilds, selectedGuildId]);

  useEffect(() => {
    fetch("/api/admin/bot-status", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data?.ok && data.status) setStatus(data.status);
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (!selectedGuildId) return;
    setLoadingSettings(true);
    fetch(`/api/bot/settings?guildId=${selectedGuildId}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data?.ok && data.settings) {
          setSettings({
            ...defaultSettings,
            ...data.settings,
            logging: { ...defaultSettings.logging, ...data.settings.logging },
            translation: { ...defaultSettings.translation, ...data.settings.translation },
            ai: { ...defaultSettings.ai, ...data.settings.ai },
            premium: {
              ...defaultSettings.premium,
              ...data.settings.premium,
              features: {
                ...defaultSettings.premium.features,
                ...(data.settings.premium?.features || {}),
              },
            },
          });
        }
      })
      .catch(() => setNotice("Could not load saved bot settings."))
      .finally(() => setLoadingSettings(false));

    setLoadingChannels(true);
    fetch(`/api/bot/channels?guildId=${selectedGuildId}`, { cache: "no-store" })
      .then(res => res.json())
      .then(data => {
        if (data?.ok && data.channels) {
          setGuildChannels(data.channels);
        } else {
          setGuildChannels([]);
        }
      })
      .catch(() => setGuildChannels([]))
      .finally(() => setLoadingChannels(false));
  }, [selectedGuildId]);

  const inviteUrl = "/bot?ref=dashboard";
  const canConfigure = Boolean(selectedGuildId);
  const activeVoiceConnections = status?.voice?.connections ?? [];
  const premium = settings.premium;
  const planLabel = planLabels[premium.plan] || "Free";
  const isPremiumActive = premium.enabled || premium.plan === "internal";
  const hasFeature = (feature: string) => Boolean(premium.features?.[feature]);

  function toggleLogEvent(eventId: string) {
    setSettings((current) => {
      const exists = current.logging.events.includes(eventId);
      return {
        ...current,
        logging: {
          ...current.logging,
          events: exists
            ? current.logging.events.filter((event) => event !== eventId)
            : [...current.logging.events, eventId],
        },
      };
    });
  }

  async function saveSettings(customSettings?: BotSettings) {
    if (!selectedGuildId) return;
    const settingsToSave = customSettings || settings;
    setSaving(true);
    setNotice("");
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/bot/settings?guildId=${selectedGuildId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsToSave),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setNotice("Settings saved. Your bot panel is updated.");
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      } else {
        setNotice(data?.error || "Could not save settings.");
      }
    } catch {
      setNotice("Network error while saving settings.");
    } finally {
      setSaving(false);
    }
  }

  const handleToggle = (path: string, value: any) => {
    setSettings(prev => {
      const newSettings = { ...prev };
      const parts = path.split('.');
      let current: any = newSettings;
      for (let i = 0; i < parts.length - 1; i++) {
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
      
      // Auto-save
      void saveSettings(newSettings);
      return newSettings;
    });
  };

  if (!guilds.length) {
    return (
      <section className="overflow-hidden rounded-[2rem] border border-orange-500/25 bg-gradient-to-br from-slate-950 via-slate-950 to-[#412711] p-6 shadow-2xl">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr] lg:items-center">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-200">VoxBridge Dashboard</div>
            <h2 className="mt-3 text-3xl font-black text-white">Connect a Discord server to unlock settings.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Add the VoxBridge translation bot to a server where you have Manage Server permission.
              Once Discord confirms the bot is installed, this dashboard will show live controls here.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a href="/bot?ref=dashboard" className="rounded-full bg-orange-600 px-6 py-3 text-center text-sm font-black text-white transition hover:bg-orange-700">
                Add Bot to Server
              </a>
              <a href="/support?topic=bot-premium" className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-center text-sm font-black text-slate-200 transition hover:bg-white/10">
                Request Premium Setup
              </a>
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-5">
            <div className="text-sm font-black text-white">What unlocks here</div>
            <div className="mt-4 grid gap-3">
              {modules.map((module) => (
                <div key={module.title} className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-black text-slate-100">{module.title}</span>
                    <span className="rounded-full border border-orange-300/20 bg-orange-300/10 px-2 py-1 text-[10px] font-black text-orange-200">{module.tier}</span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{module.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-xs leading-5 text-amber-100">
              Plans start at ${planPrices.starter}/mo. Live voice translation starts at ${planPrices.pro_voice}/mo.
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full max-w-full overflow-hidden rounded-[1.35rem] border border-orange-500/25 bg-gradient-to-br from-slate-950 via-slate-950 to-[#3a2010] shadow-2xl sm:rounded-[2rem]">
      <div className="border-b border-white/8 p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-200">VoxBridge Control</div>
            <h2 className="mt-2 text-3xl font-black text-white">Premium Discord bot dashboard</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Configure live translation, voice behavior, premium modules, and staff logs from one clean control center.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <a href={inviteUrl} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-center text-xs font-black text-slate-200 hover:bg-white/10">
              Add Another Server
            </a>
            <button
              id="save-button"
              type="button"
              onClick={() => saveSettings()}
              disabled={!canConfigure || saving}
              className={`group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-full px-8 font-black text-white transition-all hover:scale-[1.03] active:scale-95 disabled:opacity-50 ${saveSuccess ? "bg-emerald-600" : "bg-orange-600"}`}
            >
              <div className={`absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 ${saveSuccess ? "bg-emerald-500" : "bg-gradient-to-r from-orange-600 to-amber-600"}`} />
              <span className="relative">{saving ? "Deploying..." : saveSuccess ? "✓ Applied" : "Save Changes"}</span>
            </button>
          </div>
        </div>

        <div className="mt-5 grid min-w-0 gap-3 lg:grid-cols-[0.9fr_1.1fr]">
          <label id="guild-selector" className="block rounded-2xl border border-white/10 bg-black/25 p-4 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Managed Server</span>
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-lime-500 animate-pulse" />
                <span className="text-[8px] font-bold text-lime-400 uppercase tracking-tighter">Live Sync Active</span>
              </div>
            </div>
            <select
              value={selectedGuildId}
              onChange={(event) => setSelectedGuildId(event.target.value)}
              className="mt-3 h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none focus:border-orange-500 transition-colors"
            >
              {guilds.map((guild) => (
                <option key={guild.id} value={guild.id}>{guild.name}</option>
              ))}
            </select>
          </label>
          <div id="status-pills" className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Bot", status?.status || "unknown", statusTone(status?.status)],
              ["VC", `${status?.voice?.activeListeners ?? 0} active`, "border-orange-400/25 bg-orange-400/10 text-orange-300"],
              ["Deepgram", status?.deepgram?.configured ? "ready" : "check", status?.deepgram?.configured ? "border-lime-400/25 bg-lime-400/10 text-lime-300" : "border-amber-400/25 bg-amber-400/10 text-amber-300"],
              ["Uptime", formatUptime(status?.uptimeMs), "border-white/10 bg-white/[0.04] text-slate-300"],
            ].map(([label, value, tone]) => (
              <div key={label} className={`rounded-2xl border p-4 shadow-lg backdrop-blur-sm transition-transform hover:scale-[1.02] ${tone}`}>
                <div className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">{label}</div>
                <div className="mt-2 truncate text-sm font-black tracking-tight">{value}</div>
              </div>
            ))}
          </div>
        </div>
        {notice ? (
          <div className="mt-4 rounded-2xl border border-orange-300/20 bg-orange-300/10 px-4 py-3 text-sm text-orange-100">
            {notice}
          </div>
        ) : null}
        <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
          isPremiumActive
            ? "border-lime-400/20 bg-lime-400/10 text-lime-100"
            : "border-amber-400/20 bg-amber-400/10 text-amber-100"
        }`}>
          <span className="font-black">{planLabel}</span>
          {isPremiumActive
            ? ` active at $${premium.priceMonthlyUsd}/mo. Premium commands are unlocked according to this plan.`
            : ` access only. Premium voice features are locked until an admin enables Starter, Pro Voice, or Server Ops.`}
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 lg:grid-cols-[220px_1fr]">
        <aside id="navigation-tabs" className="border-b border-white/8 p-4 lg:border-b-0 lg:border-r">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-col lg:overflow-visible">
            {[
              ["overview", "Overview"],
              ["translation", "Translation"],
              ["voice", "Voice"],
              ["logs", "Logs"],
              ["ai", "AI Control"],
              ["premium", "Premium"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setActivePanel(id as typeof activePanel)}
                className={`group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-xs font-black transition-all sm:text-sm ${
                  activePanel === id 
                    ? "bg-orange-600 text-white shadow-[0_0_20px_rgba(249,115,22,0.4)]" 
                    : "bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                {activePanel === id && <div className="h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />}
                {label}
              </button>
            ))}
          </div>
        </aside>

        <div className="min-h-[460px] min-w-0 overflow-x-hidden p-3 sm:p-6">
          {loadingSettings ? (
            <div className="py-24 text-center text-sm font-black text-slate-500">Loading server configuration...</div>
          ) : null}

          {!loadingSettings && activePanel === "overview" && (
            <div className="grid min-w-0 gap-4 xl:grid-cols-[1fr_0.85fr]">
              <div className="min-w-0 rounded-3xl border border-white/10 bg-black/20 p-4 sm:p-5">
                <div className="flex min-w-0 items-center gap-4">
                  {selectedGuild?.icon ? (
                    <img
                      src={`https://cdn.discordapp.com/icons/${selectedGuild.id}/${selectedGuild.icon}.png?size=128`}
                      alt={selectedGuild.name}
                      className="h-16 w-16 rounded-2xl object-cover"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.style.display = "none";
                        const fallback = target.nextElementSibling as HTMLElement | null;
                        if (fallback) fallback.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div
                    className="h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/20 text-2xl font-black text-orange-100"
                    style={{ display: selectedGuild?.icon ? "none" : "flex" }}
                  >
                    {selectedGuild?.name?.[0] || "N"}
                  </div>
                  <div className="min-w-0">
                    <h3 className="break-words text-2xl font-black text-white">{selectedGuild?.name}</h3>
                    <p className="break-all text-sm text-slate-500">Server ID {selectedGuildId}</p>
                  </div>
                </div>
                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-5">
                    <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Bot Branding</div>
                    <label className="mt-4 block">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-200">Custom Display Name</span>
                      <input
                        type="text"
                        value={settings.botNickname}
                        onChange={(e) => setSettings({ ...settings, botNickname: e.target.value })}
                        placeholder="Leave blank for VoxBridge"
                        className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none focus:border-orange-500"
                      />
                      <p className="mt-2 text-[10px] text-slate-500 font-medium">The name the bot will use in this server. Leave blank to use the default global name.</p>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {modules.map((module) => {
                      const unlocked = hasFeature(module.feature);
                      return (
                      <div key={module.title} className={`rounded-2xl border p-4 ${unlocked ? "border-lime-400/20 bg-lime-400/10" : "border-white/8 bg-white/[0.04]"}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-black text-white">{module.title}</div>
                            <p className="mt-1 text-xs leading-5 text-slate-500">{module.desc}</p>
                          </div>
                          <span className={`rounded-full px-2 py-1 text-[10px] font-black ${unlocked ? "bg-lime-400/15 text-lime-300" : "bg-amber-400/15 text-amber-200"}`}>
                            {unlocked ? "ON" : "LOCKED"}
                          </span>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="min-w-0 rounded-3xl border border-white/10 bg-black/20 p-4 sm:p-5">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Command Surface</h3>
                <div className="mt-4 space-y-3">
                  {commandHighlights.map(([command, desc]) => (
                    <div key={command} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <div className="break-all font-mono text-sm font-black text-amber-200">{command}</div>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{desc}</p>
                    </div>
                  ))}
                </div>
                <h3 className="mt-6 text-sm font-black uppercase tracking-[0.2em] text-white">Live Voice Sessions</h3>
                <div className="mt-4 space-y-3">
                  {activeVoiceConnections.length ? activeVoiceConnections.map((connection) => (
                    <div key={`${connection.guildId}-${connection.voiceChannelName}`} className="rounded-2xl border border-orange-300/20 bg-orange-300/10 p-4">
                      <div className="font-black text-orange-100">{connection.voiceChannelName || "Voice channel"}</div>
                      <p className="mt-1 text-xs text-orange-100/70">{connection.connectionState} - translating to {connection.targetLang || "auto"}</p>
                    </div>
                  )) : (
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 text-sm leading-6 text-slate-500">
                      No live VC session is active right now. Use /vclisten or /vcauto in Discord to start one.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {!loadingSettings && activePanel === "translation" && (
            <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="min-w-0 rounded-3xl border border-white/10 bg-black/20 p-4 sm:p-5">
                <h3 className="text-xl font-black text-white">Translation defaults</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">Choose how this server handles typed and voice translations.</p>
                <div className="mt-6 space-y-4">
                  <div className="group relative flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.02] p-6 transition-all hover:bg-white/[0.04]">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-white text-lg">Enable translation commands</span>
                          <span className="rounded-full bg-lime-500/20 px-2 py-0.5 text-[8px] font-black text-lime-400 uppercase tracking-tighter">Verified Engine</span>
                        </div>
                        <span className="text-xs text-slate-500">Allow /nhtranslate, /vcauto, and /vclisten to function.</span>
                      </div>
                      <button
                        onClick={() => handleToggle('translation.enabled', !settings.translation.enabled)}
                        className={`relative h-7 w-12 rounded-full transition-colors duration-300 ${settings.translation.enabled ? "bg-orange-600" : "bg-slate-800"}`}
                      >
                        <div className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-lg transition-all duration-300 ${settings.translation.enabled ? "left-6" : "left-1"}`} />
                      </button>
                    </div>
                  </div>

                  <div className="group relative flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.02] p-6 transition-all hover:bg-white/[0.04]">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="block font-black text-white text-lg">Bot & Webhook Relay</span>
                        <span className="text-xs text-slate-500">Translate automated messages from other bots and webhooks.</span>
                      </div>
                      <button
                        onClick={() => handleToggle('translation.includeBotMessages', !settings.translation.includeBotMessages)}
                        className={`relative h-7 w-12 rounded-full transition-colors duration-300 ${settings.translation.includeBotMessages ? "bg-orange-600" : "bg-slate-800"}`}
                      >
                        <div className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-lg transition-all duration-300 ${settings.translation.includeBotMessages ? "left-6" : "left-1"}`} />
                      </button>
                    </div>
                  </div>
                </div>
                <label className="mt-4 block">
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Target language</span>
                  <select
                    value={settings.translation.targetLang}
                    onChange={(event) => setSettings({ ...settings, translation: { ...settings.translation, targetLang: event.target.value } })}
                    className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none focus:border-orange-500"
                  >
                    {languages.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className="mt-4 block">
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Channel allowlist</span>
                  <div className="mt-2 space-y-2">
                    {loadingChannels ? (
                      <div className="text-[10px] text-slate-500 animate-pulse">Fetching server channels...</div>
                    ) : guildChannels.length > 0 ? (
                      <div className="max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-slate-950 p-2 custom-scrollbar">
                        <div className="grid grid-cols-1 gap-1">
                          {guildChannels.filter(c => c.type === 0 || c.type === 5).map(channel => (
                            <label key={channel.id} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/5 cursor-pointer transition-colors">
                              <input
                                type="checkbox"
                                checked={settings.translation.channelIds.includes(channel.id)}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setSettings(s => ({
                                    ...s,
                                    translation: {
                                      ...s.translation,
                                      channelIds: checked 
                                        ? [...s.translation.channelIds, channel.id]
                                        : s.translation.channelIds.filter(id => id !== channel.id)
                                    }
                                  }));
                                }}
                                className="h-4 w-4 accent-orange-600"
                              />
                              <span className="text-sm font-bold text-slate-300 truncate">#{channel.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <textarea
                        value={settings.translation.channelIds.join("\n")}
                        onChange={(event) =>
                          setSettings({
                            ...settings,
                            translation: {
                              ...settings.translation,
                              channelIds: event.target.value
                                .split(/\r?\n|,/)
                                .map((value) => value.trim())
                                .filter(Boolean),
                            },
                          })}
                        placeholder={"Paste one Discord channel ID per line"}
                        rows={3}
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-700 focus:border-orange-500"
                      />
                    )}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {guildChannels.length > 0 ? "Select channels where auto text translation should be active." : "Leave empty to translate everywhere. Add channel IDs here to limit auto text translation to specific rooms only."}
                  </p>
                </label>
                <div className="mt-4 rounded-2xl border border-orange-300/20 bg-orange-300/10 p-4">
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-orange-100">Discord command</div>
                  <div className="mt-2 break-all font-mono text-sm font-black text-white">
                    /autotext mode:on language:{settings.translation.targetLang}{settings.translation.channelIds[0] ? " channel:YOUR_CHANNEL" : ""}{settings.translation.includeBotMessages ? " bot_messages:on" : ""}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-orange-100/75">
                    Server managers can toggle the same auto text system from Discord without opening the panel, and can target a specific channel when needed.
                  </p>
                </div>
              </div>
              <div className="min-w-0 rounded-3xl border border-orange-500/25 bg-orange-500/10 p-4 sm:p-5">
                <h3 className="text-xl font-black text-white">Smart auto mode</h3>
                <p className="mt-2 text-sm leading-6 text-orange-100/75">
                  Auto mode is designed for bilingual servers: English speech goes to Spanish, Spanish speech goes to English, and mixed phrases stay readable instead of being duplicated.
                </p>
                <div className="mt-5 grid gap-3">
                  {["Speaker-aware embeds", "Profanity-safe formatting", "Backoff protection for rate limits", "Deepgram stream monitoring"].map((item) => (
                    <div key={item} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm font-bold text-orange-100">{item}</div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!loadingSettings && activePanel === "voice" && (
            <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-3">
              {[
                ["Auto Text", "/autotext", "Turn live text translation on or off from Discord for this server.", "textTranslate"],
                ["Auto VC", "/vcauto", "Auto-detect EN/ES and post translations fast.", "liveVoice"],
                ["Listen Mode", "/vclisten", "Join the caller voice channel and translate to a target language.", "liveVoice"],
                ["Speak Mode", "/nhtranslate speak:true", "Speak translated text into VC for premium servers.", "spokenVoice"],
              ].map(([title, command, desc, feature]) => {
                const unlocked = hasFeature(feature);
                return (
                <div key={title} className={`min-w-0 rounded-3xl border p-4 sm:p-5 ${unlocked ? "border-orange-300/20 bg-orange-300/10" : "border-amber-300/20 bg-amber-300/10"}`}>
                  <div className="text-xl font-black text-white">{title}</div>
                  <div className="mt-3 break-all rounded-2xl bg-slate-950 px-4 py-3 font-mono text-sm font-black text-orange-200">{command}</div>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{desc}</p>
                  {!unlocked ? (
                    <p className="mt-3 rounded-2xl border border-amber-300/20 bg-black/20 px-3 py-2 text-xs font-bold text-amber-100">
                      Locked on this server. Upgrade to Pro Voice or Server Ops to use it.
                    </p>
                  ) : null}
                </div>
                );
              })}
            </div>
          )}

          {!loadingSettings && activePanel === "logs" && (
            <div className="min-w-0 rounded-3xl border border-white/10 bg-black/20 p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <h3 className="text-xl font-black text-white">Professional Discord logs</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">Choose which bot events should post clean branded embeds to your staff channel.</p>
                </div>
                <label className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-black text-white">
                  <input
                    type="checkbox"
                    checked={settings.logging.enabled}
                    onChange={(event) => handleToggle('logging.enabled', event.target.checked)}
                    className="h-5 w-5 accent-orange-600"
                  />
                  Logs enabled
                </label>
              </div>
              <label className="mt-5 block">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Staff log channel</span>
                <div className="mt-2">
                  {loadingChannels ? (
                    <div className="h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-4 flex items-center text-xs text-slate-500 animate-pulse">Fetching channels...</div>
                  ) : guildChannels.length > 0 ? (
                    <select
                      value={settings.logging.channelId}
                      onChange={(e) => setSettings({ ...settings, logging: { ...settings.logging, channelId: e.target.value } })}
                      className="h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none focus:border-orange-500"
                    >
                      <option value="">Select a channel</option>
                      {guildChannels.filter(c => c.type === 0 || c.type === 5).map(c => (
                        <option key={c.id} value={c.id}>#{c.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={settings.logging.channelId}
                      onChange={(event) => setSettings({ ...settings, logging: { ...settings.logging, channelId: event.target.value } })}
                      placeholder="Paste Discord channel ID"
                      className="h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none placeholder:text-slate-700 focus:border-orange-500"
                    />
                  )}
                </div>
              </label>
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {logEvents.map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleLogEvent(id)}
                    className={`rounded-2xl border p-4 text-left text-sm font-black transition ${
                      settings.logging.events.includes(id)
                        ? "border-lime-400/25 bg-lime-400/10 text-lime-200"
                        : "border-white/8 bg-white/[0.03] text-slate-500"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!loadingSettings && activePanel === "ai" && (
            <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="min-w-0 rounded-3xl border border-white/10 bg-black/20 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black text-white">AI Conversation</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-400">Enable autonomous AI chat responses in specific channels.</p>
                  </div>
                  <label className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                    <input
                      type="checkbox"
                      checked={settings.ai.enabled}
                      onChange={(event) => setSettings({ ...settings, ai: { ...settings.ai, enabled: event.target.checked } })}
                      className="h-6 w-6 accent-orange-600"
                    />
                  </label>
                </div>

                <div className="mt-6 space-y-4">
                  <label className="block">
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Personality Tone</span>
                    <select
                      value={settings.ai.tone}
                      onChange={(event) => setSettings({ ...settings, ai: { ...settings.ai, tone: event.target.value } })}
                      className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none focus:border-orange-500"
                    >
                      <option value="default">Default (Helpful)</option>
                      <option value="funny">Funny / Joker</option>
                      <option value="brat">Brat (Sassy Attitude)</option>
                      <option value="rude">Rude (Aggressive/Insulting)</option>
                      <option value="mean">Mean (Cold/Bully)</option>
                      <option value="whatever">Whatever Mood (Dismissive)</option>
                      <option value="professional">Professional</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">AI Frequency</span>
                    <select
                      value={settings.ai.frequency}
                      onChange={(event) => setSettings({ ...settings, ai: { ...settings.ai, frequency: event.target.value } })}
                      className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none focus:border-orange-500"
                    >
                      <option value="most">Most of the time (50% chance)</option>
                      <option value="sometimes">Sometimes (20% chance)</option>
                      <option value="rarely">Rarely (5% chance)</option>
                    </select>
                  </label>

                  <div className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 p-3">
                    <div>
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-orange-200">Bilingual Mode</span>
                      <p className="text-[10px] text-slate-500">Always reply in both English & Spanish.</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={settings.ai.bilingual}
                        onChange={(event) => handleToggle('ai.bilingual', event.target.checked)}
                        className="peer sr-only"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-slate-800 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-orange-600 peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">AI Enabled Channels</span>
                    <div className="mt-2 space-y-2">
                      {loadingChannels ? (
                        <div className="text-[10px] text-slate-500 animate-pulse">Fetching server channels...</div>
                      ) : guildChannels.length > 0 ? (
                        <div className="max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-slate-950 p-2 custom-scrollbar">
                          <div className="grid grid-cols-1 gap-1">
                            {guildChannels.filter(c => c.type === 0 || c.type === 5).map(channel => (
                              <label key={channel.id} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/5 cursor-pointer transition-colors">
                                <input
                                  type="checkbox"
                                  checked={settings.ai.channelIds.includes(channel.id)}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    const newChannels = checked 
                                      ? [...settings.ai.channelIds, channel.id]
                                      : settings.ai.channelIds.filter(id => id !== channel.id);
                                    handleToggle('ai.channelIds', newChannels);
                                  }}
                                  className="h-4 w-4 accent-indigo-600"
                                />
                                <span className="text-sm font-bold text-slate-300 truncate">#{channel.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <textarea
                          value={settings.ai.channelIds.join("\n")}
                          onChange={(event) =>
                            setSettings({
                              ...settings,
                              ai: {
                                ...settings.ai,
                                channelIds: event.target.value
                                  .split(/\r?\n|,/)
                                  .map((v) => v.trim())
                                  .filter(Boolean),
                              },
                            })
                          }
                          placeholder="One channel ID per line"
                          rows={4}
                          className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-700 focus:border-[#5865F2]"
                        />
                      )}
                    </div>
                  </label>
                </div>
              </div>

              <div className="min-w-0 rounded-3xl border border-orange-500/25 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.15),transparent)] p-4 sm:p-5">
                <h3 className="text-xl font-black text-white">AI Capabilities</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  VoxBridge AI uses Llama 3.1 to generate human-like responses. It can follow instructions based on the tone you set.
                </p>
                <div className="mt-5 space-y-3">
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                    <div className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">Funny Mode</div>
                    <p className="mt-1 text-sm text-slate-300">Crack jokes, use memes, and keep the server entertained.</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                    <div className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">Brat Mode</div>
                    <p className="mt-1 text-sm text-slate-300">Sassy replies, "ugh", "whatever", and peak attitude logic.</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                    <div className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">Commands</div>
                    <p className="mt-1 text-sm font-mono text-amber-200">/nhai mode:Enable tone:Brat</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!loadingSettings && activePanel === "premium" && (
            <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
              {modules.map((module) => {
                const unlocked = hasFeature(module.feature);
                return (
                <div key={module.title} className={`rounded-3xl border p-5 ${unlocked ? "border-emerald-400/25 bg-emerald-400/10" : "border-[#5865F2]/25 bg-[#5865F2]/10"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xl font-black text-white">{module.title}</div>
                      <p className="mt-2 text-sm leading-6 text-indigo-100/75">{module.desc}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-[10px] font-black ${unlocked ? "border-emerald-200/20 bg-emerald-200/10 text-emerald-100" : "border-indigo-200/20 bg-indigo-200/10 text-indigo-100"}`}>
                      {unlocked ? "Unlocked" : module.tier}
                    </span>
                  </div>
                </div>
                );
              })}
              <div className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-5 xl:col-span-2">
                <div className="text-xl font-black text-white">Upgrade pricing</div>
                <p className="mt-2 text-sm leading-6 text-amber-100/80">
                  Starter ${planPrices.starter}/mo for typed translation tools. Pro Voice ${planPrices.pro_voice}/mo for live VC and spoken translation. Server Ops ${planPrices.server_ops}/mo for logs, reliability, and priority setup.
                </p>
                {isAdminPanel ? (
                  <div className="mt-4 flex flex-col gap-2">
                    <div className="text-sm font-bold text-white">Admin Override Plan:</div>
                    <div className="flex flex-wrap gap-2">
                      {["locked", "free", "starter", "pro_voice", "server_ops", "internal"].map((planId) => (
                        <button
                          key={planId}
                          onClick={() => {
                            fetch("/api/admin/bot-premium", {
                              method: "PATCH",
                              headers: { "content-type": "application/json" },
                              body: JSON.stringify({ guildId: selectedGuildId, plan: planId }),
                            }).then(r => r.json()).then(d => {
                              if (d.ok) {
                                setSettings(s => ({ ...s, premium: d.premium }));
                                setNotice("Premium plan updated!");
                                setTimeout(() => setNotice(""), 3000);
                              } else {
                                setNotice(d.error || "Failed to update premium.");
                              }
                            });
                          }}
                          className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                            settings.premium?.plan === planId 
                              ? "bg-amber-400 text-slate-900" 
                              : "border border-amber-300/30 bg-amber-300/10 text-amber-200 hover:bg-amber-300/20"
                          }`}
                        >
                          {planId.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <a href="/support?topic=bot-premium" className="mt-4 inline-flex rounded-full bg-amber-300 px-5 py-2 text-xs font-black text-slate-950 transition hover:bg-amber-200">
                    Request premium setup
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
