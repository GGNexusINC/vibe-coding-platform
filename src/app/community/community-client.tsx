"use client";

import { useEffect, useRef, useState } from "react";
import { ArenaEventsWidget } from "./arena-events";

const GUILD_ID = "1419522458075005023";
const INVITE = "https://discord.gg/5Fcw9XSEeZ";
const WIDGET_URL = `https://discord.com/api/guilds/${GUILD_ID}/widget.json`;

// Static text channels to display (Discord widget doesn't expose text channels)
const TEXT_CHANNELS = [
  { emoji: "📢", name: "announcements",            desc: "Server news & updates" },
  { emoji: "💬", name: "general-chat",              desc: "Main community chat" },
  { emoji: "🤝", name: "equipos-teams",             desc: "Find teammates" },
  { emoji: "😂", name: "memes",                     desc: "Community memes" },
  { emoji: "📷", name: "fotos-photos",              desc: "Share screenshots" },
  { emoji: "🎬", name: "videos",                    desc: "Clips & highlights" },
  { emoji: "💡", name: "sugerencias-suggestions",   desc: "Ideas & feedback" },
  { emoji: "💵", name: "subscriptions",             desc: "Store & VIP info" },
  { emoji: "📖", name: "guias-guides",              desc: "Game guides" },
];

type WidgetMember = {
  id: string;
  username: string;
  avatar_url: string;
  status: string;
  channel_id?: string;
};

type WidgetChannel = {
  id: string;
  name: string;
  position: number;
};

type Widget = {
  id: string;
  name: string;
  instant_invite: string | null;
  presence_count: number;
  members: WidgetMember[];
  channels: WidgetChannel[];
};

type ActivityEntry = {
  id: string;
  type: string;
  username?: string;
  avatarUrl?: string;
  globalName?: string;
  createdAt: string;
  details: string;
};

type DiscordMessage = {
  id: string;
  channel_name: string;
  author_username: string;
  author_avatar: string | null;
  content: string;
  created_at: string;
};


