"use client";

import { useEffect, useState } from "react";

type Streamer = {
  id: string;
  discordId: string;
  username: string;
  avatarUrl?: string | null;
  streamUrl: string;
  streamTitle: string;
  platform: string;
  status: string;
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
  const [streamers, setStreamers] = useState<Streamer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStream, setActiveStream] = useState<Streamer | null>(null);

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
      .then((d) => { if (d.ok) setStreamers(d.streamers); setLoading(false); });
  }, []);

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
    if (!res.ok) {
      setApplyError(data?.error || "Could not submit application.");
    } else {
      setApplyStatus("Application submitted! An admin will review it shortly.");
      setStreamUrl("");
      setStreamTitle("");
      setApplyMode(false);
    }
  }

  const getEmbedUrl = (s: Streamer) => {
    if (s.platform === "twitch") return getTwitchEmbedUrl(s.streamUrl);
    if (s.platform === "youtube") return getYoutubeEmbedUrl(s.streamUrl);
    return null;
  };

  return (
    <div className="relative mx-auto w-full max-w-6xl px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(139,92,246,0.1),transparent_60%)]" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="rz-chip mb-4">📺 Streamers</div>
            <h1 className="text-4xl font-bold text-white">Live Streams</h1>
            <p className="mt-2 text-slate-400">Watch NewHopeGGN community members stream Once Human live.</p>
          </div>
          <button
            onClick={() => setApplyMode(!applyMode)}
            className="mt-6 h-11 rounded-2xl border border-violet-400/25 bg-violet-500/10 px-5 text-sm font-semibold text-violet-200 transition hover:bg-violet-500/20"
          >
            {applyMode ? "Cancel" : "Apply to Stream"}
          </button>
        </div>

        {applyStatus && (
          <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            ✅ {applyStatus}
          </div>
        )}

        {applyMode && (
          <form onSubmit={handleApply} className="mt-6 rz-surface rz-panel-border rounded-[2rem] p-6 grid gap-4 max-w-xl">
            <div className="text-sm font-semibold text-white">Apply to be a featured streamer</div>
            <p className="text-xs text-slate-400">Submit your stream link for admin review. Once approved it will appear on this page.</p>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="h-11 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white"
            >
              <option value="twitch">Twitch</option>
              <option value="youtube">YouTube</option>
              <option value="other">Other</option>
            </select>
            <input
              value={streamTitle}
              onChange={(e) => setStreamTitle(e.target.value)}
              placeholder="Stream title / description"
              required
              className="h-11 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none placeholder:text-slate-500"
            />
            <input
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              placeholder="Your stream URL (e.g. twitch.tv/yourname)"
              required
              className="h-11 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none placeholder:text-slate-500"
            />
            {applyError && (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-2 text-sm text-rose-300">{applyError}</div>
            )}
            <button
              type="submit"
              disabled={applyLoading}
              className="h-11 rounded-2xl bg-violet-500 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-60"
            >
              {applyLoading ? "Submitting..." : "Submit Application"}
            </button>
          </form>
        )}

        {/* Active stream embed */}
        {activeStream && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-white">Now watching: <span className="text-violet-300">{activeStream.streamTitle}</span></div>
              <button onClick={() => setActiveStream(null)} className="text-xs text-slate-400 hover:text-white">✕ Close</button>
            </div>
            {getEmbedUrl(activeStream) ? (
              <iframe
                src={getEmbedUrl(activeStream)!}
                className="w-full rounded-[1.5rem] border border-white/10"
                style={{ aspectRatio: "16/9" }}
                allowFullScreen
                allow="autoplay; fullscreen"
              />
            ) : (
              <a
                href={activeStream.streamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-8 text-center text-sm text-violet-300 hover:text-white"
              >
                Open stream in new tab →
              </a>
            )}
          </div>
        )}

        {/* Streamer cards */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <div className="text-sm text-slate-400">Loading streamers...</div>
          ) : streamers.length === 0 ? (
            <div className="col-span-full rounded-[2rem] border border-dashed border-white/12 bg-slate-950/40 p-10 text-center">
              <div className="text-4xl mb-3">📺</div>
              <div className="text-sm font-semibold text-white">No approved streamers yet</div>
              <div className="mt-1 text-xs text-slate-400">Be the first! Click &quot;Apply to Stream&quot; above.</div>
            </div>
          ) : (
            streamers.map((s) => (
              <div key={s.id} className="rz-surface rz-panel-border rounded-[2rem] p-5 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  {s.avatarUrl ? (
                    <img src={s.avatarUrl} alt={s.username} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-300 font-bold">
                      {s.username[0]?.toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-semibold text-white">{s.username}</div>
                    <div className="text-xs text-slate-400 capitalize">{s.platform}</div>
                  </div>
                  <div className="ml-auto flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs text-red-400 font-semibold">LIVE</span>
                  </div>
                </div>
                <div className="text-sm text-slate-200 font-medium">{s.streamTitle}</div>
                <button
                  onClick={() => setActiveStream(s)}
                  className="h-10 w-full rounded-2xl bg-violet-500/15 border border-violet-400/20 text-sm font-semibold text-violet-200 hover:bg-violet-500/25 transition"
                >
                  Watch Stream
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
