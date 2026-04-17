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
  const [password, setPassword] = useState("");
  const [isAuthed, setIsAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

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
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [imageFileName, setImageFileName] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [broadcastStatus, setBroadcastStatus] = useState("");
  const [broadcastLoading, setBroadcastLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<"dashboard" | "roster">("dashboard");
  const [roster, setRoster] = useState<AdminEntry[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState("");
  const [rosterActionLoading, setRosterActionLoading] = useState<string | null>(null);

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

    const timer = window.setInterval(() => {
      void loadStats();
    }, 15000);

    return () => window.clearInterval(timer);
  }, [isAuthed]);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setAuthError(data?.error || "Login failed.");
      setAuthLoading(false);
      return;
    }

    setPassword("");
    setIsAuthed(true);
    setAuthLoading(false);
    await loadStats();
  }

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

    const res = await fetch("/api/admin/broadcast", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ target, audienceLabel, title, message, color, imageUrl, imageDataUrl }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setBroadcastStatus(data?.error || "Could not send Discord message.");
      setBroadcastLoading(false);
      return;
    }

    setTitle("");
    setMessage("");
    setImageUrl("");
    setImageDataUrl("");
    setImageFileName("");
    setBroadcastStatus("Discord message sent successfully.");
    setBroadcastLoading(false);
    await loadStats();
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    setImageDataUrl("");
    setImageFileName("");
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBroadcastStatus(data?.error || "Image upload failed.");
      setImageUploading(false);
      return;
    }
    setImageDataUrl(data.dataUrl);
    setImageFileName(data.name);
    setImageUrl("");
    setImageUploading(false);
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

  async function handleRosterAction(discordId: string, status: "approved" | "denied" | "pending") {
    setRosterActionLoading(discordId + status);
    const res = await fetch("/api/admin/roster", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ discordId, status }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setRosterError(data?.error || "Action failed.");
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

  return (
    <div className="grid gap-6">
      {!isAuthed ? (
        <section className="rz-surface rz-panel-border max-w-xl rounded-[2rem] p-6">
          <div className="rz-chip">Locked Access</div>
          <h2 className="mt-4 text-2xl font-semibold text-white">Admin sign in</h2>
          <p className="mt-2 text-sm text-slate-300">
            Sign in with your Discord account. Only authorized admins can access this panel.
          </p>

          <a
            href="/auth/admin/start"
            className="mt-6 flex h-12 items-center justify-center gap-3 rounded-2xl bg-[#5865F2] px-5 text-sm font-semibold text-white transition hover:scale-[1.01] hover:bg-[#4752c4]"
          >
            <svg width="20" height="20" viewBox="0 0 71 55" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M60.1 4.9A58.5 58.5 0 0 0 45.5.4a.2.2 0 0 0-.2.1 40.7 40.7 0 0 0-1.8 3.7 54 54 0 0 0-16.2 0A37.4 37.4 0 0 0 25.4.5a.2.2 0 0 0-.2-.1A58.4 58.4 0 0 0 10.6 4.9a.2.2 0 0 0-.1.1C1.6 18.1-.9 31 .3 43.7a.2.2 0 0 0 .1.2 58.8 58.8 0 0 0 17.7 9 .2.2 0 0 0 .2-.1 42 42 0 0 0 3.6-5.9.2.2 0 0 0-.1-.3 38.7 38.7 0 0 1-5.5-2.6.2.2 0 0 1 0-.4c.4-.3.7-.6 1.1-.9a.2.2 0 0 1 .2 0c11.5 5.3 24 5.3 35.4 0a.2.2 0 0 1 .2 0l1.1.9a.2.2 0 0 1 0 .4 36.2 36.2 0 0 1-5.5 2.6.2.2 0 0 0-.1.3 47.1 47.1 0 0 0 3.6 5.9.2.2 0 0 0 .2.1 58.7 58.7 0 0 0 17.7-9 .2.2 0 0 0 .1-.2c1.5-14.9-2.5-27.8-10.5-39.2a.2.2 0 0 0-.1 0ZM23.7 36.2c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 4-2.8 7.2-6.4 7.2Zm23.7 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 4-2.8 7.2-6.4 7.2Z" fill="currentColor"/>
            </svg>
            Sign in with Discord
          </a>

          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-slate-500">or use password</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <form className="mt-4 grid gap-4" onSubmit={handleLogin}>
            <input
              type="password"
              className="h-12 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none placeholder:text-slate-500"
              placeholder="Admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={authLoading}
              className="h-12 rounded-2xl bg-white/8 border border-white/10 px-5 text-sm font-semibold text-white transition hover:scale-[1.01] hover:bg-white/12 disabled:opacity-70"
            >
              {authLoading ? "Unlocking..." : "Unlock with password"}
            </button>
            {authError || statsError ? (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {authError || statsError}
              </div>
            ) : null}
          </form>
        </section>
      ) : (
        <>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("dashboard")}
              className={`rounded-2xl border px-5 py-2.5 text-sm font-semibold transition ${
                activeTab === "dashboard"
                  ? "border-cyan-300/30 bg-cyan-400/10 text-cyan-100"
                  : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab("roster"); void loadRoster(); }}
              className={`relative rounded-2xl border px-5 py-2.5 text-sm font-semibold transition ${
                activeTab === "roster"
                  ? "border-cyan-300/30 bg-cyan-400/10 text-cyan-100"
                  : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              Admin Roster
              {roster.filter((a) => a.status === "pending").length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-slate-950">
                  {roster.filter((a) => a.status === "pending").length}
                </span>
              )}
            </button>
          </div>

          {activeTab === "roster" ? (
            <section className="rz-surface rz-panel-border rounded-[2rem] p-6">
              <div className="rz-chip">Admin Roster</div>
              <h2 className="mt-3 text-2xl font-semibold text-white">Manage admin access</h2>
              <p className="mt-2 text-sm text-slate-300">
                Approve or deny Discord accounts that have requested admin access. Owners (in ADMIN_DISCORD_IDS) are always approved.
              </p>
              <div className="mt-6 grid gap-3">
                {rosterLoading ? (
                  <div className="text-sm text-slate-400">Loading...</div>
                ) : rosterError ? (
                  <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{rosterError}</div>
                ) : roster.length === 0 ? (
                  <div className="rounded-[1.5rem] border border-dashed border-white/12 bg-slate-950/45 px-4 py-6 text-sm text-slate-400">
                    No admins have attempted login yet.
                  </div>
                ) : (
                  roster.map((entry) => (
                    <div key={entry.id} className="flex flex-col gap-3 rounded-[1.5rem] border border-white/8 bg-slate-950/65 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        {entry.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={entry.avatarUrl} alt={entry.username} className="h-10 w-10 rounded-full border border-white/10 object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-slate-300">
                            {entry.username.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-semibold text-white">{entry.username}</div>
                          <div className="mt-0.5 text-xs text-slate-400">Discord ID: {entry.discordId}</div>
                          <div className="mt-0.5 text-xs text-slate-500">Requested: {new Date(entry.addedAt).toLocaleString()}</div>
                        </div>
                        <span className={`ml-2 rounded-full px-3 py-1 text-xs font-semibold ${
                          entry.status === "approved" ? "bg-emerald-500/15 text-emerald-200"
                          : entry.status === "denied" ? "bg-rose-500/15 text-rose-200"
                          : "bg-amber-400/15 text-amber-200"
                        }`}>
                          {entry.status}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {entry.status !== "approved" && (
                          <button
                            type="button"
                            disabled={rosterActionLoading === entry.discordId + "approved"}
                            onClick={() => void handleRosterAction(entry.discordId, "approved")}
                            className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/20 disabled:opacity-50"
                          >
                            Approve
                          </button>
                        )}
                        {entry.status !== "denied" && (
                          <button
                            type="button"
                            disabled={rosterActionLoading === entry.discordId + "denied"}
                            onClick={() => void handleRosterAction(entry.discordId, "denied")}
                            className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/20 disabled:opacity-50"
                          >
                            Deny
                          </button>
                        )}
                        {entry.status === "approved" && (
                          <button
                            type="button"
                            disabled={rosterActionLoading === entry.discordId + "pending"}
                            onClick={() => void handleRosterAction(entry.discordId, "pending")}
                            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          ) : null}

          {activeTab === "dashboard" ? (<><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rz-surface rz-panel-border rounded-[2rem] p-5">
              <div className="text-xs uppercase tracking-[0.25em] text-cyan-200/70">Active Now</div>
              <div className="mt-3 text-4xl font-semibold text-white">
                {stats?.summary.activeNowCount ?? 0}
              </div>
              <div className="mt-2 text-sm text-slate-300">
                Members active in the last {stats?.activeWindowMinutes ?? 15} minutes.
              </div>
            </div>
            <div className="rz-surface rz-panel-border rounded-[2rem] p-5">
              <div className="text-xs uppercase tracking-[0.25em] text-cyan-200/70">
                Members Tracked
              </div>
              <div className="mt-3 text-4xl font-semibold text-white">
                {stats?.summary.totalMembersTracked ?? 0}
              </div>
              <div className="mt-2 text-sm text-slate-300">Unique members in the activity log.</div>
            </div>
            <div className="rz-surface rz-panel-border rounded-[2rem] p-5">
              <div className="text-xs uppercase tracking-[0.25em] text-cyan-200/70">Active Days</div>
              <div className="mt-3 text-4xl font-semibold text-white">
                {stats?.summary.activeDaysObserved ?? 0}
              </div>
              <div className="mt-2 text-sm text-slate-300">Distinct days with tracked activity.</div>
            </div>
            <div className="rz-surface rz-panel-border rounded-[2rem] p-5">
              <div className="text-xs uppercase tracking-[0.25em] text-cyan-200/70">Event Feed</div>
              <div className="mt-3 text-4xl font-semibold text-white">
                {stats?.summary.totalEvents ?? 0}
              </div>
              <div className="mt-2 text-sm text-slate-300">Live events powering the tracker.</div>
            </div>
            <div className="rz-surface rz-panel-border rounded-[2rem] p-5">
              <div className="text-xs uppercase tracking-[0.25em] text-cyan-200/70">Last Sync</div>
              <div className="mt-3 text-xl font-semibold text-white">
                {lastSyncAt ? new Date(lastSyncAt).toLocaleTimeString() : "Waiting"}
              </div>
              <div className="mt-2 text-sm text-slate-300">
                Refreshes automatically every 15 seconds.
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="grid gap-6">
              <section className="rz-surface rz-panel-border rounded-[2rem] p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="rz-chip">Discord Broadcast</div>
                    <h2 className="mt-3 text-2xl font-semibold text-white">
                      Send a custom message
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
                  >
                    Log out
                  </button>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {pageOptions.map((option) => (
                    <div
                      key={option.value}
                      className={`rounded-[1.5rem] border px-4 py-4 ${
                        target === option.value
                          ? "border-cyan-300/30 bg-cyan-400/10"
                          : "border-white/8 bg-slate-950/55"
                      }`}
                    >
                      <div className="text-sm font-semibold text-white">{option.label}</div>
                      <div className="mt-1 text-sm text-slate-300">{option.note}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-5">
                  <div className="text-sm font-semibold text-white">Quick presets</div>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {broadcastPresets.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => applyPreset(preset)}
                        className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <form className="mt-6 grid gap-4" onSubmit={handleBroadcast}>
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-white">Target route</span>
                    <select
                      className="h-12 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none"
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                    >
                      {pageOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-white">Custom audience label</span>
                    <input
                      className="h-12 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none placeholder:text-slate-500"
                      value={audienceLabel}
                      onChange={(e) => setAudienceLabel(e.target.value)}
                      placeholder="staff chat, main page, bans, alerts..."
                      maxLength={80}
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-white">Message title</span>
                    <input
                      className="h-12 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none placeholder:text-slate-500"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Maintenance, promotion, outage, reminder..."
                      maxLength={80}
                      required
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-white">Embed color</span>
                    <div className="flex gap-3">
                      <input
                        type="color"
                        className="h-12 w-16 rounded-2xl border border-white/10 bg-slate-950/70 p-1"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                      />
                      <input
                        className="h-12 flex-1 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none placeholder:text-slate-500"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        placeholder="#22c55e"
                        maxLength={7}
                      />
                    </div>
                  </label>

                  <div className="grid gap-2">
                    <span className="text-sm font-semibold text-white">Embed image</span>
                    <div className="grid gap-2">
                      <div
                        className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-white/20 bg-slate-950/55 px-4 py-4 transition hover:border-cyan-300/40"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {imageDataUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imageDataUrl} alt="preview" className="h-12 w-12 rounded-xl object-cover border border-white/10" />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 16l4-4 4 4 4-6 4 6M4 20h16a2 2 0 002-2V6a2 2 0 00-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-semibold text-white">
                            {imageUploading ? "Uploading..." : imageFileName || "Upload an image"}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-400">JPEG, PNG, GIF, WebP · max 8 MB</div>
                        </div>
                        {imageDataUrl && (
                          <button
                            type="button"
                            className="ml-auto text-xs text-slate-400 hover:text-red-300"
                            onClick={(ev) => { ev.stopPropagation(); setImageDataUrl(""); setImageFileName(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={imageUploading}
                      />
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-white/10" />
                        <span className="text-xs text-slate-500">or paste URL</span>
                        <div className="h-px flex-1 bg-white/10" />
                      </div>
                      <input
                        className="h-12 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none placeholder:text-slate-500"
                        value={imageUrl}
                        onChange={(e) => { setImageUrl(e.target.value); if (e.target.value) { setImageDataUrl(""); setImageFileName(""); } }}
                        placeholder="https://example.com/banner.png"
                        maxLength={500}
                        disabled={!!imageDataUrl}
                      />
                    </div>
                  </div>

                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-white">Discord message</span>
                    <textarea
                      className="min-h-40 rounded-[1.5rem] border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Write the exact message you want posted to Discord."
                      maxLength={1500}
                      required
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={broadcastLoading}
                    className="h-12 rounded-2xl bg-[linear-gradient(135deg,#f59e0b,#67e8f9)] px-5 text-sm font-semibold text-slate-950 transition hover:scale-[1.01] disabled:opacity-70"
                  >
                    {broadcastLoading ? "Sending..." : "Send to Discord"}
                  </button>

                  {broadcastStatus ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100">
                      {broadcastStatus}
                    </div>
                  ) : null}
                </form>

                <div className="mt-6 rounded-[1.5rem] border border-white/8 bg-slate-950/55 p-4">
                  <div className="text-xs uppercase tracking-[0.24em] text-cyan-200/70">
                    Message Preview
                  </div>
                  <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-white/8 bg-[#111827]">
                    <div className="h-1.5 w-full" style={{ backgroundColor: color || "#22c55e" }} />
                    <div className="p-4">
                      <div className="text-sm font-semibold text-white">
                        {title || "Your title will appear here"}
                      </div>
                      <div className="mt-2 text-sm leading-6 text-slate-300">
                        {message || "Your Discord message preview will appear here."}
                      </div>
                      <div className="mt-3 text-xs text-slate-400">
                        Route: {pageOptions.find((option) => option.value === target)?.label || target}
                        {" | "}
                        Label: {audienceLabel || "Default"}
                      </div>
                      {imageUrl ? (
                        <div className="mt-4">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imageUrl}
                            alt="Discord embed preview"
                            className="max-h-48 w-full rounded-xl border border-white/8 object-cover"
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </section>

              <section className="rz-surface rz-panel-border rounded-[2rem] p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="rz-chip">Recent Events</div>
                    <h2 className="mt-3 text-2xl font-semibold text-white">Activity stream</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadStats()}
                    disabled={refreshing}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-70"
                  >
                    {refreshing ? "Refreshing..." : "Refresh now"}
                  </button>
                </div>

                <div className="mt-5 grid gap-3 lg:grid-cols-5">
                  <button
                    type="button"
                    onClick={() => setEventFilter("all")}
                    className={`rounded-2xl border px-4 py-3 text-left text-sm ${
                      eventFilter === "all"
                        ? "border-cyan-300/30 bg-cyan-400/10 text-cyan-100"
                        : "border-white/8 bg-slate-950/55 text-slate-300"
                    }`}
                  >
                    All events
                    <div className="mt-1 text-xs opacity-80">{stats?.recent.length ?? 0}</div>
                  </button>
                  {["login", "support_ticket", "purchase_intent", "admin_broadcast"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setEventFilter(type)}
                      className={`rounded-2xl border px-4 py-3 text-left text-sm ${
                        eventFilter === type
                          ? "border-cyan-300/30 bg-cyan-400/10 text-cyan-100"
                          : "border-white/8 bg-slate-950/55 text-slate-300"
                      }`}
                    >
                      {formatEventType(type)}
                      <div className="mt-1 text-xs opacity-80">{eventTotals[type] ?? 0}</div>
                    </button>
                  ))}
                </div>

                <div className="mt-5 grid gap-3">
                  {filteredRecent.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex flex-col gap-2 rounded-[1.5rem] border border-white/8 bg-slate-950/65 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-3">
                          {entry.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={entry.avatarUrl}
                              alt={entry.username || "User avatar"}
                              className="h-10 w-10 rounded-full border border-white/10 object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-semibold text-slate-300">
                              {(entry.username || "G").slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-semibold text-white">
                              {entry.username || "Guest"} | {formatEventType(entry.type)}
                            </div>
                            {entry.globalName ? (
                              <div className="mt-1 text-xs text-cyan-200/80">
                                Display name: {entry.globalName}
                              </div>
                            ) : null}
                            <div className="mt-1 text-xs text-slate-400">
                              {entry.discordId ? `Discord ID: ${entry.discordId}` : "No Discord ID recorded"}
                              {entry.discriminator ? ` | Tag: ${entry.discriminator}` : ""}
                            </div>
                          </div>
                        </div>
                        <div className="mt-1 text-sm text-slate-300">{entry.details}</div>
                        {entry.profile ? (
                          <div className="mt-2 text-xs text-slate-400">
                            Locale: {String(entry.profile.locale ?? "N/A")} | Verified:{" "}
                            {String(entry.profile.verified ?? "Unknown")}
                          </div>
                        ) : null}
                      </div>
                      <div className="text-xs text-slate-400">
                        {new Date(entry.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="grid gap-6">
              <section className="rz-surface rz-panel-border rounded-[2rem] p-6">
                <div className="rz-chip">Member Tracker</div>
                <h2 className="mt-3 text-2xl font-semibold text-white">Live member activity</h2>
                <p className="mt-2 text-sm text-slate-300">
                  Search members, see who is active now, and open their Discord profile data.
                </p>
                <div className="mt-4">
                  <input
                    className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none placeholder:text-slate-500"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search by username, display name, or Discord ID"
                  />
                </div>
                <div className="mt-5 grid gap-3">
                  {filteredMembers.length ? (
                    filteredMembers.map((member) => (
                      <button
                        key={member.discordId}
                        type="button"
                        onClick={() => setSelectedMemberId(member.discordId)}
                        className={`rounded-[1.5rem] border px-4 py-4 text-left ${
                          selectedMember?.discordId === member.discordId
                            ? "border-cyan-300/30 bg-cyan-400/10"
                            : "border-white/8 bg-slate-950/65"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            {member.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={member.avatarUrl}
                                alt={member.username}
                                className="h-12 w-12 rounded-full border border-white/10 object-cover"
                              />
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-slate-300">
                                {member.username.slice(0, 1).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="text-base font-semibold text-white">
                                {getMemberName(member)}
                              </div>
                              {member.globalName ? (
                                <div className="mt-1 text-xs text-slate-300">@{member.username}</div>
                              ) : null}
                              <div className="mt-1 text-xs text-slate-400">
                                Discord ID: {member.discordId}
                                {member.discriminator ? ` | Tag: ${member.discriminator}` : ""}
                              </div>
                            </div>
                          </div>
                          <div
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              member.activeNow
                                ? "bg-emerald-500/15 text-emerald-200"
                                : "bg-white/8 text-slate-300"
                            }`}
                          >
                            {member.activeNow ? "Live" : "Idle"}
                          </div>
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <div className="text-slate-500">Events</div>
                            <div className="mt-1 font-semibold text-white">{member.events}</div>
                          </div>
                          <div>
                            <div className="text-slate-500">Days active</div>
                            <div className="mt-1 font-semibold text-white">{member.activeDays}</div>
                          </div>
                          <div>
                            <div className="text-slate-500">Last seen</div>
                            <div className="mt-1 font-semibold text-white">
                              {new Date(member.lastActiveAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-[1.5rem] border border-dashed border-white/12 bg-slate-950/45 px-4 py-6 text-sm text-slate-400">
                      No member activity has been logged yet.
                    </div>
                  )}
                </div>
              </section>

              <section className="rz-surface rz-panel-border rounded-[2rem] p-6">
                <div className="rz-chip">Profile Details</div>
                <h2 className="mt-3 text-2xl font-semibold text-white">Selected member</h2>
                {selectedMember ? (
                  <>
                    <div className="mt-5 flex items-center gap-4">
                      {selectedMember.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={selectedMember.avatarUrl}
                          alt={selectedMember.username}
                          className="h-16 w-16 rounded-full border border-white/10 object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg font-semibold text-slate-300">
                          {selectedMember.username.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="text-xl font-semibold text-white">
                          {getMemberName(selectedMember)}
                        </div>
                        <div className="mt-1 text-sm text-slate-300">@{selectedMember.username}</div>
                        <div className="mt-1 text-xs text-slate-400">
                          Discord ID: {selectedMember.discordId}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[1.25rem] border border-white/8 bg-slate-950/55 p-4">
                        <div className="text-xs uppercase tracking-[0.24em] text-cyan-200/70">
                          Presence
                        </div>
                        <div className="mt-3 text-sm text-slate-300">
                          Status: {selectedMember.activeNow ? "Live now" : "Idle"}
                        </div>
                        <div className="mt-1 text-sm text-slate-300">
                          Last seen: {new Date(selectedMember.lastActiveAt).toLocaleString()}
                        </div>
                        <div className="mt-1 text-sm text-slate-300">
                          Active days: {selectedMember.activeDays}
                        </div>
                        <div className="mt-1 text-sm text-slate-300">
                          Total events: {selectedMember.events}
                        </div>
                      </div>
                      <div className="rounded-[1.25rem] border border-white/8 bg-slate-950/55 p-4">
                        <div className="text-xs uppercase tracking-[0.24em] text-cyan-200/70">
                          Discord Data
                        </div>
                        <div className="mt-3 text-sm text-slate-300">
                          Locale: {String(selectedMember.profile?.locale ?? "Not provided")}
                        </div>
                        <div className="mt-1 text-sm text-slate-300">
                          Verified: {String(selectedMember.profile?.verified ?? "Unknown")}
                        </div>
                        <div className="mt-1 text-sm text-slate-300">
                          Banner color: {String(selectedMember.profile?.banner_color ?? "None")}
                        </div>
                        <div className="mt-1 text-sm text-slate-300">
                          Accent color: {String(selectedMember.profile?.accent_color ?? "None")}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 rounded-[1.25rem] border border-white/8 bg-slate-950/55 p-4">
                      <div className="text-xs uppercase tracking-[0.24em] text-cyan-200/70">
                        Raw Discord Profile
                      </div>
                      <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-xs leading-6 text-slate-300">
                        {selectedMemberProfileJson || "No raw Discord profile saved yet."}
                      </pre>
                    </div>
                  </>
                ) : (
                  <div className="mt-4 rounded-[1.5rem] border border-dashed border-white/12 bg-slate-950/45 px-4 py-6 text-sm text-slate-400">
                    Pick a member from the tracker to view full Discord details.
                  </div>
                )}
              </section>
            </div>
          </section>
        </>) : null}
        </>
      )}
    </div>
  );
}
