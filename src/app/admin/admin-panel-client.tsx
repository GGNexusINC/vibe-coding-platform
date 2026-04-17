"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ActivityEntry = {
  id: string;
  type: string;
  createdAt: string;
  username?: string;
  discordId?: string;
  avatarUrl?: string;
  globalName?: string | null;
  discriminator?: string | null;
  profile?: Record<string, unknown>;
  details: string;
};

type MemberSummary = {
  discordId: string;
  username: string;
  globalName?: string | null;
  discriminator?: string | null;
  avatarUrl?: string;
  profile?: Record<string, unknown>;
  lastActiveAt: string;
  activeDays: number;
  events: number;
  activeNow: boolean;
  isAdmin?: boolean;
};

type StatsResponse = {
  ok: boolean;
  activeWindowMinutes: number;
  summary: {
    totalMembersTracked: number;
    activeNowCount: number;
    totalEvents: number;
    activeDaysObserved: number;
    members: MemberSummary[];
  };
  recent: ActivityEntry[];
  error?: string;
};

type AdminEntry = {
  id: string;
  discordId: string;
  username: string;
  avatarUrl?: string;
  status: "approved" | "pending" | "denied";
  addedAt: string;
  updatedAt: string;
  activeNow?: boolean;
  lastActiveAt?: string | null;
  isOwner?: boolean;
};

const pageOptions = [
  { value: "general-chat", label: "General Chat", note: "Public updates and major server posts." },
  { value: "ban-page", label: "Ban Page", note: "Punishments, warnings, and moderation notices." },
];

const broadcastPresets = [
  {
    label: "General update",
    target: "general-chat",
    audienceLabel: "main page",
    title: "Server Update",
    message: "A new update is live. Check the site for the latest information and active events.",
    color: "#22c55e",
  },
  {
    label: "Staff alert",
    target: "general-chat",
    audienceLabel: "staff chat",
    title: "Staff Attention Needed",
    message: "Please review the latest activity and respond to pending issues as soon as possible.",
    color: "#f59e0b",
  },
  {
    label: "Ban notice",
    target: "ban-page",
    audienceLabel: "ban page",
    title: "Enforcement Notice",
    message: "A new enforcement action has been recorded. Please review the rules and appeal process if needed.",
    color: "#ef4444",
  },
];

function formatEventType(type: string) {
  return type.replaceAll("_", " ");
}

function getMemberName(member: MemberSummary) {
  return member.globalName || member.username;
}