// URLs we can render directly as <img>
const RENDERABLE_RE = /https?:\/\/(?:cdn\.discordapp\.com|media\.discordapp\.net|i\.giphy\.com|media\.tenor\.com|c\.tenor\.com|media1\.tenor\.com|media2\.tenor\.com|media3\.tenor\.com)\S+/gi;
// Image file extensions
const IMG_EXT_RE = /https?:\/\/\S+\.(?:png|jpg|jpeg|webp|gif)(?:[?#]\S*)?/gi;
// All URLs (for stripping from text)
const ANY_URL_RE = /https?:\/\/\S+/gi;

function extractRenderableUrls(text: string): string[] {
  const all: string[] = [];
  for (const re of [RENDERABLE_RE, IMG_EXT_RE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) all.push(m[0]);
  }
  return [...new Set(all)];
}

function renderContent(content: string) {
  const imageUrls = extractRenderableUrls(content);
  // Strip all URLs from displayed text
  ANY_URL_RE.lastIndex = 0;
  const textOnly = content.replace(ANY_URL_RE, "").trim();
  return (
    <>
      {textOnly && (
        <p className="text-sm text-slate-300 mt-0.5 break-all leading-relaxed overflow-hidden">{textOnly}</p>
      )}
      {imageUrls.map((url) => (
        <img
          key={url}
          src={url}
          alt="media"
          className="mt-1.5 max-w-full max-h-[200px] rounded-xl object-contain border border-white/8 bg-black/20"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      ))}
    </>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function DiscordIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 71 55" fill="currentColor">
      <path d="M60.1 4.9A58.5 58.5 0 0 0 45.5.4a.2.2 0 0 0-.2.1 40.7 40.7 0 0 0-1.8 3.7 54 54 0 0 0-16.2 0A37.4 37.4 0 0 0 25.4.5a.2.2 0 0 0-.2-.1A58.4 58.4 0 0 0 10.6 4.9a.2.2 0 0 0-.1.1C1.6 18.1-.9 31 .3 43.7a.2.2 0 0 0 .1.2 58.8 58.8 0 0 0 17.7 9 .2.2 0 0 0 .2-.1 42 42 0 0 0 3.6-5.9.2.2 0 0 0-.1-.3 38.7 38.7 0 0 1-5.5-2.6.2.2 0 0 1 0-.4c.4-.3.7-.6 1.1-.9a.2.2 0 0 1 .2 0c11.5 5.3 24 5.3 35.4 0a.2.2 0 0 1 .2 0l1.1.9a.2.2 0 0 1 0 .4 36.2 36.2 0 0 1-5.5 2.6.2.2 0 0 0-.1.3 47.1 47.1 0 0 0 3.6 5.9.2.2 0 0 0 .2.1 58.7 58.7 0 0 0 17.7-9 .2.2 0 0 0 .1-.2c1.5-14.9-2.5-27.8-10.5-39.2a.2.2 0 0 0-.1 0ZM23.7 36.2c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 4-2.8 7.2-6.4 7.2Zm23.7 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 4-2.8 7.2-6.4 7.2Z" />
    </svg>
  );
}

type WipeTimer = { wipeAt: string | null; label: string | null };

function useWipeTimer() {
  const [wipe, setWipe] = useState<WipeTimer>({ wipeAt: null, label: null });
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    fetch("/api/admin/wipe-timer")
      .then(r => r.json())
      .then(d => { if (d.ok) setWipe({ wipeAt: d.wipeAt, label: d.label }); })
      .catch(() => {});
    const poll = setInterval(() => {
      fetch("/api/admin/wipe-timer")
        .then(r => r.json())
        .then(d => { if (d.ok) setWipe({ wipeAt: d.wipeAt, label: d.label }); })
        .catch(() => {});
    }, 60000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(poll); clearInterval(tick); };
  }, []);

  if (!wipe.wipeAt) return null;
  const ms = new Date(wipe.wipeAt).getTime() - now;
  if (ms < -86400000) return null; // hide if >1 day past
  return { ms, label: wipe.label ?? "Server Wipe" };
}

