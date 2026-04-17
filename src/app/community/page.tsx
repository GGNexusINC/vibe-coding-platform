"use client";

import { useEffect, useState } from "react";

type ActivityEntry = {
  id: string;
  type: string;
  username?: string;
  avatarUrl?: string;
  globalName?: string;
  createdAt: string;
  details: string;
};

type MemberSummary = {
  discordId: string;
  username: string;
  globalName?: string | null;
  avatarUrl?: string;
  activeNow: boolean;
  lastActiveAt: string;
  events: number;
};

const CHANNELS = [
  { emoji: "💬", name: "General-Chat", desc: "Main community chat" },
  { emoji: "🤝", name: "Equipos-Teams", desc: "Find teammates" },
  { emoji: "😂", name: "Memes", desc: "Community memes" },
  { emoji: "📷", name: "Fotos-Photos", desc: "Share screenshots" },
  { emoji: "🎬", name: "Videos", desc: "Clips & highlights" },
  { emoji: "💡", name: "Sugerencias-Suggestions", desc: "Ideas & feedback" },
  { emoji: "💵", name: "subscriptions", desc: "Store & VIP info" },
  { emoji: "📖", name: "Guias-Guides", desc: "Game guides" },
  { emoji: "😴", name: "AFK", desc: "Away from keyboard" },
];