export function AdminPanelClient() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [authError, setAuthError] = useState("");

  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [statsError, setStatsError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState("");

  const [target, setTarget] = useState("general-chat");
  const [audienceLabel, setAudienceLabel] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [color, setColor] = useState("#22c55e");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [broadcastStatus, setBroadcastStatus] = useState("");
  const [broadcastLoading, setBroadcastLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<"dashboard" | "roster" | "members" | "broadcast" | "streamers" | "lottery">("dashboard");
  const [roster, setRoster] = useState<AdminEntry[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState("");
  const [rosterActionLoading, setRosterActionLoading] = useState<string | null>(null);

  const [streamers, setStreamers] = useState<{id:string;discordId:string;username:string;avatarUrl?:string|null;streamUrl:string;streamTitle:string;platform:string;status:string}[]>([]);
  const [streamersLoading, setStreamersLoading] = useState(false);
  const [streamerActionLoading, setStreamerActionLoading] = useState<string|null>(null);

  const [lotteryEntries, setLotteryEntries] = useState<{id:string;discordId:string;username:string;avatarUrl?:string|null;prize:string;enteredAt:string}[]>([]);
  const [lotteryDraws, setLotteryDraws] = useState<{id:string;winnerUsername:string;prize:string;drawnAt:string}[]>([]);
  const [lotteryLoading, setLotteryLoading] = useState(false);
  const [lotteryPrize, setLotteryPrize] = useState("Once Human Supply Pack (Rare Gear + Resources)");
  const [lotteryDrawing, setLotteryDrawing] = useState(false);
  const [lotteryStatus, setLotteryStatus] = useState("");

  const [eventFilter, setEventFilter] = useState("all");
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");

  const filteredMembers = useMemo(() => {
    return (stats?.summary.members ?? []).filter((member) => {
      const needle = memberSearch.trim().toLowerCase();
      if (!needle) return true;
      return (
        member.username.toLowerCase().includes(needle) ||
        member.globalName?.toLowerCase().includes(needle) ||
        member.discordId.toLowerCase().includes(needle)
      );
    });
  }, [memberSearch, stats?.summary.members]);

  const filteredRecent = useMemo(() => {
    return (stats?.recent ?? []).filter((entry) => {
      if (eventFilter === "all") return true;
      return entry.type === eventFilter;
    });
  }, [eventFilter, stats?.recent]);

  const eventTotals = useMemo(() => {
    return (stats?.recent ?? []).reduce<Record<string, number>>((acc, entry) => {
      acc[entry.type] = (acc[entry.type] ?? 0) + 1;
      return acc;
    }, {});
  }, [stats?.recent]);

  const selectedMember =
    filteredMembers.find((member) => member.discordId === selectedMemberId) ??
    filteredMembers[0] ??
    null;

  const selectedMemberProfileJson = selectedMember?.profile
    ? JSON.stringify(selectedMember.profile, null, 2)
    : "";

  async function loadStats() {
    setRefreshing(true);
    setStatsError("");

    const res = await fetch("/api/admin/stats", { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as StatsResponse | null;

    if (!res.ok || !data?.ok) {
      const error = data?.error || "Could not load admin stats.";
      setStats(null);
      setStatsError(error);
      if (res.status === 401) {
        setIsAuthed(false);
      }
      setRefreshing(false);
      return;
    }

    setStats(data);
    setIsAuthed(true);
    setLastSyncAt(new Date().toISOString());
    setSelectedMemberId((current) => {
      if (current && data.summary.members.some((member) => member.discordId === current)) {
        return current;
      }
      return data.summary.members[0]?.discordId ?? "";
    });
    setRefreshing(false);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const auth = params.get("auth");
    const msg = params.get("msg");

    if (auth === "unauthorized") {
      setAuthError(msg || "Your Discord account is not authorized as an admin.");
    } else if (auth === "pending") {
      setAuthError(msg || "Your request is pending approval by an existing admin.");
    } else if (auth === "error") {
      setAuthError(msg || "Discord sign in failed. Try again.");
    } else if (auth === "missing_code") {
      setAuthError("Discord did not return an authorization code. Try again.");
    }

    if (auth) {
      const clean = new URL(window.location.href);
      clean.searchParams.delete("auth");
      clean.searchParams.delete("msg");
      window.history.replaceState({}, "", clean.toString());
    }

    const timer = window.setTimeout(() => {
      void loadStats();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isAuthed) return;

    const statsTimer = window.setInterval(() => {
      void loadStats();
    }, 15000);

    // Heartbeat so the admin shows as active
    const beat = () => void fetch("/api/heartbeat", { method: "POST" }).catch(() => null);
    beat();
    const heartbeatTimer = window.setInterval(beat, 3 * 60 * 1000);

    return () => {
      window.clearInterval(statsTimer);
      window.clearInterval(heartbeatTimer);
    };
  }, [isAuthed]);

  useEffect(() => {
    if (!isAuthed || activeTab !== "roster") return;
    const timer = window.setInterval(() => {
      void loadRoster();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [isAuthed, activeTab]);

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setIsAuthed(false);
    setStats(null);
    setStatsError("");
    setSelectedMemberId("");
  }

  async function handleBroadcast(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBroadcastLoading(true);
    setBroadcastStatus("");

    let fetchInit: RequestInit;
    if (imageFile) {
      const fd = new FormData();
      fd.append("target", target);
      fd.append("audienceLabel", audienceLabel);
      fd.append("title", title);
      fd.append("message", message);
      fd.append("color", color);
      fd.append("imageUrl", imageUrl);
      fd.append("imageFile", imageFile);
      fetchInit = { method: "POST", body: fd };
    } else {
      fetchInit = {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ target, audienceLabel, title, message, color, imageUrl }),
      };
    }
    const res = await fetch("/api/admin/broadcast", fetchInit);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setBroadcastStatus(data?.error || "Could not send Discord message.");
      setBroadcastLoading(false);
      return;
    }

    setTitle("");
    setMessage("");
    setImageUrl("");
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setBroadcastStatus("Discord message sent successfully.");
    setBroadcastLoading(false);
    await loadStats();
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImageUrl("");
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(String(ev.target?.result ?? ""));
    reader.readAsDataURL(file);
  }

  async function loadRoster() {
    setRosterLoading(true);
    setRosterError("");
    const res = await fetch("/api/admin/roster", { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setRosterError(data?.error || "Could not load roster.");
      setRosterLoading(false);
      return;
    }
    setRoster(data.roster as AdminEntry[]);
    setRosterLoading(false);
  }

  async function loadStreamers() {
    setStreamersLoading(true);
    const res = await fetch("/api/streamers/admin", { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (data?.ok) setStreamers(data.streamers);
    setStreamersLoading(false);
  }

  async function handleStreamerAction(discordId: string, status: "approved" | "denied" | "pending") {
    setStreamerActionLoading(discordId + status);
    await fetch("/api/streamers", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ discordId, status }),
    });
    setStreamerActionLoading(null);
    await loadStreamers();
  }

  async function loadLottery() {
    setLotteryLoading(true);
    const [entriesRes, drawsRes] = await Promise.all([
      fetch("/api/lottery/enter", { cache: "no-store" }),
      fetch("/api/lottery/draw", { cache: "no-store" }),
    ]);
    const entriesData = await entriesRes.json().catch(() => null);
    const drawsData = await drawsRes.json().catch(() => null);
    if (entriesData?.ok) setLotteryEntries(entriesData.entries);
    if (drawsData?.ok) setLotteryDraws(drawsData.draws);
    setLotteryLoading(false);
  }

  async function handleDrawWinner() {
    setLotteryDrawing(true);
    setLotteryStatus("");
    const res = await fetch("/api/lottery/draw", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prize: lotteryPrize, clearAfter: true }),
    });
    const data = await res.json().catch(() => ({}));
    setLotteryDrawing(false);
    if (!res.ok) {
      setLotteryStatus(data?.error || "Draw failed.");
    } else {
      setLotteryStatus(`🏆 Winner: ${data.winner?.username} — Prize: ${data.winner?.prize}`);
      await loadLottery();
    }
  }

  async function handleRosterAction(discordId: string, status: "approved" | "denied" | "pending") {
    setRosterActionLoading(discordId + status);
    setRosterError("");
    const res = await fetch("/api/admin/roster", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ discordId, status }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setRosterError(data?.error || "Action failed.");
    } else if (data.roster) {
      setRoster(data.roster as AdminEntry[]);
    } else {
      await loadRoster();
    }
    setRosterActionLoading(null);
  }

  function applyPreset(preset: (typeof broadcastPresets)[number]) {
    setTarget(preset.target);
    setAudienceLabel(preset.audienceLabel);
    setTitle(preset.title);
    setMessage(preset.message);
    setColor(preset.color);
    setBroadcastStatus(`Preset loaded: ${preset.label}`);
  }

  const pendingAdmins = roster.filter((a) => a.status === "pending").length;
  const pendingStreamers = streamers.filter((s) => s.status === "pending").length;

  const tabs = [
    { id: "dashboard" as const, label: "Dashboard", icon: "📊" },
    { id: "roster"    as const, label: "Roster",    icon: "👥", badge: pendingAdmins },
    { id: "members"   as const, label: "Members",   icon: "🔍" },
    { id: "broadcast" as const, label: "Broadcast", icon: "📢" },
    { id: "streamers" as const, label: "Streamers", icon: "📺", badge: pendingStreamers },
    { id: "lottery"   as const, label: "Lottery",   icon: "🎰" },
  ] as const;

  type TabId = (typeof tabs)[number]["id"];

  function switchTab(id: TabId) {
    setActiveTab(id as typeof activeTab);
    if (id === "roster")    void loadRoster();
    if (id === "streamers") void loadStreamers();
    if (id === "lottery")   void loadLottery();
  }

  return (
    <div className="flex min-h-screen flex-col pb-20 md:pb-6">
      {!isAuthed ? (
        <section className="mx-auto mt-12 w-full max-w-sm rounded-3xl border border-white/10 bg-slate-950/80 p-6">
          <div className="text-center">
            <div className="text-4xl">🔐</div>
            <h2 className="mt-3 text-xl font-bold text-white">Admin Sign In</h2>
            <p className="mt-1 text-sm text-slate-400">Sign in with Discord to access the panel.</p>
          </div>
          <a
            href="/auth/admin/start"
            className="mt-6 flex h-12 items-center justify-center gap-3 rounded-2xl bg-[#5865F2] text-sm font-semibold text-white transition hover:bg-[#4752c4]"
          >
            <svg width="18" height="18" viewBox="0 0 71 55" fill="currentColor"><path d="M60.1 4.9A58.5 58.5 0 0 0 45.5.4a.2.2 0 0 0-.2.1 40.7 40.7 0 0 0-1.8 3.7 54 54 0 0 0-16.2 0A37.4 37.4 0 0 0 25.4.5a.2.2 0 0 0-.2-.1A58.4 58.4 0 0 0 10.6 4.9a.2.2 0 0 0-.1.1C1.6 18.1-.9 31 .3 43.7a.2.2 0 0 0 .1.2 58.8 58.8 0 0 0 17.7 9 .2.2 0 0 0 .2-.1 42 42 0 0 0 3.6-5.9.2.2 0 0 0-.1-.3 38.7 38.7 0 0 1-5.5-2.6.2.2 0 0 1 0-.4c.4-.3.7-.6 1.1-.9a.2.2 0 0 1 .2 0c11.5 5.3 24 5.3 35.4 0a.2.2 0 0 1 .2 0l1.1.9a.2.2 0 0 1 0 .4 36.2 36.2 0 0 1-5.5 2.6.2.2 0 0 0-.1.3 47.1 47.1 0 0 0 3.6 5.9.2.2 0 0 0 .2.1 58.7 58.7 0 0 0 17.7-9 .2.2 0 0 0 .1-.2c1.5-14.9-2.5-27.8-10.5-39.2a.2.2 0 0 0-.1 0ZM23.7 36.2c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 4-2.8 7.2-6.4 7.2Zm23.7 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 4-2.8 7.2-6.4 7.2Z"/></svg>
            Sign in with Discord
          </a>
          {(authError || statsError) && (
            <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{authError || statsError}</div>
          )}
        </section>
      ) : (
        <>
          {/* ── Desktop top nav ── */}
          <div className="mb-5 hidden flex-wrap gap-2 md:flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => switchTab(tab.id)}
                className={`relative flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? "border-cyan-300/30 bg-cyan-400/10 text-cyan-100"
                    : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
                {"badge" in tab && tab.badge > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[9px] font-bold text-slate-950">{tab.badge}</span>
                )}
              </button>
            ))}
            <button type="button" onClick={handleLogout} className="ml-auto rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-white/10">
              Sign out
            </button>
          </div>

          {/* ── Mobile sticky bottom nav ── */}
          <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-white/10 bg-slate-950/95 backdrop-blur-md md:hidden">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => switchTab(tab.id)}
                className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition ${
                  activeTab === tab.id ? "text-cyan-300" : "text-slate-500"
                }`}
              >
                <span className="text-lg leading-none">{tab.icon}</span>
                {tab.label}
                {"badge" in tab && tab.badge > 0 && (
                  <span className="absolute right-2 top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 text-[8px] font-bold text-slate-950">{tab.badge}</span>
                )}
              </button>
            ))}
          </nav>

          {/* ════ DASHBOARD ════ */}
          {activeTab === "dashboard" && (
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Overview</h2>
                <div className="flex gap-2">
                  <button type="button" onClick={() => void loadStats()} disabled={refreshing} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10 disabled:opacity-50">
                    {refreshing ? "Syncing…" : "↻ Refresh"}
                  </button>
                  <button type="button" onClick={handleLogout} className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300">Sign out</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Active Now", value: stats?.summary.activeNowCount ?? 0, color: "text-emerald-400" },
                  { label: "Total Members", value: stats?.summary.totalMembersTracked ?? 0, color: "text-cyan-400" },
                  { label: "Active Days", value: stats?.summary.activeDaysObserved ?? 0, color: "text-violet-400" },
                  { label: "Events", value: stats?.summary.totalEvents ?? 0, color: "text-amber-400" },
                ].map((s) => (
                  <div key={s.label} className="rz-surface rz-panel-border rounded-2xl p-4">
                    <div className="text-[11px] uppercase tracking-widest text-slate-500">{s.label}</div>
                    <div className={`mt-2 text-3xl font-black ${s.color}`}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div className="rz-surface rz-panel-border rounded-2xl p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-white">Recent Activity</div>
                  <div className="flex gap-1 overflow-x-auto">
                    {["all", "login", "support_ticket", "purchase_intent"].map((t) => (
                      <button key={t} type="button" onClick={() => setEventFilter(t)}
                        className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition ${eventFilter === t ? "bg-cyan-400/20 text-cyan-200" : "text-slate-400 hover:text-white"}`}>
                        {t === "all" ? "All" : formatEventType(t)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-2 max-h-[420px] overflow-y-auto">
                  {filteredRecent.length === 0 && <div className="py-6 text-center text-sm text-slate-500">No events yet.</div>}
                  {filteredRecent.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-3 rounded-xl border border-white/8 bg-slate-950/60 px-3 py-2.5">
                      {entry.avatarUrl
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={entry.avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover border border-white/10" />
                        : <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-xs font-bold text-slate-300">{(entry.username || "G")[0].toUpperCase()}</div>
                      }
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-white">{entry.username || "Guest"}</div>
                        <div className="text-xs text-slate-400">{formatEventType(entry.type)} · {entry.details}</div>
                      </div>
                      <div className="shrink-0 text-[11px] text-slate-500">{new Date(entry.createdAt).toLocaleTimeString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════ MEMBERS ════ */}
          {activeTab === "members" && (
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">All Members <span className="text-sm font-normal text-slate-500">({filteredMembers.length})</span></h2>
              </div>
              <input
                className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none placeholder:text-slate-500"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search by name or Discord ID…"
              />
              {selectedMember && (
                <div className={`rounded-2xl border p-4 ${selectedMember.isAdmin ? "border-amber-400/30 bg-amber-400/5" : "border-white/10 bg-white/5"}`}>
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      {selectedMember.avatarUrl
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={selectedMember.avatarUrl} alt="" className={`h-14 w-14 rounded-full object-cover ${selectedMember.isAdmin ? "border-2 border-amber-400/60" : "border border-white/10"}`} />
                        : <div className={`flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold ${selectedMember.isAdmin ? "border-2 border-amber-400/60 bg-amber-400/10 text-amber-200" : "border border-white/10 bg-white/5 text-slate-300"}`}>{selectedMember.username[0].toUpperCase()}</div>
                      }
                      {selectedMember.isAdmin && <span className="absolute -bottom-1 -right-1 text-sm">👑</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`flex flex-wrap items-center gap-2 font-bold ${selectedMember.isAdmin ? "text-amber-200" : "text-white"}`}>
                        {getMemberName(selectedMember)}
                        {selectedMember.isAdmin && <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-300">Admin</span>}
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${selectedMember.activeNow ? "bg-emerald-500/20 text-emerald-300" : "bg-white/8 text-slate-400"}`}>{selectedMember.activeNow ? "● Live" : "Idle"}</span>
                      </div>
                      <div className="text-xs text-slate-400">@{selectedMember.username} · ID: {selectedMember.discordId}</div>
                      <div className="mt-1 flex gap-4 text-xs text-slate-400">
                        <span>Events: <strong className="text-white">{selectedMember.events}</strong></span>
                        <span>Days: <strong className="text-white">{selectedMember.activeDays}</strong></span>
                        <span>Last: <strong className="text-white">{new Date(selectedMember.lastActiveAt).toLocaleDateString()}</strong></span>
                      </div>
                    </div>
                  </div>
                  {selectedMember.profile && (
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400 sm:grid-cols-4">
                      <span>Locale: <strong className="text-slate-200">{String(selectedMember.profile.locale ?? "—")}</strong></span>
                      <span>Verified: <strong className="text-slate-200">{String(selectedMember.profile.verified ?? "—")}</strong></span>
                    </div>
                  )}
                </div>
              )}
              <div className="grid gap-2 max-h-[520px] overflow-y-auto">
                {filteredMembers.length === 0 && <div className="py-8 text-center text-sm text-slate-500">No members yet.</div>}
                {filteredMembers.map((member) => (
                  <button
                    key={member.discordId}
                    type="button"
                    onClick={() => setSelectedMemberId(member.discordId)}
                    className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                      selectedMember?.discordId === member.discordId
                        ? member.isAdmin ? "border-amber-400/40 bg-amber-400/10" : "border-cyan-300/30 bg-cyan-400/10"
                        : member.isAdmin ? "border-amber-400/15 bg-amber-400/4" : "border-white/8 bg-slate-950/50"
                    }`}
                  >
                    <div className="relative shrink-0">
                      {member.avatarUrl
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={member.avatarUrl} alt="" className={`h-10 w-10 rounded-full object-cover ${member.isAdmin ? "border-2 border-amber-400/60" : "border border-white/10"}`} />
                        : <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${member.isAdmin ? "border-2 border-amber-400/60 bg-amber-400/10 text-amber-200" : "border border-white/10 bg-white/5 text-slate-300"}`}>{member.username[0].toUpperCase()}</div>
                      }
                      {member.isAdmin && <span className="absolute -bottom-0.5 -right-0.5 text-[10px]">👑</span>}
                      <span className={`absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-950 ${member.activeNow ? "bg-emerald-400" : "bg-slate-600"}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`truncate text-sm font-semibold ${member.isAdmin ? "text-amber-200" : "text-white"}`}>
                        {getMemberName(member)}
                        {member.isAdmin && <span className="ml-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-400/70">Admin</span>}
                      </div>
                      <div className="text-xs text-slate-500">
                        {member.events > 0 ? `${member.events} events · ${member.activeDays}d active` : "Discord member"}
                      </div>
                    </div>
                    <div className="shrink-0 text-[11px] text-slate-500">{new Date(member.lastActiveAt).toLocaleDateString()}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ════ BROADCAST ════ */}
          {activeTab === "broadcast" && (
            <div className="grid gap-4 max-w-xl">
              <h2 className="text-lg font-bold text-white">Send to Discord</h2>
              <div className="flex flex-wrap gap-2">
                {broadcastPresets.map((p) => (
                  <button key={p.label} type="button" onClick={() => applyPreset(p)}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10">
                    {p.label}
                  </button>
                ))}
              </div>
              <form className="grid gap-3" onSubmit={handleBroadcast}>
                <select className="h-11 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none" value={target} onChange={(e) => setTarget(e.target.value)}>
                  {pageOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <input className="h-11 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none placeholder:text-slate-500"
                  value={audienceLabel} onChange={(e) => setAudienceLabel(e.target.value)} placeholder="Audience label (optional)" maxLength={80} />
                <input className="h-11 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none placeholder:text-slate-500"
                  value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Message title *" maxLength={80} required />
                <div className="flex gap-2">
                  <input type="color" className="h-11 w-14 rounded-2xl border border-white/10 bg-slate-950/70 p-1" value={color} onChange={(e) => setColor(e.target.value)} />
                  <input className="h-11 flex-1 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none placeholder:text-slate-500"
                    value={color} onChange={(e) => setColor(e.target.value)} placeholder="#22c55e" maxLength={7} />
                </div>
                <div className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-white/20 bg-slate-950/55 px-4 py-3 transition hover:border-cyan-300/40"
                  onClick={() => fileInputRef.current?.click()}>
                  {imagePreview
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={imagePreview} alt="" className="h-10 w-10 rounded-xl object-cover border border-white/10" />
                    : <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 16l4-4 4 4 4-6 4 6M4 20h16a2 2 0 002-2V6a2 2 0 00-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg></div>
                  }
                  <div className="flex-1 text-sm text-slate-300">{imageFile ? imageFile.name : "Upload image (optional)"}</div>
                  {imageFile && <button type="button" className="text-xs text-slate-500 hover:text-rose-300" onClick={(ev) => { ev.stopPropagation(); setImageFile(null); setImagePreview(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}>Remove</button>}
                </div>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleImageUpload} />
                <input className="h-11 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none placeholder:text-slate-500"
                  value={imageUrl} onChange={(e) => { setImageUrl(e.target.value); if (e.target.value) { setImageFile(null); setImagePreview(""); } }}
                  placeholder="Or paste image URL" maxLength={500} disabled={!!imageFile} />
                <textarea className="min-h-32 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                  value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Your Discord message *" maxLength={1500} required />
                <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#111827]">
                  <div className="h-1 w-full" style={{ backgroundColor: color || "#22c55e" }} />
                  <div className="px-4 py-3">
                    <div className="text-sm font-semibold text-white">{title || "Preview title"}</div>
                    <div className="mt-1 text-sm text-slate-400">{message || "Preview message…"}</div>
                  </div>
                </div>
                <button type="submit" disabled={broadcastLoading} className="h-12 rounded-2xl bg-[linear-gradient(135deg,#f59e0b,#67e8f9)] text-sm font-bold text-slate-950 transition hover:scale-[1.01] disabled:opacity-70">
                  {broadcastLoading ? "Sending…" : "Send to Discord"}
                </button>
                {broadcastStatus && <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100">{broadcastStatus}</div>}
              </form>
            </div>
          )}

          {/* ════ ROSTER ════ */}
          {activeTab === "roster" && (
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-white">Admin Roster</h2>
                <div className="flex gap-2 text-center">
                  {[
                    { label: "Approved", val: roster.filter(r => r.status === "approved").length, color: "text-emerald-400" },
                    { label: "Pending",  val: roster.filter(r => r.status === "pending").length,  color: "text-amber-400"   },
                    { label: "Online",   val: roster.filter(r => r.activeNow).length,              color: "text-white"       },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-center">
                      <div className={`text-base font-black ${s.color}`}>{s.val}</div>
                      <div className="text-[10px] text-slate-500">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              {rosterLoading && <div className="text-sm text-slate-400">Loading…</div>}
              {rosterError && <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{rosterError}</div>}
              <div className="grid gap-2">
                {roster.length === 0 && !rosterLoading && <div className="py-8 text-center text-sm text-slate-500">No admins yet.</div>}
                {roster.map((entry) => (
                  <div key={entry.id} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${entry.isOwner ? "border-amber-400/20 bg-amber-400/5" : "border-white/8 bg-slate-950/60"}`}>
                    <div className="relative shrink-0">
                      {entry.avatarUrl
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={entry.avatarUrl} alt="" className={`h-10 w-10 rounded-full object-cover ${entry.isOwner ? "border-2 border-amber-400/60" : "border border-white/10"}`} />
                        : <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${entry.isOwner ? "border-2 border-amber-400/60 bg-amber-400/10 text-amber-200" : "border border-white/10 bg-white/5 text-slate-300"}`}>{entry.username[0].toUpperCase()}</div>
                      }
                      <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-950 ${entry.activeNow ? "bg-emerald-400" : "bg-slate-600"}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`flex flex-wrap items-center gap-1.5 text-sm font-semibold ${entry.isOwner ? "text-amber-200" : "text-white"}`}>
                        {entry.isOwner && <span>👑</span>}
                        {entry.username}
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${entry.status === "approved" ? "bg-emerald-500/15 text-emerald-300" : entry.status === "denied" ? "bg-rose-500/15 text-rose-300" : "bg-amber-400/15 text-amber-300"}`}>{entry.status}</span>
                      </div>
                      <div className="text-xs text-slate-500">{entry.lastActiveAt ? `Last seen ${new Date(entry.lastActiveAt).toLocaleDateString()}` : `Added ${new Date(entry.addedAt).toLocaleDateString()}`}</div>
                    </div>
                    {!entry.isOwner && (
                      <div className="flex shrink-0 gap-1.5">
                        {entry.status !== "approved" && <button type="button" disabled={rosterActionLoading === entry.discordId + "approved"} onClick={() => void handleRosterAction(entry.discordId, "approved")} className="rounded-xl bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-50">✓ Approve</button>}
                        {entry.status === "approved" && <button type="button" disabled={rosterActionLoading === entry.discordId + "pending"} onClick={() => void handleRosterAction(entry.discordId, "pending")} className="rounded-xl bg-slate-500/15 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-500/25 disabled:opacity-50">Revoke</button>}
                        {entry.status !== "denied" && entry.status !== "approved" && <button type="button" disabled={rosterActionLoading === entry.discordId + "denied"} onClick={() => void handleRosterAction(entry.discordId, "denied")} className="rounded-xl bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/25 disabled:opacity-50">✕ Deny</button>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ════ STREAMERS ════ */}
          {activeTab === "streamers" && (
            <div className="grid gap-4">
              <h2 className="text-lg font-bold text-white">Streamers</h2>
              {streamersLoading && <div className="text-sm text-slate-400">Loading…</div>}
              <div className="grid gap-2">
                {streamers.length === 0 && !streamersLoading && <div className="py-8 text-center text-sm text-slate-500">No streamer applications yet.</div>}
                {streamers.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-slate-950/60 px-4 py-3">
                    {s.avatarUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={s.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover border border-white/10" />
                      : <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-sm font-bold text-violet-300">{s.username[0].toUpperCase()}</div>
                    }
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
                        {s.username}
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${s.status === "approved" ? "bg-emerald-500/15 text-emerald-300" : s.status === "denied" ? "bg-rose-500/15 text-rose-300" : "bg-amber-500/15 text-amber-300"}`}>{s.status}</span>
                      </div>
                      <div className="truncate text-xs text-slate-400">{s.streamTitle}</div>
                      <a href={s.streamUrl} target="_blank" rel="noopener noreferrer" className="truncate text-xs text-violet-400 hover:underline">{s.streamUrl}</a>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      {s.status !== "approved" && <button type="button" disabled={streamerActionLoading === s.discordId + "approved"} onClick={() => void handleStreamerAction(s.discordId, "approved")} className="rounded-xl bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-50">✓</button>}
                      {s.status === "approved" && <button type="button" disabled={streamerActionLoading === s.discordId + "pending"} onClick={() => void handleStreamerAction(s.discordId, "pending")} className="rounded-xl bg-slate-500/15 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-500/25 disabled:opacity-50">Revoke</button>}
                      {s.status !== "denied" && s.status !== "approved" && <button type="button" disabled={streamerActionLoading === s.discordId + "denied"} onClick={() => void handleStreamerAction(s.discordId, "denied")} className="rounded-xl bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/25 disabled:opacity-50">✕</button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ════ LOTTERY ════ */}
          {activeTab === "lottery" && (
            <div className="grid gap-4 max-w-lg">
              <h2 className="text-lg font-bold text-white">Lottery</h2>
              <input value={lotteryPrize} onChange={(e) => setLotteryPrize(e.target.value)} className="h-11 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none" placeholder="Prize label" />
              <button onClick={() => void handleDrawWinner()} disabled={lotteryDrawing || lotteryEntries.length === 0}
                className="h-12 rounded-2xl bg-[linear-gradient(135deg,#facc15,#f97316)] text-sm font-bold text-slate-950 transition hover:scale-[1.01] disabled:opacity-50">
                {lotteryDrawing ? "Drawing…" : `🎲 Draw Winner · ${lotteryEntries.length} entries`}
              </button>
              {lotteryStatus && <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-200">{lotteryStatus}</div>}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Current Entries ({lotteryEntries.length})</div>
                  {lotteryLoading ? <div className="text-sm text-slate-400">Loading…</div> : lotteryEntries.length === 0 ? <div className="text-sm text-slate-500">No entries yet.</div> : (
                    <div className="grid gap-1.5 max-h-60 overflow-y-auto">
                      {lotteryEntries.map((e) => (
                        <div key={e.id} className="flex items-center gap-2 rounded-xl border border-white/8 bg-slate-950/60 px-3 py-2">
                          {e.avatarUrl ? <img src={e.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" /> : <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-300">{e.username[0].toUpperCase()}</div>}
                          <div className="flex-1 text-sm text-white">{e.username}</div>
                          <div className="text-[11px] text-slate-500">{new Date(e.enteredAt).toLocaleTimeString()}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Past Winners</div>
                  {lotteryDraws.length === 0 ? <div className="text-sm text-slate-500">No draws yet.</div> : (
                    <div className="grid gap-1.5 max-h-60 overflow-y-auto">
                      {lotteryDraws.map((d) => (
                        <div key={d.id} className="flex items-center gap-2 rounded-xl border border-white/8 bg-slate-950/60 px-3 py-2">
                          <span className="text-base">🏆</span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-white">{d.winnerUsername}</div>
                            <div className="truncate text-xs text-slate-400">{d.prize}</div>
                          </div>
                          <div className="shrink-0 text-[11px] text-slate-500">{new Date(d.drawnAt).toLocaleDateString()}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