function WipeCountdown({ ms, label }: { ms: number; label: string }) {
  const past = ms <= 0;
  const abs = Math.abs(ms);
  const d = Math.floor(abs / 86400000);
  const h = Math.floor((abs % 86400000) / 3600000);
  const m = Math.floor((abs % 3600000) / 60000);
  const s = Math.floor((abs % 60000) / 1000);
  const parts = d > 0 ? [`${d}d`, `${h}h`, `${m}m`] : h > 0 ? [`${h}h`, `${m}m`, `${s}s`] : [`${m}m`, `${s}s`];
  const urgent = !past && ms < 3600000;
  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-2xl border px-5 py-3 ${
      past ? "border-slate-500/30 bg-slate-500/10" :
      urgent ? "border-rose-500/40 bg-rose-500/10 animate-pulse" :
      "border-amber-400/30 bg-amber-400/8"
    }`}>
      <span className="text-xl">{past ? "💥" : urgent ? "🔴" : "⏳"}</span>
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</div>
        <div className={`text-lg font-black tabular-nums ${past ? "text-slate-400" : urgent ? "text-rose-300" : "text-amber-300"}`}>
          {past ? "WIPED" : parts.join(" ")}
        </div>
      </div>
    </div>
  );
}

export default function CommunityClient() {
  const wipeTimer = useWipeTimer();
  const [widget, setWidget] = useState<Widget | null>(null);
  const [widgetError, setWidgetError] = useState(false);
  const [feed, setFeed] = useState<ActivityEntry[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // User session for Arena Events
  const [session, setSession] = useState<{ discord_id?: string; username?: string; avatar_url?: string } | null>(null);

  // Discord messages
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [channelList, setChannelList] = useState<string[]>([]);
  const [messages, setMessages] = useState<DiscordMessage[]>([]);
  const [msgLoading, setMsgLoading] = useState(true);
  const [noBotYet, setNoBotYet] = useState(false);
  const msgBottomRef = useRef<HTMLDivElement>(null);
  const lastMsgCount = useRef(0);
  const isFirstLoad = useRef(true);

  async function loadWidget() {
    try {
      const res = await fetch(WIDGET_URL);
      if (!res.ok) { setWidgetError(true); return; }
      const data: Widget = await res.json();
      setWidget(data);
      setWidgetError(false);
      setLastRefresh(new Date());
    } catch {
      setWidgetError(true);
    }
  }

  async function loadFeed() {
    const res = await fetch("/api/admin/stats").catch(() => null);
    if (!res?.ok) { setFeedLoading(false); return; }
    const data = await res.json().catch(() => null);
    if (data?.ok) setFeed((data.recent ?? []).slice(0, 25));
    setFeedLoading(false);
  }

  async function loadChannels() {
    const res = await fetch("/api/discord/messages?channels=1").catch(() => null);
    if (!res?.ok) return;
    const data = await res.json().catch(() => null);
    const chs: string[] = data?.channels ?? [];
    if (chs.length > 0) setChannelList(chs);
  }

  async function loadSession() {
    const res = await fetch("/api/session").catch(() => null);
    if (!res?.ok) return;
    const data = await res.json().catch(() => null);
    if (data?.ok) setSession(data.user ?? null);
  }

  async function loadMessages(channel: string | null, isRefresh = false) {
    const url = channel
      ? `/api/discord/messages?channel=${encodeURIComponent(channel)}&limit=60`
      : `/api/discord/messages?limit=60`;
    const res = await fetch(url).catch(() => null);
    if (!res?.ok) { if (!isRefresh) setMsgLoading(false); return; }
    const data = await res.json().catch(() => null);
    const msgs: DiscordMessage[] = data?.messages ?? [];
    const prevCount = lastMsgCount.current;
    lastMsgCount.current = msgs.length;
    setMessages(msgs);
    setNoBotYet(msgs.length === 0);
    setMsgLoading(false);
    // Only scroll on first load or when new messages arrive
    if (isFirstLoad.current || msgs.length > prevCount) {
      isFirstLoad.current = false;
      setTimeout(() => msgBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    }
  }

  // Keep activeChannel accessible in interval without re-registering
  const activeChannelRef = useRef<string | null>(null);
  activeChannelRef.current = activeChannel;

  useEffect(() => {
    void loadWidget();
    void loadFeed();
    void loadChannels();
    void loadMessages(null);
    void loadSession();
    const wt = window.setInterval(() => void loadWidget(), 30000);
    const ft = window.setInterval(() => void loadFeed(), 15000);
    const mt = window.setInterval(() => {
      void loadMessages(activeChannelRef.current, true);
      void loadChannels();
    }, 10000);
    return () => { window.clearInterval(wt); window.clearInterval(ft); window.clearInterval(mt); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload messages when channel tab changes (show loading only, keep old msgs until new arrive)
  useEffect(() => {
    isFirstLoad.current = true;
    lastMsgCount.current = 0;
    setMsgLoading(true);
    void loadMessages(activeChannel);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChannel]);

  // Group voice members by channel
  const voiceChannels = widget?.channels
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((ch) => ({
      ...ch,
      members: (widget.members ?? []).filter((m) => m.channel_id === ch.id),
    })) ?? [];

  // Online members not in voice
  const onlineNotInVoice = (widget?.members ?? []).filter((m) => !m.channel_id);

  const presenceCount = widget?.presence_count ?? 0;

  return (
    <div className="relative mx-auto w-full max-w-6xl px-3 sm:px-4 py-8 sm:py-12 overflow-x-hidden">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,rgba(88,101,242,0.12),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_80%,rgba(88,101,242,0.06),transparent_50%)]" />

      <div className="relative">
        {/* Header */}
        <div className="rz-chip mb-3 sm:mb-4 text-xs sm:text-sm">🎮 Community Hub</div>
        
        {/* Title and online - stacked on mobile, side by side on desktop */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0 overflow-hidden">
            <h1 className="text-xl sm:text-4xl font-black text-white leading-tight truncate">
              NewHopeGGN <span className="text-[#5865F2]">Discord</span>
            </h1>
            <p className="mt-1 text-slate-400 text-xs sm:text-sm">Live server activity — auto-refreshes every 30s</p>
          </div>

          {/* Live stats pills */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 self-start sm:self-auto">
            <div className="flex items-center gap-1.5 sm:gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 sm:px-4 py-1.5 sm:py-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-emerald-300 whitespace-nowrap">{presenceCount} Online</span>
            </div>
          </div>
        </div>

        {/* Join button */}
        <a
          href={INVITE}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 sm:mt-5 inline-flex h-10 sm:h-12 items-center gap-2 rounded-xl sm:rounded-2xl bg-[#5865F2] px-4 sm:px-7 text-xs sm:text-sm font-bold text-white hover:bg-[#4752c4] active:scale-95 transition-all shadow-[0_0_20px_rgba(88,101,242,0.4)]"
        >
          <DiscordIcon />
          <span className="sm:hidden">Join Discord</span>
          <span className="hidden sm:inline">Join Our Discord</span>
        </a>

        {/* Wipe Timer */}
        {wipeTimer && (
          <div className="mt-5">
            <WipeCountdown ms={wipeTimer.ms} label={wipeTimer.label} />
          </div>
        )}

        {/* Widget disabled notice */}
        {widgetError && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-300">
            ⚠️ Live voice data unavailable — enable Server Widget in Discord Server Settings → Widget
          </div>
        )}

        {/* ── Arena Events (full-width, above grid) ── */}
        <div className="mt-6 sm:mt-8">
          <ArenaEventsWidget session={session} />
        </div>

        <div className="mt-4 sm:mt-5 grid gap-4 sm:gap-5 lg:grid-cols-[220px_1fr_220px] items-start">

          {/* ── Left: Text Channels ── */}
          <div className="space-y-4 order-2 lg:order-1">
            <div className="rz-surface rz-panel-border rounded-[2rem] p-4 sm:p-5">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3 flex items-center gap-2">
                <span className="text-[#5865F2]">#</span> Text Channels
              </div>
              <div className="space-y-0.5">
                {TEXT_CHANNELS.map((ch) => (
                  <a
                    key={ch.name}
                    href={INVITE}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 hover:bg-white/5 transition group cursor-pointer"
                  >
                    <span className="text-base w-5 text-center shrink-0">{ch.emoji}</span>
                    <div className="min-w-0">
                      <div className="text-sm text-slate-300 group-hover:text-white truncate">#{ch.name}</div>
                      <div className="text-[10px] text-slate-600 truncate">{ch.desc}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* ── Center: Voice Channels (live) + Discord Messages + Activity Feed ── */}
          <div className="space-y-4 sm:space-y-5 order-1 lg:order-2">

            {/* Voice Channels */}
            <div className="rz-surface rz-panel-border rounded-[2rem] p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                  <span className="text-emerald-400">🔊</span> Voice Channels
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-emerald-400 font-semibold">LIVE</span>
                </div>
              </div>

              {!widget && !widgetError && (
                <div className="text-xs text-slate-500 animate-pulse">Loading voice channels...</div>
              )}

              {widgetError && (
                <div className="text-xs text-slate-500 italic">Voice data unavailable. Enable Discord Server Widget to see live members.</div>
              )}

              {widget && voiceChannels.length === 0 && (
                <div className="text-xs text-slate-500">No voice channels found in widget data.</div>
              )}

              <div className="space-y-2">
                {voiceChannels.map((ch) => (
                  <div key={ch.id} className={`rounded-2xl border px-3 py-2.5 transition-all ${
                    ch.members.length > 0
                      ? "border-emerald-500/25 bg-emerald-500/5"
                      : "border-white/6 bg-slate-950/30"
                  }`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-sm ${ch.members.length > 0 ? "text-emerald-400" : "text-slate-500"}`}>🔊</span>
                      <span className={`text-sm font-semibold ${ch.members.length > 0 ? "text-white" : "text-slate-400"}`}>{ch.name}</span>
                      {ch.members.length > 0 && (
                        <span className="ml-auto text-[10px] font-bold text-emerald-400 bg-emerald-500/15 rounded-full px-2 py-0.5">
                          {ch.members.length} in call
                        </span>
                      )}
                      {ch.members.length === 0 && (
                        <span className="ml-auto text-[10px] text-slate-600">empty</span>
                      )}
                    </div>
                    {ch.members.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {ch.members.map((mem) => (
                          <div key={mem.id} className="flex items-center gap-1.5 rounded-full bg-black/30 border border-white/8 px-2 py-1 max-w-full">
                            <img
                              src={mem.avatar_url}
                              alt={mem.username}
                              className="h-5 w-5 rounded-full object-cover shrink-0"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                            <span className="text-[11px] text-slate-200 font-medium truncate max-w-[80px]">{mem.username}</span>
                            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                              mem.status === "online" ? "bg-emerald-400" :
                              mem.status === "idle"   ? "bg-amber-400"   :
                              mem.status === "dnd"    ? "bg-rose-500"    : "bg-slate-500"
                            }`} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Discord Messages */}
            <div className="relative rz-panel-border rounded-[2rem] p-5 overflow-hidden">
              {/* Video background */}
              <video
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 w-full h-full object-cover opacity-10 pointer-events-none"
                src="/AZ2Xd1Tx6lhyVmCtVBpXGQ-AZ2Xd1TxHNndMCl7LDOOBg.mp4"
              />
              {/* Dark overlay so text stays readable */}
              <div className="absolute inset-0 bg-slate-950/80 pointer-events-none" />
              {/* Content sits above video */}
              <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[#5865F2] font-bold text-base">#</span>
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Discord Messages</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#5865F2] animate-pulse" />
                  <span className="text-[10px] text-[#5865F2] font-semibold">LIVE</span>
                </div>
              </div>

              {/* Channel tabs */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                <button
                  onClick={() => setActiveChannel(null)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${
                    activeChannel === null
                      ? "bg-[#5865F2] text-white"
                      : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  All
                </button>
                {channelList.filter(ch => !ch.toLowerCase().includes("ticket")).slice(0, 6).map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setActiveChannel(ch)}
                    className={`rounded-full px-2 py-1 text-[10px] font-semibold transition-all truncate max-w-[100px] ${
                      activeChannel === ch
                        ? "bg-[#5865F2] text-white"
                        : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    #{ch}
                  </button>
                ))}
                {channelList.length > 6 && (
                  <span className="text-[10px] text-slate-600 self-center">+{channelList.length - 6} more</span>
                )}
              </div>

              {/* Message list - fixed height prevents layout shifts */}
              <div className="overflow-y-auto max-h-[420px] min-h-[120px] space-y-2 pr-1">
                {msgLoading && messages.length === 0 && (
                  <div className="text-xs text-slate-500 animate-pulse py-4 text-center">Loading messages...</div>
                )}
                {!msgLoading && noBotYet && (
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-5 text-center">
                    <div className="text-2xl mb-2">🤖</div>
                    <div className="text-xs font-semibold text-amber-300 mb-1">No messages yet</div>
                    <div className="text-[11px] text-slate-500">Messages from Discord will appear here once members start chatting.</div>
                  </div>
                )}
                {!msgLoading && messages.filter(msg => !msg.channel_name?.toLowerCase().includes("ticket")).map((msg) => (
                  <div key={msg.id} className="flex items-start gap-2.5 group hover:bg-white/[0.02] rounded-xl px-2 py-1.5 transition overflow-hidden">
                    {msg.author_avatar ? (
                      <img
                        src={msg.author_avatar}
                        alt={msg.author_username}
                        className="h-8 w-8 rounded-full object-cover shrink-0 mt-0.5"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-[#5865F2]/20 flex items-center justify-center text-xs font-bold text-[#7289da] shrink-0 mt-0.5">
                        {msg.author_username[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex items-baseline gap-2 flex-wrap overflow-hidden">
                        <span className="text-xs font-bold text-white truncate max-w-[120px]">{msg.author_username}</span>
                        {!activeChannel && (
                          <span className="text-[10px] text-[#5865F2] font-semibold truncate max-w-[80px]">#{msg.channel_name}</span>
                        )}
                        <span className="text-[10px] text-slate-600 shrink-0">{timeAgo(msg.created_at)}</span>
                      </div>
                      {renderContent(msg.content)}
                    </div>
                  </div>
                ))}
                <div ref={msgBottomRef} />
              </div>
              </div>{/* end relative z-10 */}
            </div>
          </div>

          {/* ── Right: Online members ── */}
          <div className="space-y-4 order-3 lg:order-3">
            <div className="rz-surface rz-panel-border rounded-[2rem] p-4 sm:p-5">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3 sm:mb-4">
                Members Online — <span className="text-emerald-400">{presenceCount}</span>
              </div>

              {!widget && !widgetError && (
                <div className="text-xs text-slate-500 animate-pulse">Loading...</div>
              )}

              {onlineNotInVoice.length > 0 && (
                <div className="space-y-2 mb-4">
                  {onlineNotInVoice.map((m) => (
                    <div key={m.id} className="flex items-center gap-2.5">
                      <div className="relative shrink-0">
                        <img
                          src={m.avatar_url}
                          alt={m.username}
                          className="h-8 w-8 rounded-full object-cover"
                          onError={(e) => {
                            const el = e.target as HTMLImageElement;
                            el.style.display = "none";
                          }}
                        />
                        <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-slate-950 ${
                          m.status === "online" ? "bg-emerald-400" :
                          m.status === "idle"   ? "bg-amber-400"   :
                          m.status === "dnd"    ? "bg-rose-500"    : "bg-slate-500"
                        }`} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-white truncate">{m.username}</div>
                        <div className={`text-[10px] capitalize ${
                          m.status === "online" ? "text-emerald-400" :
                          m.status === "idle"   ? "text-amber-400"   :
                          m.status === "dnd"    ? "text-rose-400"    : "text-slate-500"
                        }`}>{m.status ?? "online"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {widget && onlineNotInVoice.length === 0 && (
                <div className="text-xs text-slate-500 mb-4">
                  {presenceCount > 0 ? `${presenceCount} members online (in voice channels)` : "No members online right now."}
                </div>
              )}

              {/* Stats */}
              <div className="pt-4 border-t border-white/8 grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-white/8 bg-slate-950/50 px-3 py-2.5 text-center">
                  <div className="text-xl font-black text-emerald-400">{presenceCount}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Online Now</div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-slate-950/50 px-3 py-2.5 text-center">
                  <div className="text-xl font-black text-[#5865F2]">{voiceChannels.filter(c => c.members.length > 0).length}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Active VCs</div>
                </div>
              </div>

              {/* Join CTA */}
              <a
                href={INVITE}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center justify-center gap-2 w-full rounded-2xl border border-[#5865F2]/40 bg-[#5865F2]/10 px-4 py-2.5 text-sm font-semibold text-[#7289da] hover:bg-[#5865F2]/20 transition"
              >
                <DiscordIcon />
                Join Server
              </a>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
