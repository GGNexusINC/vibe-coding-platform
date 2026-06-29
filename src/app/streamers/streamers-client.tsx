"use client";

import { useEffect, useState, useMemo } from "react";

type StreamerEntry = {
  id: string;
  discordId: string;
  username: string;
  avatarUrl?: string | null;
  streamUrl: string;
  streamTitle: string;
  platform: string;
  status: string;
};

type StreamLink = {
  id: string;
  url: string;
  title: string;
  platform: string;
};

type GroupedStreamer = {
  discordId: string;
  username: string;
  avatarUrl?: string | null;
  links: StreamLink[];
};

function getTwitchEmbedUrl(url: string) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("twitch.tv")) {
      const channel = u.pathname.replace("/", "").split("/")[0];
      if (channel) return `https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}&autoplay=false`;
    }
  } catch {}
  return null;
}

function getYoutubeEmbedUrl(url: string) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      const v = u.searchParams.get("v") || u.pathname.replace("/", "");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
  } catch {}
  return null;
}

export default function StreamersClient() {
  const [entries, setEntries] = useState<StreamerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLink, setActiveLink] = useState<{ url: string; platform: string; title: string } | null>(null);
  const [avatarErrors, setAvatarErrors] = useState<Record<string, boolean>>({});

  const [applyMode, setApplyMode] = useState(false);
  const [streamUrl, setStreamUrl] = useState("");
  const [streamTitle, setStreamTitle] = useState("");
  const [platform, setPlatform] = useState("twitch");
  const [applyStatus, setApplyStatus] = useState("");
  const [applyError, setApplyError] = useState("");
  const [applyLoading, setApplyLoading] = useState(false);

  useEffect(() => {
    void fetch("/api/streamers")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setEntries(d.streamers); setLoading(false); });
  }, []);

  const groupedStreamers = useMemo(() => {
    const groups: Record<string, GroupedStreamer> = {};
    entries.forEach(e => {
      if (!groups[e.discordId]) {
        groups[e.discordId] = { discordId: e.discordId, username: e.username, avatarUrl: e.avatarUrl, links: [] };
      }
      try {
        const parsed = JSON.parse(e.streamUrl);
        if (Array.isArray(parsed)) {
          parsed.forEach((link: any, idx: number) => {
            if (!groups[e.discordId].links.some(l => l.url === link.url)) {
              groups[e.discordId].links.push({ id: `${e.id}-${idx}`, url: link.url, title: link.title || e.streamTitle, platform: link.platform || e.platform });
            }
          });
        } else throw new Error();
      } catch {
        if (e.streamUrl && !groups[e.discordId].links.some(l => l.url === e.streamUrl)) {
          groups[e.discordId].links.push({ id: e.id, url: e.streamUrl, title: e.streamTitle, platform: e.platform });
        }
      }
    });
    return Object.values(groups);
  }, [entries]);

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    setApplyLoading(true);
    setApplyError("");
    setApplyStatus("");
    const res = await fetch("/api/streamers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ streamUrl, streamTitle, platform }),
    });
    const data = await res.json().catch(() => ({}));
    setApplyLoading(false);
    if (!res.ok) setApplyError(data?.error || "Could not submit application.");
    else {
      setApplyStatus("Link submitted! You can add another below.");
      setStreamUrl("");
      setStreamTitle("");
      void fetch("/api/streamers").then(r => r.json()).then(d => { if (d.ok) setEntries(d.streamers); });
    }
  }

  const getEmbedUrl = (url: string, platform: string) => {
    if (platform === "twitch") return getTwitchEmbedUrl(url);
    if (platform === "youtube") return getYoutubeEmbedUrl(url);
    return null;
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "twitch": return "👾";
      case "youtube": return "🔴";
      case "kick": return "🟢";
      case "discord": return (
        <svg
          className="w-[1.25em] h-[1.25em] inline-block align-middle fill-current"
          viewBox="0 0 127.14 96.36"
          style={{ fill: "#5865F2" }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,52.8,6.83,77.19,77.19,0,0,0,49.5,0,105.15,105.15,0,0,0,19.06,8.07C2.75,32.33-1.69,55.95,.53,79.12a105.29,105.29,0,0,0,32.44,17.24,80.12,80.12,0,0,0,6.86-11.45,68.49,68.49,0,0,1-10.87-5.3c.92-.68,1.83-1.39,2.7-2.12a75.14,75.14,0,0,0,71.18,0c.87,.73,1.78,1.44,2.7,2.12a68.49,68.49,0,0,1-10.87,5.3,80.12,80.12,0,0,0,6.86,11.45,105.29,105.29,0,0,0,32.44-17.24C129.47,48.29,124.62,24.89,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z" />
        </svg>
      );
      case "tiktok": return "📱";
      case "twitter":
      case "x": return "✖️";
      case "instagram": return "📸";
      case "facebook": return "🔵";
      default: return "🔗";
    }
  };

  return (
    <div className="relative mx-auto w-full max-w-6xl px-4 py-8 sm:py-12 overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(139,92,246,0.1),transparent_60%)]" />

      <div className="relative">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="max-w-2xl">
            <div className="rz-chip mb-4">📺 Streamers</div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Community Creators</h1>
            <p className="mt-2 text-sm sm:text-base text-slate-400">Discover and watch our community members across all platforms.</p>
          </div>
          <button
            onClick={() => { setApplyMode(!applyMode); setApplyStatus(""); setApplyError(""); }}
            className="w-full sm:w-auto h-11 rounded-2xl border border-violet-400/25 bg-violet-500/10 px-5 text-sm font-semibold text-violet-200 transition hover:bg-violet-500/20"
          >
            {applyMode ? "Close Panel" : "Add Your Links"}
          </button>
        </div>

        {/* Application Panel */}
        {applyMode && (
          <div className="mt-8 grid gap-6 lg:grid-cols-2 animate-in fade-in slide-in-from-top-4 duration-300">
            <form onSubmit={handleApply} className="rz-surface rz-panel-border rounded-[1.5rem] sm:rounded-[2rem] p-5 sm:p-8 grid gap-5">
              <div>
                <div className="text-lg font-bold text-white">Share Your Socials</div>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">Submit your platforms for review. Each link is added to your profile.</p>
              </div>

              {applyStatus && (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                  ✅ {applyStatus}
                </div>
              )}

              <div className="grid gap-4">
                <div className="grid gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Platform</label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none focus:border-violet-500/50 transition appearance-none"
                  >
                    <option value="twitch">Twitch</option>
                    <option value="youtube">YouTube</option>
                    <option value="kick">Kick</option>
                    <option value="discord">Discord</option>
                    <option value="tiktok">TikTok</option>
                    <option value="x">X / Twitter</option>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="grid gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Description</label>
                  <input
                    value={streamTitle}
                    onChange={(e) => setStreamTitle(e.target.value)}
                    placeholder="e.g. My TikTok clips"
                    required
                    className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-500/50 transition"
                  />
                </div>

                <div className="grid gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Link URL</label>
                  <input
                    value={streamUrl}
                    onChange={(e) => setStreamUrl(e.target.value)}
                    placeholder="e.g. tiktok.com/@username"
                    required
                    className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-500/50 transition"
                  />
                </div>
              </div>

              {applyError && (
                <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{applyError}</div>
              )}

              <button
                type="submit"
                disabled={applyLoading}
                className="h-12 w-full rounded-2xl bg-violet-600 text-sm font-bold text-white hover:bg-violet-500 shadow-lg shadow-violet-600/20 transition disabled:opacity-60"
              >
                {applyLoading ? "Sending..." : "Submit Link for Review"}
              </button>
            </form>

            <div className="hidden lg:flex flex-col justify-center p-8 border border-dashed border-white/10 rounded-[2rem]">
               <div className="text-5xl mb-6">🛰️</div>
               <h3 className="text-xl font-bold text-white">Join the Nexus Network</h3>
               <p className="mt-4 text-slate-400 leading-relaxed text-sm">
                 Approved creators get featured across the ecosystem. We support all major streaming and social platforms.
                 <br/><br/>
                 Each link is added to your profile. All links must be reviewed by staff.
               </p>
            </div>
          </div>
        )}

        {/* Active Player */}
        {activeLink && (
          <div className="mt-8 sm:mt-12 group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-[1.5rem] sm:rounded-[2.5rem] blur opacity-25" />
            <div className="relative rz-surface rz-panel-border rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/20 text-lg">
                    {getPlatformIcon(activeLink.platform)}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate">{activeLink.title}</div>
                    <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{activeLink.platform} View</div>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveLink(null)} 
                  className="h-8 w-8 shrink-0 flex items-center justify-center rounded-xl border border-white/10 hover:bg-white/5 transition text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div className="relative w-full rounded-xl overflow-hidden shadow-2xl border border-white/5">
                {getEmbedUrl(activeLink.url, activeLink.platform) ? (
                  <iframe
                    src={getEmbedUrl(activeLink.url, activeLink.platform)!}
                    className="w-full h-full"
                    style={{ aspectRatio: "16/9" }}
                    allowFullScreen
                    allow="autoplay; fullscreen"
                  />
                ) : (
                  <div className="aspect-video flex flex-col items-center justify-center bg-slate-950/80 p-6 sm:p-12 text-center">
                    <div className="text-3xl sm:text-4xl mb-4">{getPlatformIcon(activeLink.platform)}</div>
                    <div className="text-base sm:text-lg font-bold text-white">Embed Not Available</div>
                    <p className="text-xs sm:text-sm text-slate-400 mt-2 mb-6">This platform requires viewing on their direct site.</p>
                    <a
                      href={activeLink.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 sm:px-8 h-10 sm:h-12 flex items-center justify-center rounded-2xl bg-white text-slate-950 font-bold text-xs sm:text-sm hover:bg-slate-200 transition"
                    >
                      Open {activeLink.platform.toUpperCase()} →
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Directory */}
        <div className="mt-12">
          <div className="flex items-center gap-2 mb-6">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <h2 className="text-sm font-bold text-white uppercase tracking-widest">Verified Creators</h2>
          </div>

          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <div className="col-span-full py-20 text-center animate-pulse text-slate-500 font-bold italic text-sm">
                Scanning for active frequencies...
              </div>
            ) : groupedStreamers.length === 0 ? (
              <div className="col-span-full rounded-[2rem] border-2 border-dashed border-white/5 bg-slate-950/40 p-10 sm:p-16 text-center">
                <div className="text-4xl sm:text-5xl mb-4 opacity-50">📡</div>
                <div className="text-lg sm:text-xl font-bold text-white">Frequency Silent</div>
                <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-xs mx-auto">No creators approved yet. Use the panel above to be the first.</p>
              </div>
            ) : (
              groupedStreamers.map((s) => (
                <div key={s.discordId} className="group relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-b from-white/10 to-transparent rounded-[1.5rem] sm:rounded-[2rem] opacity-0 group-hover:opacity-100 transition duration-500" />
                  <div className="relative h-full rz-surface rz-panel-border rounded-[1.5rem] sm:rounded-[2rem] p-5 sm:p-6 flex flex-col">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="relative shrink-0">
                        {s.avatarUrl && !avatarErrors[s.discordId] ? (
                          <img
                            src={s.avatarUrl}
                            alt={s.username}
                            onError={() => setAvatarErrors((prev) => ({ ...prev, [s.discordId]: true }))}
                            className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl object-cover ring-2 ring-white/5"
                          />
                        ) : (
                          <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-lg sm:text-xl font-black text-white">
                            {s.username[0]?.toUpperCase()}
                          </div>
                        )}
                        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-lg bg-emerald-500 ring-2 sm:ring-4 ring-slate-900">
                          <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-white animate-pulse" />
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-base sm:text-lg font-black text-white truncate">{s.username}</div>
                        <div className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-widest">{s.links.length} Social Link{s.links.length !== 1 ? 's' : ''}</div>
                      </div>
                    </div>

                    <div className="space-y-2.5 flex-1">
                      {s.links.map(link => (
                        <div key={link.id} className="group/link">
                          <button
                            onClick={() => setActiveLink({ url: link.url, platform: link.platform, title: link.title })}
                            className="w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition text-left"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-base sm:text-lg">{getPlatformIcon(link.platform)}</span>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-white truncate">{link.title}</div>
                                <div className="text-[9px] text-slate-500 uppercase font-black">{link.platform}</div>
                              </div>
                            </div>
                            <span className="text-violet-400 opacity-100 sm:opacity-0 group-hover/link:opacity-100 transition translate-x-0 sm:translate-x-2 sm:group-hover/link:translate-x-0 text-xs">
                              ▶
                            </span>
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between gap-2">
                       <a 
                         href={`https://discord.com/users/${s.discordId}`} 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="text-[9px] font-black uppercase tracking-widest text-slate-600 hover:text-white transition truncate"
                       >
                         ID: {s.discordId}
                       </a>
                       <span className="shrink-0 text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-emerald-500/50">Verified Creator</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
