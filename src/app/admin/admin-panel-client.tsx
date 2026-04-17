"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  viewer?: { discordId?: string; username?: string; isOwner: boolean };
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

type ModAction = {
  id: string;
  actor_discord_id: string;
  actor_username: string;
  target_discord_id: string;
  action: string;
  reason: string;
  created_at: string;
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

  const [activeTab, setActiveTab] = useState<"dashboard" | "roster" | "members" | "broadcast" | "streamers" | "lottery" | "modlog" | "wipe">("dashboard");
  const [wipeAt, setWipeAt] = useState("");
  const [wipeLabel, setWipeLabel] = useState("Server Wipe");
  const [wipeSaving, setWipeSaving] = useState(false);
  const [wipeStatus, setWipeStatus] = useState("");
  const [modActions, setModActions] = useState<ModAction[]>([]);
  const [modLoading, setModLoading] = useState(false);
  const [modTargetId, setModTargetId] = useState("");
  const [modReason, setModReason] = useState("");
  const [modAction, setModAction] = useState<"warn" | "ban" | "unban">("warn");
  const [modStatus, setModStatus] = useState("");
  const [modWorking, setModWorking] = useState(false);
  const [showModModal, setShowModModal] = useState(false);
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
  const [now, setNow] = useState(Date.now());

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

  const loadStats = useCallback(async () => {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    // Load wipe timer for dashboard display
    fetch("/api/admin/wipe-timer").then(r => r.json()).then(d => {
      if (d.ok && d.wipeAt) {
        setWipeAt(new Date(d.wipeAt).toISOString().slice(0, 16));
        setWipeLabel(d.label ?? "Server Wipe");
      }
    }).catch(() => {});

    // Live tick for wipe countdown
    const tick = window.setInterval(() => setNow(Date.now()), 1000);

    // Pre-load mod log so it's ready when owner opens the tab
    void loadModLog();

    return () => { window.clearTimeout(timer); window.clearInterval(tick); };
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

  async function loadModLog() {
    setModLoading(true);
    const res = await fetch("/api/admin/moderate", { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (data?.ok) {
      setModActions(data.actions as ModAction[]);
    } else {
      setModStatus(data?.error ? `Error loading logs: ${data.error}` : "Failed to load mod log.");
    }
    setModLoading(false);
  }

  async function handleModerate(e: React.FormEvent) {
    e.preventDefault();
    if (!modTargetId.trim()) return;
    setModWorking(true);
    setModStatus("");
    const res = await fetch("/api/admin/moderate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: modAction, targetDiscordId: modTargetId.trim(), reason: modReason }),
    });
    const data = await res.json().catch(() => ({}));
    setModWorking(false);
    if (!res.ok) {
      setModStatus(data?.error || "Action failed.");
    } else {
      setModStatus(`✓ ${modAction} applied to ${modTargetId}.`);
      setModTargetId(""); setModReason(""); setShowModModal(false);
      await loadModLog();
    }
  }

  function applyPreset(preset: (typeof broadcastPresets)[number]) {
    setTarget(preset.target);
    setAudienceLabel(preset.audienceLabel);
    setTitle(preset.title);
    setMessage(preset.message);
    setColor(preset.color);
    setBroadcastStatus(`Preset loaded: ${preset.label}`);
  }

  const isOwner = stats?.viewer?.isOwner ?? false;
  const pendingAdmins = roster.filter((a) => a.status === "pending").length;
  const pendingStreamers = streamers.filter((s) => s.status === "pending").length;

  const tabs = [
    { id: "dashboard" as const, label: "Overview",   icon: "▣" },
    { id: "members"   as const, label: "Members",    icon: "◉" },
    { id: "roster"    as const, label: "Roster",     icon: "◈", badge: pendingAdmins },
    { id: "broadcast" as const, label: "Broadcast",  icon: "◎" },
    { id: "streamers" as const, label: "Streamers",  icon: "◇", badge: pendingStreamers },
    { id: "lottery"   as const, label: "Lottery",    icon: "◆" },
    { id: "modlog" as const, label: "Mod Log", icon: "⚑" },
    { id: "wipe" as const, label: "Wipe Timer", icon: "⏳" },
  ] as const;

  type TabId = (typeof tabs)[number]["id"];

  function switchTab(id: TabId) {
    setActiveTab(id as typeof activeTab);
    if (id === "roster")  void loadRoster();
    if (id === "streamers") void loadStreamers();
    if (id === "lottery") void loadLottery();
    if (id === "modlog")  void loadModLog();
    if (id === "wipe") {
      fetch("/api/admin/wipe-timer").then(r => r.json()).then(d => {
        if (d.ok) {
          setWipeAt(d.wipeAt ? new Date(d.wipeAt).toISOString().slice(0, 16) : "");
          setWipeLabel(d.label ?? "Server Wipe");
        }
      }).catch(() => {});
    }
  }

  const actionColor: Record<string, string> = {
    warn:  "bg-amber-500/15 text-amber-300 border-amber-500/20",
    ban:   "bg-rose-500/15 text-rose-300 border-rose-500/20",
    unban: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  };

  return (
    <div className="relative min-h-screen">
      {!isAuthed ? (
        /* ── Login card ── */
        <div className="flex min-h-[80vh] items-center justify-center px-4">
          <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-white/8 bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl shadow-black/60">
            <div className="h-1 w-full bg-gradient-to-r from-cyan-400 via-violet-500 to-fuchsia-500" />
            <div className="p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 text-3xl shadow-inner">🔐</div>
              <h2 className="mt-5 text-xl font-bold text-white tracking-tight">Admin Access</h2>
              <p className="mt-1.5 text-sm text-slate-400">Sign in with your Discord account to continue.</p>
              <a href="/auth/admin/start" className="mt-6 flex h-12 items-center justify-center gap-3 rounded-2xl bg-[#5865F2] text-sm font-semibold text-white shadow-lg shadow-[#5865F2]/20 transition hover:bg-[#4752c4] hover:scale-[1.02]">
                <svg width="18" height="18" viewBox="0 0 71 55" fill="currentColor"><path d="M60.1 4.9A58.5 58.5 0 0 0 45.5.4a.2.2 0 0 0-.2.1 40.7 40.7 0 0 0-1.8 3.7 54 54 0 0 0-16.2 0A37.4 37.4 0 0 0 25.4.5a.2.2 0 0 0-.2-.1A58.4 58.4 0 0 0 10.6 4.9a.2.2 0 0 0-.1.1C1.6 18.1-.9 31 .3 43.7a.2.2 0 0 0 .1.2 58.8 58.8 0 0 0 17.7 9 .2.2 0 0 0 .2-.1 42 42 0 0 0 3.6-5.9.2.2 0 0 0-.1-.3 38.7 38.7 0 0 1-5.5-2.6.2.2 0 0 1 0-.4c.4-.3.7-.6 1.1-.9a.2.2 0 0 1 .2 0c11.5 5.3 24 5.3 35.4 0a.2.2 0 0 1 .2 0l1.1.9a.2.2 0 0 1 0 .4 36.2 36.2 0 0 1-5.5 2.6.2.2 0 0 0-.1.3 47.1 47.1 0 0 0 3.6 5.9.2.2 0 0 0 .2.1 58.7 58.7 0 0 0 17.7-9 .2.2 0 0 0 .1-.2c1.5-14.9-2.5-27.8-10.5-39.2a.2.2 0 0 0-.1 0ZM23.7 36.2c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 4-2.8 7.2-6.4 7.2Zm23.7 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 4-2.8 7.2-6.4 7.2Z"/></svg>
                Continue with Discord
              </a>
              {(authError || statsError) && (
                <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{authError || statsError}</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-screen pb-16 md:pb-0">

          {/* ══════════════════════════════════════════════
              DESKTOP SIDEBAR
          ══════════════════════════════════════════════ */}
          <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-white/6 bg-gradient-to-b from-slate-950 to-[#090c14]">
            <div className="px-5 pt-7 pb-5">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center text-xs font-black text-white">N</div>
                <span className="text-sm font-bold text-white tracking-tight">NewHopeGGN</span>
              </div>
              <div className="mt-1 text-[10px] text-slate-500 pl-0.5">Admin Panel</div>
            </div>

            <nav className="flex-1 px-3 space-y-0.5">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => switchTab(tab.id)}
                  className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                    activeTab === tab.id
                      ? "bg-white/8 text-white shadow-sm"
                      : "text-slate-500 hover:bg-white/5 hover:text-slate-200"
                  }`}
                >
                  {activeTab === tab.id && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
                  )}
                  <span className={`text-base transition-transform duration-150 ${activeTab === tab.id ? "text-cyan-400 scale-110" : "text-slate-600 group-hover:text-slate-400"}`}>{tab.icon}</span>
                  <span className="flex-1 text-left">{tab.label}</span>
                  {"badge" in tab && tab.badge > 0 && (
                    <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-amber-400/25 px-1 text-[9px] font-bold text-amber-300">{tab.badge}</span>
                  )}
                </button>
              ))}
            </nav>

            <div className="p-3 border-t border-white/6 mt-4">
              <div className="mb-1.5 px-3 text-[10px] text-slate-600 font-semibold uppercase tracking-widest">{stats?.viewer?.username ?? "Admin"}</div>
              {isOwner && (
                <div className="mb-1.5 px-3">
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-400/8 px-2 py-0.5 text-[10px] font-bold text-amber-300">👑 Owner</span>
                </div>
              )}
              <button type="button" onClick={handleLogout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 hover:bg-white/4 hover:text-rose-300 transition">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Sign out
              </button>
            </div>
          </aside>

          {/* ══════════════════════════════════════════════
              MAIN CONTENT
          ══════════════════════════════════════════════ */}
          <main className="flex-1 min-w-0 overflow-auto scroll-smooth">
            {/* Mobile header */}
            <div className="flex items-center justify-between border-b border-white/6 bg-slate-950/95 px-4 py-3 md:hidden sticky top-0 z-30 backdrop-blur">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center text-[10px] font-black text-white">N</div>
                <span className="text-sm font-bold text-white">Admin Panel</span>
              </div>
              <div className="flex items-center gap-2">
                {isOwner && <span className="rounded-full border border-amber-400/25 bg-amber-400/8 px-2 py-0.5 text-[10px] font-bold text-amber-300">👑 Owner</span>}
                <button type="button" onClick={() => void loadStats()} disabled={refreshing} className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-400 disabled:opacity-40">
                  {refreshing ? "⟳" : "↻"}
                </button>
              </div>
            </div>

            <div className="p-4 md:p-6 pb-24 md:pb-6">

          {/* ════ OVERVIEW ════ */}
          {activeTab === "dashboard" && (
            <div className="grid gap-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight">Overview</h1>
                  <p className="mt-0.5 text-sm text-slate-500">Real-time server stats · auto-syncs every 15s</p>
                </div>
                <button type="button" onClick={() => void loadStats()} disabled={refreshing}
                  className="flex items-center gap-1.5 rounded-xl border border-white/8 bg-white/4 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:bg-white/8 active:scale-95 transition-all disabled:opacity-40">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={refreshing ? "animate-spin" : ""}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
                  {refreshing ? "Syncing…" : "Refresh"}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Active Now", value: stats?.summary.activeNowCount ?? 0, color: "from-emerald-400/15 to-emerald-400/3 border-emerald-400/15", accent: "text-emerald-400", dot: "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" },
                  { label: "Members", value: stats?.summary.totalMembersTracked ?? 0, color: "from-cyan-400/15 to-cyan-400/3 border-cyan-400/15", accent: "text-cyan-400", dot: "bg-cyan-400" },
                  { label: "Active Days", value: stats?.summary.activeDaysObserved ?? 0, color: "from-violet-400/15 to-violet-400/3 border-violet-400/15", accent: "text-violet-400", dot: "bg-violet-400" },
                  { label: "Events", value: stats?.summary.totalEvents ?? 0, color: "from-amber-400/15 to-amber-400/3 border-amber-400/15", accent: "text-amber-400", dot: "bg-amber-400" },
                ].map((s) => (
                  <div key={s.label} className={`relative overflow-hidden rounded-2xl border bg-gradient-to-b ${s.color} p-4 transition-transform duration-150 hover:scale-[1.02]`}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${s.dot}`} />
                      <span className="text-[11px] font-medium text-slate-400">{s.label}</span>
                    </div>
                    <div className={`text-3xl font-black tracking-tight ${s.accent}`}>{s.value.toLocaleString()}</div>
                  </div>
                ))}
              </div>

              {/* Wipe Timer Status — live ticking */}
              {wipeAt && (() => {
                const ms = new Date(wipeAt).getTime() - now;
                const past = ms <= 0;
                const abs = Math.abs(ms);
                const d = Math.floor(abs / 86400000);
                const h = Math.floor((abs % 86400000) / 3600000);
                const m = Math.floor((abs % 3600000) / 60000);
                const s = Math.floor((abs % 60000) / 1000);
                const parts = d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
                const urgent = !past && ms < 3600000;
                return (
                  <div className={`relative overflow-hidden rounded-2xl border px-5 py-4 transition-colors ${
                    past ? "border-slate-500/30 bg-slate-800/40" :
                    urgent ? "border-rose-500/35 bg-rose-950/40" :
                    "border-amber-400/25 bg-amber-950/30"
                  } ${urgent && !past ? "animate-pulse" : ""}`}>
                    <div className="absolute inset-0 pointer-events-none">
                      <div className={`absolute inset-x-0 top-0 h-px ${
                        past ? "bg-slate-500/30" : urgent ? "bg-gradient-to-r from-transparent via-rose-500/60 to-transparent" : "bg-gradient-to-r from-transparent via-amber-400/40 to-transparent"
                      }`} />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl shrink-0 ${
                          past ? "bg-slate-700/50" : urgent ? "bg-rose-500/15" : "bg-amber-400/10"
                        }`}>
                          {past ? "�" : urgent ? "��" : "⏳"}
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">{wipeLabel}</div>
                          <div className={`text-xl font-black tabular-nums leading-none ${
                            past ? "text-slate-500" : urgent ? "text-rose-300" : "text-amber-300"
                          }`}>
                            {past ? "WIPED" : parts}
                          </div>
                          <div className="text-[10px] text-slate-600 mt-0.5">{past ? "Timer expired" : "Until wipe"}</div>
                        </div>
                      </div>
                      <button type="button" onClick={() => switchTab("wipe")}
                        className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-white/10 hover:text-white transition-all">
                        Edit Timer
                      </button>
                    </div>
                  </div>
                );
              })()}

              <div className="rounded-2xl border border-white/6 bg-gradient-to-b from-slate-900/80 to-slate-950/80 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/6">
                  <div className="text-sm font-semibold text-white">Activity Feed</div>
                  <div className="flex gap-1 overflow-x-auto">
                    {["all", "login", "support_ticket", "purchase_intent"].map((t) => (
                      <button key={t} type="button" onClick={() => setEventFilter(t)}
                        className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${eventFilter === t ? "bg-cyan-400/15 text-cyan-300" : "text-slate-500 hover:text-slate-300"}`}>
                        {t === "all" ? "All" : formatEventType(t)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="divide-y divide-white/4 max-h-[420px] overflow-y-auto">
                  {filteredRecent.length === 0 && <div className="py-10 text-center text-sm text-slate-600">No activity yet.</div>}
                  {filteredRecent.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-3 px-5 py-3 hover:bg-white/2 transition">
                      {entry.avatarUrl
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={entry.avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover border border-white/8" />
                        : <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-xs font-bold text-slate-400">{(entry.username || "G")[0].toUpperCase()}</div>
                      }
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-slate-100">{entry.username || "Guest"}</div>
                        <div className="truncate text-xs text-slate-500">{formatEventType(entry.type)}{entry.details ? ` · ${entry.details}` : ""}</div>
                      </div>
                      <div className="shrink-0 text-[11px] text-slate-600">{new Date(entry.createdAt).toLocaleTimeString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════ MEMBERS ════ */}
          {activeTab === "members" && (
            <div className="grid gap-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight">Members <span className="text-slate-600 font-normal text-base">({filteredMembers.length})</span></h1>
                  <p className="mt-0.5 text-sm text-slate-500">All Discord server members.</p>
                </div>
                <button type="button" onClick={() => { setShowModModal(true); setModTargetId(selectedMember?.discordId ?? ""); }}
                    className="flex items-center gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-300 hover:bg-rose-500/18 transition">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    Moderate Member
                  </button>
              </div>

              <input
                className="h-10 w-full rounded-xl border border-white/8 bg-slate-900/80 px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/30 transition"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search by name or Discord ID…"
              />

              {selectedMember && (
                <div className={`rounded-2xl border p-4 ${selectedMember.isAdmin ? "border-amber-400/20 bg-amber-400/5" : "border-white/8 bg-slate-900/60"}`}>
                  <div className="flex items-start gap-4">
                    <div className="relative shrink-0">
                      {selectedMember.avatarUrl
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={selectedMember.avatarUrl} alt="" className={`h-14 w-14 rounded-2xl object-cover ${selectedMember.isAdmin ? "ring-2 ring-amber-400/50" : "ring-1 ring-white/10"}`} />
                        : <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-black ${selectedMember.isAdmin ? "ring-2 ring-amber-400/50 bg-amber-400/10 text-amber-300" : "ring-1 ring-white/10 bg-white/5 text-slate-300"}`}>{selectedMember.username[0].toUpperCase()}</div>
                      }
                      {selectedMember.isAdmin && <span className="absolute -top-1.5 -right-1.5 text-sm">👑</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-base font-bold ${selectedMember.isAdmin ? "text-amber-200" : "text-white"}`}>{getMemberName(selectedMember)}</span>
                        {selectedMember.isAdmin && <span className="rounded-full border border-amber-400/25 bg-amber-400/8 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-300">Admin</span>}
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${selectedMember.activeNow ? "bg-emerald-500/15 text-emerald-300" : "bg-white/6 text-slate-500"}`}>{selectedMember.activeNow ? "● Live" : "Offline"}</span>
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">@{selectedMember.username} · {selectedMember.discordId}</div>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs">
                        {[
                          { label: "Events", val: selectedMember.events },
                          { label: "Active Days", val: selectedMember.activeDays },
                          { label: "Last Seen", val: new Date(selectedMember.lastActiveAt).toLocaleDateString() },
                        ].map((s) => (
                          <div key={s.label} className="rounded-lg border border-white/6 bg-slate-950/60 px-3 py-1.5">
                            <div className="text-slate-600">{s.label}</div>
                            <div className="font-semibold text-slate-200">{s.val}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button type="button" onClick={() => { setModTargetId(selectedMember.discordId); setShowModModal(true); }}
                        className="shrink-0 rounded-xl border border-rose-500/20 bg-rose-500/8 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/15 transition">
                        ⚑ Action
                      </button>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-white/6 bg-gradient-to-b from-slate-900/80 to-slate-950/80 overflow-hidden">
                <div className="divide-y divide-white/4 max-h-[520px] overflow-y-auto">
                  {filteredMembers.length === 0 && <div className="py-10 text-center text-sm text-slate-600">No members yet.</div>}
                  {filteredMembers.map((member) => (
                    <button
                      key={member.discordId}
                      type="button"
                      onClick={() => setSelectedMemberId(member.discordId)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/3 ${
                        selectedMember?.discordId === member.discordId ? "bg-white/4" : ""
                      }`}
                    >
                      <div className="relative shrink-0">
                        {member.avatarUrl
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={member.avatarUrl} alt="" className={`h-9 w-9 rounded-xl object-cover ${member.isAdmin ? "ring-2 ring-amber-400/40" : "ring-1 ring-white/8"}`} />
                          : <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold ${member.isAdmin ? "ring-2 ring-amber-400/40 bg-amber-400/8 text-amber-300" : "ring-1 ring-white/8 bg-white/4 text-slate-400"}`}>{member.username[0].toUpperCase()}</div>
                        }
                        <span className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-slate-900 ${member.activeNow ? "bg-emerald-400" : "bg-slate-700"}`} />
                        {member.isAdmin && <span className="absolute -top-1 -right-1 text-[9px]">👑</span>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={`truncate text-sm font-semibold ${member.isAdmin ? "text-amber-200" : "text-slate-100"}`}>
                          {getMemberName(member)}
                          {member.isAdmin && <span className="ml-1.5 text-[9px] font-bold uppercase tracking-widest text-amber-400/60">Admin</span>}
                        </div>
                        <div className="text-[11px] text-slate-600">
                          {member.events > 0 ? `${member.events} events · ${member.activeDays}d active` : "Discord member"}
                        </div>
                      </div>
                      <div className="shrink-0 text-[11px] text-slate-600">{new Date(member.lastActiveAt).toLocaleDateString()}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════ BROADCAST ════ */}
          {activeTab === "broadcast" && (
            <div className="grid gap-5 max-w-lg">
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Discord Broadcast</h1>
                <p className="mt-0.5 text-sm text-slate-500">Send a message to a Discord channel via webhook.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {broadcastPresets.map((p) => (
                  <button key={p.label} type="button" onClick={() => applyPreset(p)}
                    className="rounded-lg border border-white/8 bg-white/4 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:bg-white/8 hover:text-white transition">
                    {p.label}
                  </button>
                ))}
              </div>
              <form className="grid gap-3" onSubmit={handleBroadcast}>
                <select className="h-10 rounded-xl border border-white/8 bg-slate-900/80 px-4 text-sm text-white outline-none focus:border-cyan-400/30" value={target} onChange={(e) => setTarget(e.target.value)}>
                  {pageOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <input className="h-10 rounded-xl border border-white/8 bg-slate-900/80 px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/30 transition"
                  value={audienceLabel} onChange={(e) => setAudienceLabel(e.target.value)} placeholder="Audience label (optional)" maxLength={80} />
                <input className="h-10 rounded-xl border border-white/8 bg-slate-900/80 px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/30 transition"
                  value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title *" maxLength={80} required />
                <div className="flex gap-2">
                  <input type="color" className="h-10 w-12 cursor-pointer rounded-xl border border-white/8 bg-slate-900/80 p-1" value={color} onChange={(e) => setColor(e.target.value)} />
                  <input className="h-10 flex-1 rounded-xl border border-white/8 bg-slate-900/80 px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/30 transition"
                    value={color} onChange={(e) => setColor(e.target.value)} placeholder="#22c55e" maxLength={7} />
                </div>
                <div className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/12 bg-slate-900/60 px-4 py-3 hover:border-cyan-400/25 transition"
                  onClick={() => fileInputRef.current?.click()}>
                  {imagePreview
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={imagePreview} alt="" className="h-9 w-9 rounded-lg object-cover ring-1 ring-white/10" />
                    : <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/8 bg-white/4 text-slate-500"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 16l4-4 4 4 4-6 4 6M4 20h16a2 2 0 002-2V6a2 2 0 00-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg></div>
                  }
                  <div className="flex-1 text-sm text-slate-400">{imageFile ? imageFile.name : "Attach image (optional)"}</div>
                  {imageFile && <button type="button" className="text-xs text-slate-600 hover:text-rose-400 transition" onClick={(ev) => { ev.stopPropagation(); setImageFile(null); setImagePreview(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}>Remove</button>}
                </div>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleImageUpload} />
                <input className="h-10 rounded-xl border border-white/8 bg-slate-900/80 px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/30 transition"
                  value={imageUrl} onChange={(e) => { setImageUrl(e.target.value); if (e.target.value) { setImageFile(null); setImagePreview(""); } }}
                  placeholder="Or paste image URL" maxLength={500} disabled={!!imageFile} />
                <textarea className="min-h-28 rounded-xl border border-white/8 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/30 transition resize-none"
                  value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message *" maxLength={1500} required />
                <div className="overflow-hidden rounded-xl border border-white/6 bg-[#0d1117]">
                  <div className="h-[3px] w-full" style={{ backgroundColor: color || "#22c55e" }} />
                  <div className="px-4 py-3">
                    <div className="text-sm font-semibold text-white">{title || "Preview title"}</div>
                    <div className="mt-0.5 text-sm text-slate-400">{message || "Preview…"}</div>
                  </div>
                </div>
                <button type="submit" disabled={broadcastLoading}
                  className="h-11 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 text-sm font-bold text-white shadow-lg shadow-cyan-500/10 transition hover:opacity-90 hover:scale-[1.01] disabled:opacity-50">
                  {broadcastLoading ? "Sending…" : "Send to Discord"}
                </button>
                {broadcastStatus && (
                  <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${broadcastStatus.startsWith("Could not") || broadcastStatus.startsWith("Failed") ? "border-rose-500/20 bg-rose-500/8 text-rose-300" : "border-emerald-500/20 bg-emerald-500/8 text-emerald-300"}`}>
                    {broadcastStatus}
                  </div>
                )}
              </form>
            </div>
          )}

          {/* ════ ROSTER ════ */}
          {activeTab === "roster" && (
            <div className="grid gap-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight">Admin Roster</h1>
                  <p className="mt-0.5 text-sm text-slate-500">Approve, revoke or deny admin access.</p>
                </div>
                <div className="flex gap-2">
                  {[
                    { label: "Approved", val: roster.filter(r => r.status === "approved").length, color: "text-emerald-400" },
                    { label: "Pending",  val: roster.filter(r => r.status === "pending").length,  color: "text-amber-400" },
                    { label: "Online",   val: roster.filter(r => r.activeNow).length,              color: "text-cyan-400" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-white/8 bg-white/4 px-3 py-1.5 text-center">
                      <div className={`text-sm font-black ${s.color}`}>{s.val}</div>
                      <div className="text-[10px] text-slate-600">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              {rosterLoading && <div className="text-sm text-slate-500">Loading…</div>}
              {rosterError && <div className="rounded-xl border border-rose-500/20 bg-rose-500/8 px-4 py-3 text-sm text-rose-300">{rosterError}</div>}
              <div className="rounded-2xl border border-white/6 bg-gradient-to-b from-slate-900/80 to-slate-950/80 overflow-hidden">
                <div className="divide-y divide-white/4">
                  {roster.length === 0 && !rosterLoading && <div className="py-10 text-center text-sm text-slate-600">No admins yet.</div>}
                  {roster.map((entry) => (
                    <div key={entry.id} className={`flex items-center gap-3 px-5 py-4 ${entry.isOwner ? "bg-amber-400/4" : ""}`}>
                      <div className="relative shrink-0">
                        {entry.avatarUrl
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={entry.avatarUrl} alt="" className={`h-10 w-10 rounded-xl object-cover ${entry.isOwner ? "ring-2 ring-amber-400/40" : "ring-1 ring-white/8"}`} />
                          : <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${entry.isOwner ? "ring-2 ring-amber-400/40 bg-amber-400/10 text-amber-300" : "ring-1 ring-white/8 bg-white/4 text-slate-400"}`}>{entry.username[0].toUpperCase()}</div>
                        }
                        <span className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-slate-900 ${entry.activeNow ? "bg-emerald-400" : "bg-slate-700"}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                          {entry.isOwner && <span className="text-amber-300">👑</span>}
                          <span className={entry.isOwner ? "text-amber-200" : "text-slate-100"}>{entry.username}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${entry.status === "approved" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : entry.status === "denied" ? "border-rose-500/20 bg-rose-500/10 text-rose-300" : "border-amber-400/20 bg-amber-400/10 text-amber-300"}`}>{entry.status}</span>
                        </div>
                        <div className="text-xs text-slate-600">{entry.lastActiveAt ? `Last seen ${new Date(entry.lastActiveAt).toLocaleDateString()}` : `Added ${new Date(entry.addedAt).toLocaleDateString()}`}</div>
                      </div>
                      {!entry.isOwner && (
                        <div className="flex shrink-0 gap-1.5">
                          {entry.status !== "approved" && (
                            <button type="button" disabled={rosterActionLoading === entry.discordId + "approved"} onClick={() => void handleRosterAction(entry.discordId, "approved")}
                              className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-40 transition">✓</button>
                          )}
                          {entry.status === "approved" && (
                            <button type="button" disabled={rosterActionLoading === entry.discordId + "pending"} onClick={() => void handleRosterAction(entry.discordId, "pending")}
                              className="rounded-lg border border-slate-500/20 bg-slate-500/10 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:bg-slate-500/20 disabled:opacity-40 transition">Revoke</button>
                          )}
                          {entry.status !== "denied" && entry.status !== "approved" && (
                            <button type="button" disabled={rosterActionLoading === entry.discordId + "denied"} onClick={() => void handleRosterAction(entry.discordId, "denied")}
                              className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 disabled:opacity-40 transition">✕</button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════ STREAMERS ════ */}
          {activeTab === "streamers" && (
            <div className="grid gap-5">
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Streamers</h1>
                <p className="mt-0.5 text-sm text-slate-500">Approve or deny streamer applications.</p>
              </div>
              {streamersLoading && <div className="text-sm text-slate-500">Loading…</div>}
              <div className="rounded-2xl border border-white/6 bg-gradient-to-b from-slate-900/80 to-slate-950/80 overflow-hidden">
                <div className="divide-y divide-white/4">
                  {streamers.length === 0 && !streamersLoading && <div className="py-10 text-center text-sm text-slate-600">No applications yet.</div>}
                  {streamers.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 px-5 py-4">
                      {s.avatarUrl
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={s.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-white/8" />
                        : <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-sm font-bold text-violet-300 ring-1 ring-violet-500/20">{s.username[0].toUpperCase()}</div>
                      }
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-100">
                          {s.username}
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${s.status === "approved" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : s.status === "denied" ? "border-rose-500/20 bg-rose-500/10 text-rose-300" : "border-amber-400/20 bg-amber-400/10 text-amber-300"}`}>{s.status}</span>
                        </div>
                        <div className="truncate text-xs text-slate-500">{s.streamTitle}</div>
                        <a href={s.streamUrl} target="_blank" rel="noopener noreferrer" className="truncate text-xs text-violet-400 hover:underline">{s.streamUrl}</a>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        {s.status !== "approved" && <button type="button" disabled={streamerActionLoading === s.discordId + "approved"} onClick={() => void handleStreamerAction(s.discordId, "approved")} className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-40 transition">✓</button>}
                        {s.status === "approved" && <button type="button" disabled={streamerActionLoading === s.discordId + "pending"} onClick={() => void handleStreamerAction(s.discordId, "pending")} className="rounded-lg border border-slate-500/20 bg-slate-500/10 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:bg-slate-500/20 disabled:opacity-40 transition">Revoke</button>}
                        {s.status !== "denied" && s.status !== "approved" && <button type="button" disabled={streamerActionLoading === s.discordId + "denied"} onClick={() => void handleStreamerAction(s.discordId, "denied")} className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 disabled:opacity-40 transition">✕</button>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════ LOTTERY ════ */}
          {activeTab === "lottery" && (
            <div className="grid gap-5 max-w-lg">
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Lottery</h1>
                <p className="mt-0.5 text-sm text-slate-500">Draw a random winner from active entries.</p>
              </div>
              <input value={lotteryPrize} onChange={(e) => setLotteryPrize(e.target.value)}
                className="h-10 rounded-xl border border-white/8 bg-slate-900/80 px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/30 transition" placeholder="Prize label" />
              <button onClick={() => void handleDrawWinner()} disabled={lotteryDrawing || lotteryEntries.length === 0}
                className="h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-sm font-bold text-white shadow-lg shadow-amber-500/10 transition hover:opacity-90 hover:scale-[1.01] disabled:opacity-40">
                {lotteryDrawing ? "Drawing…" : `🎲 Draw Winner · ${lotteryEntries.length} entries`}
              </button>
              {lotteryStatus && <div className="rounded-xl border border-amber-400/20 bg-amber-500/8 px-4 py-3 text-sm font-semibold text-amber-200">{lotteryStatus}</div>}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-600">Entries ({lotteryEntries.length})</div>
                  {lotteryLoading ? <div className="text-sm text-slate-500">Loading…</div> : lotteryEntries.length === 0 ? <div className="text-sm text-slate-600">No entries yet.</div> : (
                    <div className="rounded-xl border border-white/6 bg-slate-900/60 overflow-hidden divide-y divide-white/4 max-h-60 overflow-y-auto">
                      {lotteryEntries.map((e) => (
                        <div key={e.id} className="flex items-center gap-2 px-3 py-2">
                          {e.avatarUrl ? <img src={e.avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover" /> : <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/15 text-[10px] font-bold text-amber-300">{e.username[0].toUpperCase()}</div>}
                          <div className="flex-1 text-sm text-slate-200">{e.username}</div>
                          <div className="text-[11px] text-slate-600">{new Date(e.enteredAt).toLocaleTimeString()}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-600">Past Winners</div>
                  {lotteryDraws.length === 0 ? <div className="text-sm text-slate-600">No draws yet.</div> : (
                    <div className="rounded-xl border border-white/6 bg-slate-900/60 overflow-hidden divide-y divide-white/4 max-h-60 overflow-y-auto">
                      {lotteryDraws.map((d) => (
                        <div key={d.id} className="flex items-center gap-2 px-3 py-2.5">
                          <span className="text-base">🏆</span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-slate-100">{d.winnerUsername}</div>
                            <div className="truncate text-xs text-slate-500">{d.prize}</div>
                          </div>
                          <div className="shrink-0 text-[11px] text-slate-600">{new Date(d.drawnAt).toLocaleDateString()}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ════ MOD LOG ════ */}
          {activeTab === "modlog" && (
            <div className="grid gap-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight">Moderation Log</h1>
                  <p className="mt-0.5 text-sm text-slate-500">All warn / ban / unban actions performed via the admin panel.</p>
                </div>
                <button type="button" onClick={() => { setShowModModal(true); setModTargetId(""); }}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-orange-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-rose-500/15 hover:opacity-90 transition">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  New Action
                </button>
              </div>

              {modStatus && (
                <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${modStatus.startsWith("✓") ? "border-emerald-500/20 bg-emerald-500/8 text-emerald-300" : "border-rose-500/20 bg-rose-500/8 text-rose-300"}`}>{modStatus}</div>
              )}

              <div className="rounded-2xl border border-white/6 bg-gradient-to-b from-slate-900/80 to-slate-950/80 overflow-hidden">
                <div className="border-b border-white/6 px-5 py-3 grid grid-cols-[1fr_1fr_1fr_auto] gap-4 text-[11px] font-semibold uppercase tracking-widest text-slate-600">
                  <span>Target</span><span>Action</span><span>Reason</span><span>Time</span>
                </div>
                {modLoading && <div className="py-10 text-center text-sm text-slate-600">Loading…</div>}
                {!modLoading && modActions.length === 0 && <div className="py-10 text-center text-sm text-slate-600">No actions recorded yet.</div>}
                <div className="divide-y divide-white/4 max-h-[520px] overflow-y-auto">
                  {modActions.map((a) => (
                    <div key={a.id} className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-4 px-5 py-3 text-sm hover:bg-white/2 transition">
                      <div className="min-w-0">
                        <div className="truncate font-mono text-xs text-slate-300">{a.target_discord_id}</div>
                        <div className="text-[11px] text-slate-600">by {a.actor_username}</div>
                      </div>
                      <div>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${actionColor[a.action] ?? "bg-white/8 text-slate-400 border-white/10"}`}>{a.action}</span>
                      </div>
                      <div className="truncate text-xs text-slate-400">{a.reason || "—"}</div>
                      <div className="shrink-0 text-[11px] text-slate-600 whitespace-nowrap">{new Date(a.created_at).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════ WIPE TIMER ════ */}
          {activeTab === "wipe" && (
            <div className="grid gap-5 max-w-md">
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Wipe Timer</h1>
                <p className="mt-0.5 text-sm text-slate-500">Set a countdown shown on the Community page.</p>
              </div>
              <div className="rz-surface rz-panel-border rounded-2xl p-5 grid gap-4">
                <div className="grid gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">Label</label>
                  <input
                    className="h-11 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none placeholder:text-slate-500"
                    value={wipeLabel}
                    onChange={e => setWipeLabel(e.target.value)}
                    placeholder="e.g. Next Server Wipe"
                    maxLength={80}
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">Wipe Date &amp; Time</label>
                  <input
                    type="datetime-local"
                    className="h-11 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none"
                    value={wipeAt}
                    onChange={e => setWipeAt(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={wipeSaving || !wipeAt}
                    onClick={async () => {
                      setWipeSaving(true); setWipeStatus("");
                      const res = await fetch("/api/admin/wipe-timer", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ wipeAt: new Date(wipeAt).toISOString(), label: wipeLabel }),
                      });
                      const data = await res.json().catch(() => ({}));
                      setWipeSaving(false);
                      setWipeStatus(res.ok ? "✓ Wipe timer saved. Community page updated." : `Failed: ${data?.error ?? data?.code ?? res.status}`);
                    }}
                    className="h-11 flex-1 rounded-2xl bg-amber-400/15 text-sm font-bold text-amber-300 hover:bg-amber-400/25 disabled:opacity-50 transition"
                  >
                    {wipeSaving ? "Saving…" : "Set Timer"}
                  </button>
                  <button
                    type="button"
                    disabled={wipeSaving}
                    onClick={async () => {
                      setWipeSaving(true); setWipeStatus("");
                      const res = await fetch("/api/admin/wipe-timer", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ wipeAt: null, label: wipeLabel }),
                      });
                      setWipeSaving(false);
                      setWipeAt("");
                      setWipeStatus(res.ok ? "✓ Timer cleared." : "Failed to clear.");
                    }}
                    className="h-11 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-slate-300 hover:bg-white/10 disabled:opacity-50 transition"
                  >
                    Clear
                  </button>
                </div>
                {wipeStatus && (
                  <div className="rounded-xl border border-white/8 bg-white/4 px-4 py-2.5 text-sm text-slate-200">{wipeStatus}</div>
                )}
              </div>
              {wipeAt && (
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 px-5 py-3">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Preview</div>
                  <div className="text-sm text-amber-300 font-semibold">{wipeLabel}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{new Date(wipeAt).toLocaleString()}</div>
                </div>
              )}
            </div>
          )}

            </div>{/* /p-4 */}
          </main>
        </div>
      )}

      {/* ════ MODERATION MODAL ════ */}
      {showModModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setShowModModal(false); }}>
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/8 bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl shadow-black/60">
            <div className="h-0.5 w-full bg-gradient-to-r from-rose-500 via-orange-500 to-amber-400" />
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-base font-bold text-white">Moderate Member</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Actions are permanent and logged.</p>
                </div>
                <button type="button" onClick={() => setShowModModal(false)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/8 hover:text-white transition">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <form onSubmit={handleModerate} className="grid gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-400 uppercase tracking-widest">Action</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["warn", "ban", "unban"] as const).map((a) => (
                      <button key={a} type="button" onClick={() => setModAction(a)}
                        className={`rounded-xl border py-2.5 text-sm font-bold transition ${modAction === a
                          ? a === "ban" ? "border-rose-500/40 bg-rose-500/20 text-rose-200"
                            : a === "warn" ? "border-amber-400/40 bg-amber-400/15 text-amber-200"
                            : "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
                          : "border-white/8 bg-white/4 text-slate-400 hover:text-white hover:bg-white/8"}`}>
                        {a === "warn" ? "⚠ Warn" : a === "ban" ? "🔨 Ban" : "✓ Unban"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-400 uppercase tracking-widest">Discord ID</label>
                  <input className="h-10 w-full rounded-xl border border-white/8 bg-slate-900/80 px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/30 font-mono transition"
                    value={modTargetId} onChange={(e) => setModTargetId(e.target.value)} placeholder="e.g. 940804710267486249" required />
                  {filteredMembers.length > 0 && modTargetId === "" && selectedMember && (
                    <button type="button" className="mt-1 text-xs text-cyan-400 hover:underline" onClick={() => setModTargetId(selectedMember.discordId)}>
                      Use selected: {getMemberName(selectedMember)} ({selectedMember.discordId})
                    </button>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-400 uppercase tracking-widest">Reason</label>
                  <textarea className="w-full rounded-xl border border-white/8 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/30 resize-none transition"
                    rows={3} value={modReason} onChange={(e) => setModReason(e.target.value)} placeholder="Describe the reason for this action…" maxLength={512} />
                </div>
                {modStatus && !modStatus.startsWith("✓") && (
                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/8 px-4 py-2.5 text-sm text-rose-300">{modStatus}</div>
                )}
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setShowModModal(false)} className="flex-1 rounded-xl border border-white/8 bg-white/4 py-2.5 text-sm font-semibold text-slate-400 hover:bg-white/8 transition">Cancel</button>
                  <button type="submit" disabled={modWorking}
                    className={`flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50 ${
                      modAction === "ban" ? "bg-gradient-to-r from-rose-600 to-red-700 shadow-rose-500/15"
                      : modAction === "warn" ? "bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-500/15"
                      : "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/15"
                    } shadow-lg`}>
                    {modWorking ? "Working…" : modAction === "ban" ? "🔨 Confirm Ban" : modAction === "warn" ? "⚠ Send Warning" : "✓ Unban"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-white/8 bg-slate-950/98 backdrop-blur-xl md:hidden safe-area-inset-bottom">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => switchTab(tab.id)}
            className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[9px] font-bold transition-all duration-150 active:scale-90 ${
              activeTab === tab.id ? "text-cyan-300" : "text-slate-600 hover:text-slate-400"
            }`}
          >
            {activeTab === tab.id && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
            )}
            <span className={`text-lg leading-none transition-transform duration-150 ${activeTab === tab.id ? "scale-110" : ""}`}>{tab.icon}</span>
            {tab.label}
            {"badge" in tab && tab.badge > 0 && (
              <span className="absolute right-[18%] top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 text-[8px] font-black text-slate-950">{tab.badge}</span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