const SUPPORT_CHANNELS = [
  { emoji: "🔧", name: "SoporteSupport-1", vc: false },
  { emoji: "🔧", name: "SoporteSupport-2", vc: false },
  { emoji: "🔊", name: "Soporte/Support-1", vc: true },
  { emoji: "🔊", name: "Soporte/Support-2", vc: true },
];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function CommunityPage() {
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [feed, setFeed] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/admin/stats").catch(() => null);
    if (!res?.ok) { setLoading(false); return; }
    const data = await res.json().catch(() => null);
    if (!data?.ok) { setLoading(false); return; }
    setMembers(data.summary?.members ?? []);
    setFeed((data.recent ?? []).slice(0, 30));
    setLoading(false);
  }

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 15000);
    return () => window.clearInterval(t);
  }, []);

  const activeMembers = members.filter((m) => m.activeNow);
  const recentLogins = feed.filter((e) => e.type === "login").slice(0, 10);

  return (
    <div className="relative mx-auto w-full max-w-6xl px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,rgba(88,101,242,0.12),transparent_55%)]" />

      <div className="rz-chip mb-4">🎮 Community Hub</div>
      <h1 className="text-4xl font-bold text-white">NewHopeGGN <span className="text-[#5865F2]">Discord</span></h1>
      <p className="mt-2 text-slate-400">Live activity from our Discord community. Join us!</p>

      <a
        href="https://discord.gg/newhopeggn"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex h-11 items-center gap-2 rounded-2xl bg-[#5865F2] px-6 text-sm font-semibold text-white hover:bg-[#4752c4] transition"
      >
        <svg width="18" height="18" viewBox="0 0 71 55" fill="currentColor"><path d="M60.1 4.9A58.5 58.5 0 0 0 45.5.4a.2.2 0 0 0-.2.1 40.7 40.7 0 0 0-1.8 3.7 54 54 0 0 0-16.2 0A37.4 37.4 0 0 0 25.4.5a.2.2 0 0 0-.2-.1A58.4 58.4 0 0 0 10.6 4.9a.2.2 0 0 0-.1.1C1.6 18.1-.9 31 .3 43.7a.2.2 0 0 0 .1.2 58.8 58.8 0 0 0 17.7 9 .2.2 0 0 0 .2-.1 42 42 0 0 0 3.6-5.9.2.2 0 0 0-.1-.3 38.7 38.7 0 0 1-5.5-2.6.2.2 0 0 1 0-.4c.4-.3.7-.6 1.1-.9a.2.2 0 0 1 .2 0c11.5 5.3 24 5.3 35.4 0a.2.2 0 0 1 .2 0l1.1.9a.2.2 0 0 1 0 .4 36.2 36.2 0 0 1-5.5 2.6.2.2 0 0 0-.1.3 47.1 47.1 0 0 0 3.6 5.9.2.2 0 0 0 .2.1 58.7 58.7 0 0 0 17.7-9 .2.2 0 0 0 .1-.2c1.5-14.9-2.5-27.8-10.5-39.2a.2.2 0 0 0-.1 0ZM23.7 36.2c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 4-2.8 7.2-6.4 7.2Zm23.7 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 4-2.8 7.2-6.4 7.2Z"/></svg>
        Join Discord
      </a>

      <div className="mt-10 grid gap-6 lg:grid-cols-[280px_1fr_280px]">

        {/* Left — Channel list */}
        <div className="rz-surface rz-panel-border rounded-[2rem] p-5">
          <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3"># Channels</div>
          <div className="space-y-1">
            {CHANNELS.map((ch) => (
              <div key={ch.name} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-white/5 transition cursor-default group">
                <span className="text-base w-5 text-center">{ch.emoji}</span>
                <div>
                  <div className="text-sm text-slate-200 group-hover:text-white">{ch.name}</div>
                  <div className="text-xs text-slate-500">{ch.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-white/8">
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">🛠️ Soporte-Support</div>
            <div className="space-y-1">
              {SUPPORT_CHANNELS.map((ch) => (
                <div key={ch.name} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-white/5 transition cursor-default">
                  <span className="text-sm">{ch.vc ? "🔊" : "#"}</span>
                  <span className="text-sm text-slate-300">{ch.name}</span>
                  {ch.vc && <span className="ml-auto text-xs text-slate-500">VC</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center — Live Feed */}
        <div className="rz-surface rz-panel-border rounded-[2rem] p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">Live Activity Feed</div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-400">Live</span>
            </div>
          </div>

          {loading ? (
            <div className="text-sm text-slate-400">Loading...</div>
          ) : feed.length === 0 ? (
            <div className="text-sm text-slate-500">No recent activity.</div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[520px] pr-1">
              {feed.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 rounded-2xl border border-white/6 bg-slate-950/50 px-3 py-2.5">
                  {entry.avatarUrl ? (
                    <img src={entry.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover shrink-0 mt-0.5" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-xs text-slate-300 shrink-0 mt-0.5">
                      {(entry.globalName || entry.username || "?")[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white truncate">{entry.globalName || entry.username}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        entry.type === "login" ? "bg-emerald-500/15 text-emerald-300" :
                        entry.type === "logout" ? "bg-slate-500/15 text-slate-300" :
                        entry.type === "support_ticket" ? "bg-amber-500/15 text-amber-300" :
                        entry.type === "purchase_intent" ? "bg-cyan-500/15 text-cyan-300" :
                        "bg-violet-500/15 text-violet-300"
                      }`}>
                        {entry.type.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 truncate">{entry.details}</div>
                  </div>
                  <div className="text-xs text-slate-500 shrink-0">{timeAgo(entry.createdAt)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right — Who's Online */}
        <div className="rz-surface rz-panel-border rounded-[2rem] p-5">
          <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
            Online — {activeMembers.length}
          </div>

          {activeMembers.length === 0 ? (
            <div className="text-xs text-slate-500">No one active right now.</div>
          ) : (
            <div className="space-y-2">
              {activeMembers.map((m) => (
                <div key={m.discordId} className="flex items-center gap-2.5">
                  <div className="relative shrink-0">
                    {m.avatarUrl ? (
                      <img src={m.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs text-emerald-300 font-bold">
                        {(m.globalName || m.username)[0]?.toUpperCase()}
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-slate-950" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm text-white truncate">{m.globalName || m.username}</div>
                    <div className="text-xs text-slate-500">Active now</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-white/8">
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Recent Logins</div>
            <div className="space-y-2">
              {recentLogins.map((e) => (
                <div key={e.id} className="flex items-center gap-2">
                  {e.avatarUrl ? (
                    <img src={e.avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-slate-700 flex items-center justify-center text-xs text-slate-300">
                      {(e.globalName || e.username || "?")[0]?.toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs text-slate-300 truncate">{e.globalName || e.username}</span>
                  <span className="ml-auto text-xs text-slate-500">{timeAgo(e.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="mt-5 pt-4 border-t border-white/8 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/8 bg-slate-950/50 px-3 py-2 text-center">
              <div className="text-xl font-bold text-emerald-400">{activeMembers.length}</div>
              <div className="text-xs text-slate-400">Online</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-slate-950/50 px-3 py-2 text-center">
              <div className="text-xl font-bold text-cyan-400">{members.length}</div>
              <div className="text-xs text-slate-400">Members</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
