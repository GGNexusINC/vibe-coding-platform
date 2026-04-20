"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ActivityEntry = {
  id: string;
  type: string;
  createdAt: string;
  username?: string;
  discordId?: string;
  avatarUrl?: string | null;
  globalName?: string | null;
  details?: string;
  metadata?: {
    pageUrl?: string;
    ip?: string;
    os?: string;
    browser?: string;
    device?: string;
    userAgent?: string;
    isAdmin?: boolean;
    timestamp?: string;
  };
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
  activeMinutes?: number;
  events: number;
  activeNow: boolean;
  isAdmin?: boolean;
  isBot?: boolean;
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

type PendingBanApproval = {
  discord_id: string;
  username: string;
  approved_at: string;
  note?: string;
};

type PendingBan = {
  id: string;
  target_discord_id: string;
  target_username: string | null;
  reason: string;
  proposed_by_discord_id: string;
  proposed_by_username: string;
  proposed_at: string;
  status: "pending" | "approved" | "executed" | "rejected";
  approvals: PendingBanApproval[];
  required_approvals: number;
  executed_at?: string;
  executed_by_discord_id?: string;
  executed_by_username?: string;
  rejection_reason?: string;
  rejected_by_discord_id?: string;
  rejected_by_username?: string;
  rejected_at?: string;
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
  { value: "staff-page", label: "Staff Page", note: "Staff-only announcements and internal alerts." },
  { value: "wipe", label: "😺 Wipe", note: "Wipe cycle announcements and new season alerts." },
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
  {
    label: "😺 Wipe incoming",
    target: "wipe",
    audienceLabel: "wipe channel",
    title: "😺𝑾𝒊𝒑𝒆 — New Season Starting",
    message: "A new wipe is starting! Head to the store to grab your wipe packs and secure your VIP perks for this season. Good luck out there!",
    color: "#a855f7",
  },
  {
    label: "😺 Wipe complete",
    target: "wipe",
    audienceLabel: "wipe channel",
    title: "😺𝑾𝒊𝒑𝒆 — Season Ended",
    message: "The wipe has completed. Thank you for playing this season! Stay tuned for the next wipe announcement.",
    color: "#06b6d4",
  },
];

function formatEventType(type: string) {
  return type.replaceAll("_", " ");
}

function getEventIcon(type: string) {
  switch (type) {
    case "login": return "🟢";
    case "logout": return "🔴";
    case "support_ticket": return "🎫";
    case "purchase_intent": return "🛒";
    case "admin_broadcast": return "📢";
    default: return "⚪";
  }
}

function getEventColor(type: string) {
  switch (type) {
    case "login": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    case "logout": return "text-rose-400 bg-rose-500/10 border-rose-500/20";
    case "support_ticket": return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    case "purchase_intent": return "text-cyan-400 bg-cyan-500/10 border-cyan-500/20";
    case "admin_broadcast": return "text-violet-400 bg-violet-500/10 border-violet-500/20";
    default: return "text-slate-400 bg-slate-500/10 border-slate-500/20";
  }
}

function ActivityFeed({ entries }: { entries: ActivityEntry[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (entries.length === 0) {
    return <div className="py-10 text-center text-sm text-slate-600">No activity yet.</div>;
  }

  return (
    <div className="divide-y divide-white/4 max-h-[520px] overflow-y-auto">
      {entries.map((entry) => {
        const isExpanded = expandedId === entry.id;
        const meta = entry.metadata;
        const isAdmin = meta?.isAdmin || entry.details?.toLowerCase().includes("admin");

        return (
          <div
            key={entry.id}
            className={`group transition-all duration-200 ${isExpanded ? "bg-white/5" : "hover:bg-white/[0.02]"}`}
          >
            {/* Main Row */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : entry.id)}
              className="w-full flex items-center gap-3 px-5 py-3 text-left"
            >
              {/* Avatar */}
              {entry.avatarUrl ? (
                <img
                  src={entry.avatarUrl}
                  alt=""
                  className={`h-9 w-9 shrink-0 rounded-full object-cover border-2 ${isAdmin ? "border-amber-400/50" : "border-white/10"}`}
                />
              ) : (
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${isAdmin ? "bg-amber-500/20 text-amber-300" : "bg-white/5 text-slate-400"}`}>
                  {(entry.username || "G")[0].toUpperCase()}
                </div>
              )}

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`truncate text-sm font-semibold ${isAdmin ? "text-amber-200" : "text-slate-100"}`}>
                    {entry.username || "Guest"}
                  </span>
                  {isAdmin && (
                    <span className="shrink-0 rounded-full border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300">
                      ADMIN
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold border ${getEventColor(entry.type)}`}>
                    {getEventIcon(entry.type)} {formatEventType(entry.type)}
                  </span>
                  <span className="truncate text-xs text-slate-500">
                    {entry.details || "No details"}
                  </span>
                </div>
              </div>

              {/* Time & Expand */}
              <div className="shrink-0 flex items-center gap-2">
                <span className="text-[11px] text-slate-600">
                  {new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                <svg
                  className={`h-4 w-4 text-slate-600 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* Expanded Details */}
            {isExpanded && meta && (
              <div className="px-5 pb-4 pt-1">
                <div className="ml-12 rounded-xl border border-white/8 bg-slate-900/80 p-4">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    {/* Page URL */}
                    {meta.pageUrl && (
                      <div className="col-span-2">
                        <span className="text-slate-500 uppercase tracking-wider font-semibold">Current Page</span>
                        <div className="mt-1 flex items-center gap-2 text-slate-300 bg-slate-950/50 px-2 py-1.5 rounded border border-white/5">
                          <svg className="h-3.5 w-3.5 text-cyan-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          <span className="font-mono text-xs">
                            {meta.pageUrl === "/" ? (
                              <span className="text-emerald-400 font-semibold">🏠 Homepage</span>
                            ) : (
                              <span className="text-cyan-300">{meta.pageUrl}</span>
                            )}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Device Info */}
                    <div>
                      <span className="text-slate-500 uppercase tracking-wider font-semibold">Device</span>
                      <div className="mt-1 flex items-center gap-1.5 text-slate-300">
                        <span className="text-base">{meta.device === "Mobile" ? "📱" : meta.device === "Tablet" ? "📱" : "💻"}</span>
                        <span>{meta.os || "Unknown"}</span>
                        <span className="text-slate-600">•</span>
                        <span>{meta.browser || "Unknown"}</span>
                      </div>
                    </div>

                    {/* IP Address */}
                    <div>
                      <span className="text-slate-500 uppercase tracking-wider font-semibold">IP Address</span>
                      <div className="mt-1 font-mono text-slate-400">
                        {meta.ip || "Unknown"}
                      </div>
                    </div>

                    {/* Full Timestamp */}
                    <div className="col-span-2 pt-2 border-t border-white/5">
                      <span className="text-slate-500 uppercase tracking-wider font-semibold">Full Timestamp</span>
                      <div className="mt-1 text-slate-400 font-mono text-[11px]">
                        {new Date(entry.createdAt).toISOString()}
                      </div>
                    </div>

                    {/* User Agent (collapsible) */}
                    {meta.userAgent && meta.userAgent !== "Unknown" && (
                      <div className="col-span-2">
                        <span className="text-slate-500 uppercase tracking-wider font-semibold">User Agent</span>
                        <div className="mt-1 text-slate-500 text-[10px] break-all font-mono bg-slate-950/30 px-2 py-1.5 rounded">
                          {meta.userAgent}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[10px] text-slate-600">Discord ID: <span className="font-mono text-slate-500">{entry.discordId || "N/A"}</span></span>
                    {entry.discordId && (
                      <a
                        href={`https://discord.com/users/${entry.discordId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-cyan-400 hover:text-cyan-300 transition flex items-center gap-1"
                      >
                        View Discord Profile
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function getMemberName(member: MemberSummary) {
  return member.globalName || member.username;
}

function formatActiveTime(days: number, minutes?: number): string {
  if (!days && !minutes) return "—";
  const totalMins = (minutes ?? 0);
  const d = days > 0 ? days : 0;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || (d === 0 && h === 0)) parts.push(`${m}m`);
  return parts.join(" ") || (d > 0 ? `${d}d` : "—");
}

function AdminTicketChat({ ticketId, channelId, adminName }: { ticketId: string; channelId: string; adminName: string }) {
  const [msgs, setMsgs] = useState<{id:string;author_username:string;author_avatar?:string;content:string;created_at:string}[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadMsgs() {
    const d = await fetch(`/api/support/ticket/${ticketId}/messages?channelId=${channelId}`).then(r=>r.json()).catch(()=>({}));
    if (d.ok) setMsgs(d.messages ?? []);
  }

  useEffect(() => { void loadMsgs(); const t = setInterval(loadMsgs, 5000); return () => clearInterval(t); }, [channelId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setSending(true);
    await fetch(`/api/support/ticket/${ticketId}/messages`, {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ message: `[Admin: ${adminName}] ${input.trim()}`, channelId }),
    });
    setInput(""); setSending(false); void loadMsgs();
  }

  return (
    <div className="mt-3 rounded-xl border border-cyan-400/20 bg-slate-950/80 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 bg-cyan-500/5">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
        <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-widest">Live Chat</span>
        <span className="ml-auto text-[10px] text-slate-600">auto-refreshes every 5s</span>
      </div>
      <div className="h-48 overflow-y-auto px-3 py-2 space-y-2 scrollbar-none">
        {msgs.length === 0 && <div className="text-xs text-slate-600 text-center py-4">No messages yet</div>}
        {msgs.map(m => (
          <div key={m.id} className="flex items-start gap-2">
            {m.author_avatar
              ? <img src={m.author_avatar} className="h-5 w-5 rounded-full shrink-0 mt-0.5" alt="" />
              : <div className="h-5 w-5 rounded-full bg-slate-700 shrink-0 mt-0.5 flex items-center justify-center text-[9px] text-slate-400">{m.author_username[0]}</div>
            }
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400">{m.author_username} </span>
              <span className="text-[10px] text-slate-600">{new Date(m.created_at).toLocaleTimeString()}</span>
              <div className="text-xs text-slate-300 break-words">{m.content}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="flex items-center gap-2 px-3 py-2 border-t border-white/5">
        <input
          value={input} onChange={e => setInput(e.target.value)}
          placeholder="Reply as admin…"
          className="flex-1 h-8 rounded-lg border border-white/8 bg-slate-900 px-3 text-xs text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/30"
          maxLength={500}
        />
        <button type="submit" disabled={sending || !input.trim()}
          className="rounded-lg bg-cyan-500/20 border border-cyan-400/20 px-3 h-8 text-xs font-bold text-cyan-300 hover:bg-cyan-500/30 transition disabled:opacity-40">
          {sending ? "…" : "Send"}
        </button>
      </form>
    </div>
  );
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
  const [customWebhooks, setCustomWebhooks] = useState<{id:string;label:string;url:string}[]>([]);
  const [newWebhookLabel, setNewWebhookLabel] = useState("");
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [webhookSaving, setWebhookSaving] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState("");
  const [tutorialVideoMode, setTutorialVideoMode] = useState<"voiceover" | "silent">("voiceover");

  const [activeTab, setActiveTab] = useState<"dashboard" | "roster" | "members" | "broadcast" | "streamers" | "lottery" | "modlog" | "wipe" | "arena" | "inventory" | "tickets">("dashboard");
  const [tickets, setTickets] = useState<{id:string;subject:string;message:string;guest_username:string;status:string;discord_channel_id:string|null;created_at:string}[]>([]);
  const [liveTicketId, setLiveTicketId] = useState<string|null>(null);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketStatusMsg, setTicketStatusMsg] = useState("");
  const [navScrolled, setNavScrolled] = useState(false);
  const navScrollRef = useRef<HTMLDivElement>(null);
  const [wipeAt, setWipeAt] = useState("");
  const [wipeLabel, setWipeLabel] = useState("Server Wipe");
  const [wipeSaving, setWipeSaving] = useState(false);
  const [wipeStatus, setWipeStatus] = useState("");
  const [modActions, setModActions] = useState<ModAction[]>([]);
  const [pendingBans, setPendingBans] = useState<PendingBan[]>([]);
  const [modLoading, setModLoading] = useState(false);
  const [pendingBanActionLoading, setPendingBanActionLoading] = useState<string | null>(null);
  const [modTargetId, setModTargetId] = useState("");
  const [modReason, setModReason] = useState("");
  const [modAction, setModAction] = useState<"warn" | "ban" | "unban">("warn");
  const [modStatus, setModStatus] = useState("");
  const [modWorking, setModWorking] = useState(false);
  const [showModModal, setShowModModal] = useState(false);
  const [approveNote, setApproveNote] = useState("");
  const [showApproveModal, setShowApproveModal] = useState<string | null>(null);
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

  // Arena Events state
  const [arenaEvents, setArenaEvents] = useState<any[]>([]);
  const [arenaLoading, setArenaLoading] = useState(false);
  const [arenaCreating, setArenaCreating] = useState(false);
  const [arenaNewEvent, setArenaNewEvent] = useState({
    name: "",
    description: "",
    game_mode: "PvP",
    max_teams: 16,
    team_size: 4,
    start_time: "",
  });
  const [selectedArenaEvent, setSelectedArenaEvent] = useState<any>(null);
  const [arenaVoteOptions, setArenaVoteOptions] = useState<any[]>([]);
  const [arenaNewVoteOption, setArenaNewVoteOption] = useState({ name: "", icon: "🎯", description: "" });
  const [arenaVoteResults, setArenaVoteResults] = useState<any[]>([]);
  const [arenaTeams, setArenaTeams] = useState<any[]>([]);
  const [arenaRules, setArenaRules] = useState<{
    mode: string; ffa: boolean; weapons: string[]; no_deviants: boolean; extra: string;
  }>({ mode: "Standard", ffa: false, weapons: [], no_deviants: false, extra: "" });
  const [rulesSaving, setRulesSaving] = useState(false);
  const [rulesSaved, setRulesSaved] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  // Inventory state
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryFilter, setInventoryFilter] = useState("all");
  const [inventorySearch, setInventorySearch] = useState("");
  const [inventorySummary, setInventorySummary] = useState({ total: 0, available: 0, used: 0, saved: 0, insurance_count: 0 });

  // Package logs state
  const [packageLogs, setPackageLogs] = useState<any[]>([]);
  const [packageLogsLoading, setPackageLogsLoading] = useState(false);
  const [packageLogsFilter, setPackageLogsFilter] = useState("all");
  const [packageLogsUserFilter, setPackageLogsUserFilter] = useState("");
  const [packageLogsSummary, setPackageLogsSummary] = useState<any>(null);
  const [packageLogsOffset, setPackageLogsOffset] = useState(0);
  const [packageLogsHasMore, setPackageLogsHasMore] = useState(false);

  // Give package form state
  const [givePackageForm, setGivePackageForm] = useState({
    user_id: "",
    user_name: "",
    item_type: "pack",
    item_slug: "",
    item_name: "",
    reason: "",
  });
  const [givePackageLoading, setGivePackageLoading] = useState(false);
  const [showGivePackageModal, setShowGivePackageModal] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);

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

    // Load custom webhooks
    fetch("/api/admin/broadcast").then(r => r.json()).then(d => {
      if (d.ok) setCustomWebhooks(d.hooks ?? []);
    }).catch(() => {});

    // Load wipe timer for dashboard display
    fetch("/api/admin/wipe-timer").then(r => r.json()).then(d => {
      if (d.ok && d.wipeAt) {
        // Convert UTC ISO to local datetime-local format for the input
        const dt = new Date(d.wipeAt);
        const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setWipeAt(local);
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

  async function loadArena() {
    setArenaLoading(true);
    const res = await fetch("/api/arena/events", { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (data?.ok) setArenaEvents(data.events || []);
    setArenaLoading(false);
  }

  function syncRulesFromEvent(event: any) {
    const r = event?.metadata?.rules;
    if (r) setArenaRules({ mode: r.mode || "Standard", ffa: !!r.ffa, weapons: r.weapons || [], no_deviants: !!r.no_deviants, extra: r.extra || "" });
    else setArenaRules({ mode: "Standard", ffa: false, weapons: [], no_deviants: false, extra: "" });
  }

  async function loadInventory() {
    setInventoryLoading(true);
    const res = await fetch("/api/inventory/admin", { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (data?.ok) {
      setInventoryItems(data.items || []);
      setInventorySummary(data.summary || { total: 0, available: 0, used: 0, saved: 0, insurance_count: 0 });
    }
    setInventoryLoading(false);
  }

  async function handleInventoryAction(itemIds: string[], action: "mark_used" | "mark_available" | "mark_saved" | "delete") {
    if (!confirm(`${action === "delete" ? "Permanently delete" : "Update"} ${itemIds.length} item(s)?`)) return;
    
    const res = await fetch("/api/inventory/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_ids: itemIds, action }),
    });
    
    const data = await res.json().catch(() => null);
    if (data?.ok) {
      await loadInventory();
    } else {
      alert(data?.error || "Action failed");
    }
  }

  async function loadPackageLogs(offset = 0, append = false) {
    setPackageLogsLoading(true);
    
    const params = new URLSearchParams();
    params.set("limit", "50");
    params.set("offset", String(offset));
    if (packageLogsFilter !== "all") params.set("action", packageLogsFilter);
    if (packageLogsUserFilter) params.set("user_id", packageLogsUserFilter);
    
    const res = await fetch(`/api/inventory/logs?${params}`, { cache: "no-store" });
    const data = await res.json().catch(() => null);
    
    if (data?.ok) {
      if (append) {
        setPackageLogs(prev => [...prev, ...(data.logs || [])]);
      } else {
        setPackageLogs(data.logs || []);
      }
      setPackageLogsSummary(data.summary);
      setPackageLogsHasMore(data.pagination?.hasMore || false);
      setPackageLogsOffset(offset);
    }
    
    setPackageLogsLoading(false);
  }

  async function handleGivePackage(e: React.FormEvent) {
    e.preventDefault();
    if (!givePackageForm.user_id || !givePackageForm.item_slug) {
      alert("User ID and item are required");
      return;
    }

    setGivePackageLoading(true);
    
    const res = await fetch("/api/inventory/admin", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: givePackageForm.user_id,
        user_name: givePackageForm.user_name,
        item_type: givePackageForm.item_type,
        item_slug: givePackageForm.item_slug,
        item_name: givePackageForm.item_name || givePackageForm.item_slug,
        reason: givePackageForm.reason,
      }),
    });
    
    const data = await res.json().catch(() => null);
    setGivePackageLoading(false);
    
    if (data?.ok) {
      alert(`Package "${data.item?.item_name}" given to user!`);
      setShowGivePackageModal(false);
      setGivePackageForm({
        user_id: "",
        user_name: "",
        item_type: "pack",
        item_slug: "",
        item_name: "",
        reason: "",
      });
      setUserSearchQuery("");
      setShowUserDropdown(false);
      await loadInventory();
      await loadPackageLogs();
    } else {
      alert(data?.error || "Failed to give package");
    }
  }

  async function fetchArenaTeams(eventId: string) {
    const res = await fetch(`/api/arena/teams?eventId=${eventId}`, { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (data?.ok) setArenaTeams(data.teams || []);
  }

  async function handleCreateArenaEvent() {
    if (!arenaNewEvent.name.trim()) return;
    setArenaCreating(true);
    const res = await fetch("/api/arena/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: arenaNewEvent.name,
        description: arenaNewEvent.description,
        game_mode: arenaNewEvent.game_mode,
        max_teams: arenaNewEvent.max_teams,
        team_size: arenaNewEvent.team_size,
        start_time: arenaNewEvent.start_time || null,
      }),
    });
    const data = await res.json();
    setArenaCreating(false);
    if (data.ok) {
      setArenaNewEvent({ name: "", description: "", game_mode: "PvP", max_teams: 16, team_size: 4, start_time: "" });
      await loadArena();
    } else {
      alert(data.error || "Failed to create event");
    }
  }

  async function handleAddVoteOption(eventId: string) {
    if (!arenaNewVoteOption.name.trim()) return;
    const res = await fetch("/api/arena/vote-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_id: eventId,
        name: arenaNewVoteOption.name,
        icon: arenaNewVoteOption.icon,
        description: arenaNewVoteOption.description,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      setArenaNewVoteOption({ name: "", icon: "🎯", description: "" });
      // Refresh vote options
      const votesRes = await fetch(`/api/arena/votes?eventId=${eventId}`);
      const votesData = await votesRes.json();
      if (votesData?.ok) {
        setArenaVoteOptions(votesData.options || []);
        setArenaVoteResults(votesData.results || []);
      }
    }
  }

  async function handleFinalizeVotes(eventId: string) {
    if (!confirm("Finalize votes and announce winner to Discord?")) return;
    const res = await fetch("/api/arena/votes/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId }),
    });
    const data = await res.json();
    if (data.ok) {
      alert(`Winner: ${data.winner.name} (${data.winner.percentage}%)`);
    } else {
      alert(data.error || "Failed to finalize");
    }
  }

  async function handleUpdateEventImage(eventId: string, imageUrl: string) {
    const res = await fetch("/api/arena/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId, image_url: imageUrl }),
    });
    const data = await res.json();
    if (data.ok) {
      alert("Image updated!");
      await loadArena();
    } else {
      alert(data.error || "Failed to update image");
    }
  }

  async function handleUploadEventImage(eventId: string, file: File) {
    setImageUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const uploadRes = await fetch("/api/admin/upload", { method: "POST", body: form });
      const uploadData = await uploadRes.json();
      if (!uploadData.ok) { alert(uploadData.error || "Upload failed"); setImageUploading(false); return; }
      // Save the URL to the event
      const res = await fetch("/api/arena/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId, image_url: uploadData.url }),
      });
      const data = await res.json();
      if (data.ok) {
        setSelectedArenaEvent((prev: any) => ({ ...prev, image_url: uploadData.url }));
        await loadArena();
      } else {
        alert(data.error || "Failed to save image");
      }
    } catch (e) {
      alert("Upload error — check console");
      console.error(e);
    } finally {
      setImageUploading(false);
    }
  }

  async function handleCloseEvent(eventId: string) {
    if (!confirm("Close this event? It will be marked as completed and hidden from active events.")) return;
    const res = await fetch("/api/arena/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId, status: "completed", registration_open: false }),
    });
    const data = await res.json();
    if (data.ok) {
      setSelectedArenaEvent(null);
      await loadArena();
    } else {
      alert(data.error || "Failed to close event");
    }
  }

  async function handleToggleRegistration(eventId: string, open: boolean) {
    const res = await fetch("/api/arena/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId, registration_open: open }),
    });
    const data = await res.json();
    if (data.ok) {
      setSelectedArenaEvent({ ...selectedArenaEvent, registration_open: open });
      await loadArena();
    } else {
      alert(data.error || "Failed to toggle registration");
    }
  }

  async function handleStartEvent(eventId: string) {
    if (!confirm("Start the event? This will close registration, generate the bracket, and notify all teams.")) return;
    const res = await fetch("/api/arena/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId, action: "start_event" }),
    });
    const data = await res.json();
    if (data.ok) {
      setSelectedArenaEvent((prev: any) => ({
        ...prev,
        registration_open: false,
        status: "active",
        current_round: 1,
        metadata: {
          ...(prev.metadata || {}),
          vc_assignments: data.vc_assignments || [],
          matches: data.matches || [],
          ffa_participants: data.ffa_participants || undefined,
          round: 1,
        },
      }));
      await loadArena();
      await fetchArenaTeams(eventId);
    } else {
      alert(data.error || "Failed to start event");
    }
  }

  async function handleGenerateBracket(eventId: string) {
    const res = await fetch("/api/arena/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId, action: "generate_bracket" }),
    });
    const data = await res.json();
    if (data.ok) {
      setSelectedArenaEvent((prev: any) => ({
        ...prev,
        status: "active",
        metadata: {
          ...(prev.metadata || {}),
          matches: data.matches || [],
          vc_assignments: data.vc_assignments || [],
          ffa_participants: data.ffa_participants || undefined,
        },
      }));
      await loadArena();
    } else {
      alert(data.error || "Failed to generate bracket");
    }
  }

  async function handleSetFFAWinner(eventId: string, winnerName: string, winnerTeamName: string) {
    const res = await fetch("/api/arena/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId, action: "set_ffa_winner", winner_name: winnerName, winner_team_name: winnerTeamName }),
    });
    const data = await res.json();
    if (data.ok) {
      setSelectedArenaEvent((prev: any) => ({ ...prev, metadata: data.event?.metadata || prev.metadata }));
      await loadArena();
    } else {
      alert(data.error || "Failed to set FFA winner");
    }
  }

  async function handleAssignVCs(eventId: string) {
    const res = await fetch("/api/arena/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId, action: "assign_vcs" }),
    });
    const data = await res.json();
    if (data.ok) {
      setSelectedArenaEvent({ ...selectedArenaEvent, metadata: { ...selectedArenaEvent.metadata, vc_assignments: data.vc_assignments } });
      await loadArena();
      alert(`Assigned ${data.vc_assignments.length} teams to voice channels!`);
    } else {
      alert(data.error || "Failed to assign VCs");
    }
  }

  async function handleNextRound(eventId: string) {
    const res = await fetch("/api/arena/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId, action: "next_round" }),
    });
    const data = await res.json();
    if (data.ok) {
      // Immediately update the bracket UI with new round matches
      setSelectedArenaEvent((prev: any) => ({
        ...prev,
        current_round: data.event?.current_round ?? (prev.current_round || 1) + 1,
        metadata: {
          ...(prev.metadata || {}),
          matches: data.matches || [],
          vc_assignments: data.vc_assignments || [],
        },
      }));
      await loadArena();
    } else {
      alert(data.error || "Failed to advance round");
    }
  }

  // Live Panel Handlers
  async function handleRemoveTeam(eventId: string, teamId: string) {
    const res = await fetch(`/api/arena/teams?teamId=${teamId}`, { method: "DELETE" });
    const data = await res.json();
    if (data.ok) {
      await fetchArenaTeams(eventId);
      alert("Team removed");
    } else {
      alert(data.error || "Failed to remove team");
    }
  }

  async function handleNotifyMatch(match: any, team: 'team1' | 'team2') {
    const teamId = team === 'team1' ? match.team1_id : match.team2_id;
    const teamName = team === 'team1' ? match.team1_name : match.team2_name;
    const opponentName = team === 'team1' ? match.team2_name : match.team1_name;
    const vc = team === 'team1' ? match.team1_vc : match.team2_vc;
    
    const res = await fetch("/api/arena/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        match_id: match.match_number,
        message: `🎮 It's your turn! You're fighting **${opponentName}**. Join **${vc}** now!`,
        team_name: teamName,
        teams: [teamId], // Pass team ID to find members
      }),
    });
    const data = await res.json();
    if (data.ok) {
      const status = `📨 ${teamName}: ${data.dms_sent}/${data.total_recipients} DMs sent`;
      alert(data.bot_token_set ? status : `${status}\n\n⚠️ DISCORD_BOT_TOKEN not set - add it to .env for DMs to work!`);
    } else {
      alert(`❌ Failed: ${data.error || "Unknown error"}`);
    }
  }

  async function handleStartMatch(match: any) {
    if (match.status === "completed") return;
    const res = await fetch("/api/arena/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        match_id: match.match_number,
        message: `⚔️ **MATCH ${match.match_number} STARTING!**\n\n**${match.team1_name}** vs **${match.team2_name}**\n\nBoth teams join your voice channels NOW! 🔊`,
        broadcast: true,
        teams: [match.team1_id, match.team2_id],
      }),
    });
    const data = await res.json();
    if (!data.ok) {
      alert(`❌ Notify failed: ${data.error || "Unknown error"}`);
    }
  }

  async function handleSetWinner(match: any, winnerId: string, winnerName: string) {
    const loserName = match.team1_id === winnerId ? match.team2_name : match.team1_name;
    const res = await fetch("/api/arena/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_id: selectedArenaEvent!.id,
        action: "set_winner",
        match_number: match.match_number,
        winner_id: winnerId,
        winner_name: winnerName,
        loser_name: loserName,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      setSelectedArenaEvent((prev: any) => ({
        ...prev,
        metadata: { ...prev.metadata, matches: data.matches },
      }));
    } else {
      alert(data.error || "Failed to set winner");
    }
  }

  async function handleNotifyAllTeams(eventId: string, message: string) {
    const res = await fetch("/api/arena/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_id: eventId,
        message,
        broadcast: true,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      // Success - simple message
      if (data.dms_sent > 0 && (!data.errors || data.errors.length === 0)) {
        alert(`✅ ${data.dms_sent} DMs sent!`);
      } 
      // Has errors but some worked
      else if (data.errors && data.errors.length > 0) {
        alert(`⚠️ ${data.dms_sent}/${data.total_recipients} DMs sent\n\nErrors:\n${data.errors.slice(0, 2).map((e: any) => `${e.id.slice(0,6)}: ${e.error.slice(0, 40)}`).join('\n')}`);
      }
      // No token
      else if (!data.bot_token_set) {
        alert(`❌ Bot token not set. Add BOT_TOKEN to Vercel env vars.`);
      }
      // Other issue
      else {
        alert(`⚠️ ${data.dms_sent}/${data.total_recipients} DMs sent`);
      }
    } else {
      alert(`❌ Failed: ${data.error || "Unknown error"}`);
    }
  }

  async function handleShuffleTeams(eventId: string) {
    if (!confirm("Shuffle all matches? This will re-pair all teams randomly.")) return;
    const res = await fetch("/api/arena/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId, action: "shuffle_matches" }),
    });
    const data = await res.json();
    if (data.ok) {
      setSelectedArenaEvent({ ...selectedArenaEvent, metadata: { ...selectedArenaEvent.metadata, matches: data.matches } });
      alert("Matches shuffled! New pairings generated.");
    } else {
      alert(data.error || "Failed to shuffle");
    }
  }

  async function handleUpdateRules() {
    if (!selectedArenaEvent) return;
    setRulesSaving(true);
    const res = await fetch("/api/arena/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: selectedArenaEvent.id, action: "update_rules", rules: arenaRules }),
    });
    const data = await res.json();
    setRulesSaving(false);
    if (data.ok) {
      setSelectedArenaEvent((prev: any) => ({ ...prev, metadata: data.metadata }));
      setRulesSaved(true);
      setTimeout(() => setRulesSaved(false), 2500);
    } else {
      alert(data.error || "Failed to save rules");
    }
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

  async function handleRosterDelete(discordId: string) {
    if (!confirm("Permanently delete this entry from the roster?")) return;
    setRosterActionLoading(discordId + "delete");
    setRosterError("");
    const res = await fetch("/api/admin/roster", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ discordId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setRosterError(data?.error || "Delete failed.");
    } else {
      setRoster((prev) => prev.filter((e) => e.discordId !== discordId));
    }
    setRosterActionLoading(null);
  }

  async function loadModLog() {
    setModLoading(true);
    const res = await fetch("/api/admin/moderate", { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (data?.ok) {
      setModActions(data.actions as ModAction[]);
      setPendingBans(data.pendingBans as PendingBan[] ?? []);
    } else {
      setModStatus(data?.error ? `Error loading logs: ${data.error}` : "Failed to load mod log.");
    }
    setModLoading(false);
  }

  async function handleApproveBan(pendingBanId: string, action: "approve" | "reject") {
    setPendingBanActionLoading(pendingBanId + action);
    const res = await fetch("/api/admin/moderate", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pendingBanId, action, note: approveNote }),
    });
    const data = await res.json().catch(() => null);
    setPendingBanActionLoading(null);
    setApproveNote("");
    setShowApproveModal(null);

    if (data?.ok) {
      if (data.executed) {
        setModStatus(`✓ Ban executed! Target has been banned from Discord.`);
      } else if (data.rejected) {
        setModStatus(`✓ Ban proposal rejected.`);
      } else {
        setModStatus(`✓ Approval recorded (${data.approvalsCount}/${2}). Waiting for final approval...`);
      }
      await loadModLog();
    } else {
      setModStatus(data?.error || "Failed to process approval.");
    }
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
    } else if (data?.pending) {
      setModStatus(`⏳ ${data.message} (ID: ${data.pendingBanId?.slice(0, 8)}...)`);
      setModTargetId(""); setModReason(""); setShowModModal(false);
      await loadModLog();
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

  async function loadTickets() {
    setTicketsLoading(true);
    setTicketStatusMsg("");
    const d = await fetch("/api/admin/tickets").then(r => r.json()).catch(() => ({ ok: false, error: "Network error" }));
    if (!d.ok) setTicketStatusMsg(`Error loading tickets: ${d.error ?? "unknown"}${d.code ? ` (${d.code})` : ""}`);
    setTickets(d.tickets ?? []);
    setTicketsLoading(false);
  }

  const isOwner = stats?.viewer?.isOwner ?? false;
  const pendingAdmins = roster.filter((a) => a.status === "pending").length;
  const pendingStreamers = streamers.filter((s) => s.status === "pending").length;
  const openTickets = tickets.filter((t) => t.status === "open").length;

  const tabs = [
    { id: "dashboard" as const, label: "Overview",   icon: "▣" },
    { id: "members"   as const, label: "Members",    icon: "◉" },
    { id: "roster"    as const, label: "Roster",     icon: "◈", badge: pendingAdmins },
    { id: "broadcast" as const, label: "Broadcast",  icon: "◎" },
    { id: "streamers" as const, label: "Streamers",  icon: "◇", badge: pendingStreamers },
    { id: "lottery"   as const, label: "Lottery",    icon: "◆" },
    { id: "arena"     as const, label: "Arena",      icon: "⚔️" },
    { id: "inventory" as const, label: "Inventory",  icon: "🎒" },
    { id: "modlog" as const, label: "Mod Log", icon: "⚑" },
    { id: "tickets" as const, label: "Tickets", icon: "🎫", badge: openTickets },
    { id: "wipe" as const, label: "Wipe Timer", icon: "⏳" },
  ] as const;

  type TabId = (typeof tabs)[number]["id"];

  function switchTab(id: TabId) {
    setActiveTab(id as typeof activeTab);
    // Scroll the active pill into view on mobile
    setTimeout(() => {
      if (navScrollRef.current) {
        const btn = navScrollRef.current.querySelector(`[data-tabid="${id}"]`) as HTMLElement | null;
        btn?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }, 50);
    if (id === "roster")  void loadRoster();
    if (id === "streamers") void loadStreamers();
    if (id === "lottery") void loadLottery();
    if (id === "modlog")  void loadModLog();
    if (id === "arena")   void loadArena();
    if (id === "inventory") {
      void loadInventory();
      void loadPackageLogs();
    }
    if (id === "tickets") void loadTickets();
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

            <div className="p-4 md:p-6 pb-28 md:pb-6">

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
                  { label: "Active Days", value: stats?.summary.activeDaysObserved ?? 0, color: "from-violet-400/15 to-violet-400/3 border-violet-400/15", accent: "text-violet-400", dot: "bg-violet-400", suffix: " days" },
                  { label: "Events", value: stats?.summary.totalEvents ?? 0, color: "from-amber-400/15 to-amber-400/3 border-amber-400/15", accent: "text-amber-400", dot: "bg-amber-400" },
                ].map((s) => (
                  <div key={s.label} className={`relative overflow-hidden rounded-2xl border bg-gradient-to-b ${s.color} p-4 transition-transform duration-150 hover:scale-[1.02]`}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${s.dot}`} />
                      <span className="text-[11px] font-medium text-slate-400">{s.label}</span>
                    </div>
                    <div className={`text-3xl font-black tracking-tight ${s.accent}`}>
                      {s.value.toLocaleString()}
                      {"suffix" in s && s.suffix && <span className="text-base font-semibold ml-0.5 opacity-70">{s.suffix}</span>}
                    </div>
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
                <ActivityFeed entries={filteredRecent} />
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
                        {selectedMember.isBot && <span className="rounded-full border border-purple-400/25 bg-purple-400/8 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-purple-300">🤖 Bot</span>}
                        {selectedMember.isAdmin && <span className="rounded-full border border-amber-400/25 bg-amber-400/8 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-300">Admin</span>}
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${selectedMember.activeNow ? "bg-emerald-500/15 text-emerald-300" : "bg-white/6 text-slate-500"}`}>{selectedMember.activeNow ? "● Live" : "Offline"}</span>
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">@{selectedMember.username} · {selectedMember.discordId}</div>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs">
                        {[
                          { label: "Events", val: String(selectedMember.events) },
                          { label: "Active Days", val: selectedMember.activeDays > 0 ? `${selectedMember.activeDays}d` : "—" },
                          { label: "Session Time", val: (() => {
                            const m = selectedMember.activeMinutes ?? 0;
                            if (!m) return "—";
                            const h = Math.floor(m / 60);
                            const mins = m % 60;
                            return [h > 0 && `${h}h`, (mins > 0 || h === 0) && `${mins}m`].filter(Boolean).join(" ");
                          })() },
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
                        <div className={`truncate text-sm font-semibold ${member.isAdmin ? "text-amber-200" : member.isBot ? "text-purple-200" : "text-slate-100"}`}>
                          {getMemberName(member)}
                          {member.isBot && <span className="ml-1.5 text-[9px] font-bold uppercase tracking-widest text-purple-400/80">🤖 Bot</span>}
                          {member.isAdmin && <span className="ml-1.5 text-[9px] font-bold uppercase tracking-widest text-amber-400/60">Admin</span>}
                        </div>
                        <div className="text-[11px] text-slate-600">
                          {member.isBot ? "Discord Bot" : member.events > 0 ? `${member.events} events · ${formatActiveTime(member.activeDays, member.activeMinutes)} active` : "Discord member"}
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
                  {customWebhooks.length > 0 && (
                    <optgroup label="── Custom Webhooks ──">
                      {customWebhooks.map(h => <option key={h.id} value={h.id}>🔗 {h.label}</option>)}
                    </optgroup>
                  )}
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

              {/* ── Webhook Tutorial ── */}
              <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-b from-indigo-950/40 to-slate-950/60 overflow-hidden">
                <div className="px-5 pt-5 pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base">📺</span>
                        <h3 className="text-sm font-bold text-white tracking-tight">How to Add a Webhook</h3>
                        <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-indigo-300">Tutorial</span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">Step-by-step guide to adding a Discord webhook for broadcast.</p>
                    </div>
                    <div className="flex rounded-xl border border-white/8 bg-slate-900/60 p-0.5 gap-0.5">
                      <button type="button" onClick={() => setTutorialVideoMode("voiceover")}
                        className={`rounded-[10px] px-3 py-1.5 text-xs font-semibold transition ${tutorialVideoMode === "voiceover" ? "bg-indigo-500 text-white shadow" : "text-slate-500 hover:text-slate-300"}`}>
                        🔊 With Voice
                      </button>
                      <button type="button" onClick={() => setTutorialVideoMode("silent")}
                        className={`rounded-[10px] px-3 py-1.5 text-xs font-semibold transition ${tutorialVideoMode === "silent" ? "bg-indigo-500 text-white shadow" : "text-slate-500 hover:text-slate-300"}`}>
                        🔇 Silent
                      </button>
                    </div>
                  </div>
                </div>

                {/* Video Player */}
                <div className="relative mx-4 mb-4 rounded-xl overflow-hidden border border-white/8 bg-slate-950 group cursor-zoom-in"
                  style={{ aspectRatio: "16/9" }}
                  onClick={(e) => {
                    const el = e.currentTarget.querySelector("video") as HTMLVideoElement | null;
                    if (!el) return;
                    if (document.fullscreenElement) {
                      document.exitFullscreen();
                    } else {
                      el.requestFullscreen?.().catch(() => {});
                    }
                  }}>
                  {tutorialVideoMode === "voiceover" ? (
                    <video
                      key="voiceover"
                      src="/Server Profile _ Raidzone NewHopeGGn - Discord 2026-04-20 04-36-23.mp4"
                      controls
                      className="w-full h-full object-contain"
                      onError={(e) => { (e.currentTarget as HTMLVideoElement).style.display = "none"; }}
                    />
                  ) : (
                    <video
                      key="silent"
                      src="/Screen Recording 2026-04-20 042211.mp4"
                      controls
                      className="w-full h-full object-contain"
                      onError={(e) => { (e.currentTarget as HTMLVideoElement).style.display = "none"; }}
                    />
                  )}
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-950/80 px-2 py-1 text-[10px] text-slate-400 pointer-events-none opacity-0 group-hover:opacity-100 transition">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>
                    Click to fullscreen
                  </div>
                </div>

                {/* Step-by-step subtitles */}
                <div className="px-4 pb-5 grid gap-2">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-1">Steps shown in video</div>
                  {([ 
                    { n: "1", icon: "⚙️", title: "Open Discord Server Settings", desc: "Right-click your server icon → Server Settings → Integrations → Webhooks" },
                    { n: "2", icon: "➕", title: "Create New Webhook", desc: "Click New Webhook, give it a name, choose the channel, and copy the Webhook URL" },
                    { n: "3", icon: "📋", title: "Copy the URL", desc: "Click Copy Webhook URL — it looks like discord.com/api/webhooks/..." },
                    { n: "4", icon: "🔗", title: "Paste into the panel below", desc: "Enter a label for what it is and paste the URL, then click + Add Webhook" },
                    { n: "5", icon: "✅", title: "Select & broadcast", desc: "Your new webhook appears in the destination dropdown — select it and send!" },
                  ] as {n:string;icon:string;title:string;desc:string}[]).map(step => (
                    <div key={step.n} className="flex items-start gap-3 rounded-xl border border-white/5 bg-slate-900/50 px-3 py-2.5">
                      <div className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/20 text-[10px] font-black text-indigo-300">{step.n}</div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200"><span>{step.icon}</span>{step.title}</div>
                        <div className="mt-0.5 text-[11px] text-slate-500 leading-relaxed">{step.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Custom Webhooks Manager ── */}
              <div className="rounded-2xl border border-white/8 bg-slate-900/50 p-4">
                <h3 className="text-sm font-bold text-slate-300 mb-3">🔗 Custom Webhooks</h3>
                {customWebhooks.length > 0 && (
                  <div className="grid gap-2 mb-4">
                    {customWebhooks.map(h => (
                      <div key={h.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/6 bg-slate-950/60 px-3 py-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-200 truncate">{h.label}</div>
                          <div className="text-[10px] text-slate-600 truncate">{h.url.slice(0, 60)}…</div>
                        </div>
                        <button type="button" onClick={async () => {
                          await fetch("/api/admin/broadcast", { method: "DELETE", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ id: h.id }) });
                          setCustomWebhooks(prev => prev.filter(w => w.id !== h.id));
                        }} className="shrink-0 text-xs text-rose-500 hover:text-rose-300 transition">✕ Remove</button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid gap-2">
                  <input
                    className="h-10 rounded-xl border border-white/8 bg-slate-900/80 px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/30 transition"
                    value={newWebhookLabel} onChange={e => setNewWebhookLabel(e.target.value)}
                    placeholder={"Label — what is this webhook for?"} maxLength={60}
                  />
                  <input
                    className="h-10 rounded-xl border border-white/8 bg-slate-900/80 px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/30 transition"
                    value={newWebhookUrl} onChange={e => setNewWebhookUrl(e.target.value)}
                    placeholder="Discord webhook URL" maxLength={500}
                  />
                  <button type="button" disabled={webhookSaving || !newWebhookLabel.trim() || !newWebhookUrl.trim()}
                    onClick={async () => {
                      setWebhookSaving(true); setWebhookStatus("");
                      const res = await fetch("/api/admin/broadcast", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ label: newWebhookLabel.trim(), url: newWebhookUrl.trim() }),
                      });
                      const data = await res.json().catch(() => ({}));
                      setWebhookSaving(false);
                      if (data.ok) {
                        setCustomWebhooks(data.hooks ?? []);
                        setNewWebhookLabel(""); setNewWebhookUrl("");
                        setWebhookStatus("✓ Webhook added.");
                      } else {
                        setWebhookStatus(data.error || "Failed to add webhook.");
                      }
                    }}
                    className="h-10 rounded-xl bg-cyan-500/20 text-cyan-300 text-sm font-semibold hover:bg-cyan-500/30 disabled:opacity-40 transition">
                    {webhookSaving ? "Adding…" : "+ Add Webhook"}
                  </button>
                  {webhookStatus && (
                    <div className={`rounded-xl border px-3 py-2 text-xs font-medium ${webhookStatus.startsWith("✓") ? "border-emerald-500/20 bg-emerald-500/8 text-emerald-300" : "border-rose-500/20 bg-rose-500/8 text-rose-300"}`}>
                      {webhookStatus}
                    </div>
                  )}
                </div>
              </div>
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
                          {entry.status !== "denied" && (
                            <button type="button" disabled={rosterActionLoading === entry.discordId + "denied"} onClick={() => void handleRosterAction(entry.discordId, "denied")}
                              className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 disabled:opacity-40 transition">Deny</button>
                          )}
                          {entry.status === "denied" && (
                            <button type="button" disabled={rosterActionLoading === entry.discordId + "delete"} onClick={() => void handleRosterDelete(entry.discordId)}
                              className="rounded-lg border border-rose-600/30 bg-rose-600/15 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-600/25 disabled:opacity-40 transition">🗑 Delete</button>
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

          {/* ════ ARENA EVENTS ════ */}
          {activeTab === "arena" && (
            <div className="grid gap-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight">Arena Events</h1>
                  <p className="mt-0.5 text-sm text-slate-500">Create tournaments and manage team voting.</p>
                </div>
                <button type="button" onClick={() => setSelectedArenaEvent(null)}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-amber-500/15 hover:opacity-90 transition">
                  ⚔️ New Event
                </button>
              </div>

              {/* Create New Event Form */}
              {!selectedArenaEvent && (
                <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/80 to-slate-950/80 p-5">
                  <h2 className="text-lg font-bold text-white mb-4">Create Arena Event</h2>
                  <div className="grid gap-4 max-w-lg">
                    <input
                      value={arenaNewEvent.name}
                      onChange={(e) => setArenaNewEvent({ ...arenaNewEvent, name: e.target.value })}
                      placeholder="Event Name"
                      className="h-10 rounded-xl border border-white/8 bg-slate-900/80 px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/30 transition"
                    />
                    <input
                      value={arenaNewEvent.description}
                      onChange={(e) => setArenaNewEvent({ ...arenaNewEvent, description: e.target.value })}
                      placeholder="Description (optional)"
                      className="h-10 rounded-xl border border-white/8 bg-slate-900/80 px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/30 transition"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <select
                        value={arenaNewEvent.game_mode}
                        onChange={(e) => setArenaNewEvent({ ...arenaNewEvent, game_mode: e.target.value })}
                        className="h-10 rounded-xl border border-white/8 bg-slate-900/80 px-3 text-sm text-white outline-none focus:border-cyan-400/30 transition"
                      >
                        <option value="PvP">PvP</option>
                        <option value="PvE">PvE</option>
                        <option value="Battle Royale">Battle Royale</option>
                      </select>
                      <input
                        type="number"
                        value={arenaNewEvent.max_teams}
                        onChange={(e) => setArenaNewEvent({ ...arenaNewEvent, max_teams: parseInt(e.target.value) || 16 })}
                        placeholder="Max Teams"
                        className="h-10 rounded-xl border border-white/8 bg-slate-900/80 px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/30 transition"
                      />
                      <input
                        type="number"
                        value={arenaNewEvent.team_size}
                        onChange={(e) => setArenaNewEvent({ ...arenaNewEvent, team_size: parseInt(e.target.value) || 4 })}
                        placeholder="Team Size"
                        className="h-10 rounded-xl border border-white/8 bg-slate-900/80 px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/30 transition"
                      />
                    </div>
                    <input
                      type="datetime-local"
                      value={arenaNewEvent.start_time}
                      onChange={(e) => setArenaNewEvent({ ...arenaNewEvent, start_time: e.target.value })}
                      className="h-10 rounded-xl border border-white/8 bg-slate-900/80 px-4 text-sm text-white outline-none focus:border-cyan-400/30 transition"
                    />
                    <button
                      onClick={() => void handleCreateArenaEvent()}
                      disabled={arenaCreating || !arenaNewEvent.name.trim()}
                      className="h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-sm font-bold text-white shadow-lg shadow-amber-500/10 transition hover:opacity-90 hover:scale-[1.01] disabled:opacity-40"
                    >
                      {arenaCreating ? "Creating..." : "Create Event"}
                    </button>
                  </div>
                </div>
              )}

              {/* Events List */}
              <div className="grid gap-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Active Events</h2>
                {arenaLoading ? (
                  <div className="text-sm text-slate-500">Loading...</div>
                ) : arenaEvents.length === 0 ? (
                  <div className="text-sm text-slate-600">No events yet. Create one above!</div>
                ) : (
                  arenaEvents.map((event) => (
                    <div
                      key={event.id}
                      onClick={() => { setSelectedArenaEvent(event); fetchArenaTeams(event.id); syncRulesFromEvent(event); }}
                      className={`rounded-2xl border p-4 cursor-pointer transition ${
                        selectedArenaEvent?.id === event.id
                          ? "border-amber-500/50 bg-amber-500/10"
                          : "border-white/10 bg-slate-900/60 hover:bg-slate-900/80"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-white">{event.name}</h3>
                          <p className="text-xs text-slate-400">{event.game_mode} • {event.arena_teams?.[0]?.count || 0}/{event.max_teams} teams</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          event.registration_open
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-rose-500/20 text-rose-300"
                        }`}>
                          {event.registration_open ? "Open" : "Closed"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Selected Event Management */}
              {selectedArenaEvent && (
                <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/80 to-slate-950/80 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {selectedArenaEvent.image_url && (
                        <img src={selectedArenaEvent.image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                      )}
                      <div>
                        <h2 className="text-lg font-bold text-white">{selectedArenaEvent.name}</h2>
                        <p className="text-xs text-slate-400">
                          Round {selectedArenaEvent.current_round || 0} • {selectedArenaEvent.arena_teams?.[0]?.count || 0} teams •
                          {selectedArenaEvent.registration_open ? (
                            <span className="text-emerald-400"> Registration Open</span>
                          ) : (
                            <span className="text-rose-400"> Registration Closed</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedArenaEvent(null)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Close
                    </button>
                  </div>

                  {/* Event Image Upload */}
                  <div className="mb-6 p-4 rounded-xl bg-slate-950/50 border border-white/5">
                    <h3 className="text-sm font-semibold text-cyan-400 mb-3">📸 Event Image</h3>
                    {selectedArenaEvent.image_url && (
                      <div className="mb-3 flex items-center gap-3">
                        <img src={selectedArenaEvent.image_url} alt="Event" className="w-16 h-16 rounded-xl object-cover border border-white/10" />
                        <span className="text-xs text-slate-400 truncate flex-1">{selectedArenaEvent.image_url}</span>
                      </div>
                    )}
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={selectedArenaEvent.image_url || ""}
                        onChange={(e) => setSelectedArenaEvent({ ...selectedArenaEvent, image_url: e.target.value })}
                        placeholder="Image URL (Discord CDN, Imgur, etc.)"
                        className="flex-1 h-10 rounded-xl border border-white/8 bg-slate-900/80 px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/30 transition"
                      />
                      <button
                        onClick={async () => await handleUpdateEventImage(selectedArenaEvent.id, selectedArenaEvent.image_url)}
                        disabled={!selectedArenaEvent.image_url}
                        className="px-4 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 text-sm font-semibold hover:bg-cyan-500/30 disabled:opacity-40"
                      >
                        Set URL
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-600 uppercase tracking-widest">or</span>
                      <label className={`flex-1 ${imageUploading ? "" : "cursor-pointer"}`}>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          className="hidden"
                          disabled={imageUploading}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) await handleUploadEventImage(selectedArenaEvent.id, file);
                            if (e.target) e.target.value = "";
                          }}
                        />
                        <div className={`h-10 rounded-xl border border-dashed flex items-center justify-center gap-2 text-sm font-semibold transition ${
                          imageUploading
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-300 animate-pulse"
                            : "border-cyan-500/30 bg-cyan-500/5 text-cyan-400 hover:bg-cyan-500/10"
                        }`}>
                          {imageUploading ? "⏳ Uploading..." : "📁 Upload from Computer"}
                        </div>
                      </label>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2">JPEG, PNG, GIF, or WebP — max 8 MB. Recommended: 512×512px</p>
                  </div>

                  {/* Event Controls */}
                  <div className="mb-6 p-4 rounded-xl bg-slate-950/50 border border-white/5">
                    <h3 className="text-sm font-semibold text-amber-400 mb-3">⚡ Event Controls</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      <button
                        onClick={async () => await handleToggleRegistration(selectedArenaEvent.id, !selectedArenaEvent.registration_open)}
                        className={`h-10 rounded-xl text-sm font-semibold transition ${
                          selectedArenaEvent.registration_open
                            ? "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
                            : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                        }`}
                      >
                        {selectedArenaEvent.registration_open ? "🔒 Close Reg" : "🔓 Open Reg"}
                      </button>
                      
                      <button
                        onClick={async () => await handleStartEvent(selectedArenaEvent.id)}
                        disabled={!selectedArenaEvent.registration_open}
                        className="h-10 rounded-xl bg-amber-500 text-amber-950 text-sm font-bold hover:bg-amber-400 disabled:opacity-40 transition"
                      >
                        🚀 START
                      </button>
                      
                      <button
                        onClick={async () => await handleAssignVCs(selectedArenaEvent.id)}
                        className="h-10 rounded-xl bg-violet-500/20 text-violet-300 text-sm font-semibold hover:bg-violet-500/30 transition"
                      >
                        🔊 Assign VCs
                      </button>
                      
                      <button
                        onClick={async () => await handleNextRound(selectedArenaEvent.id)}
                        className="h-10 rounded-xl bg-cyan-500/20 text-cyan-300 text-sm font-semibold hover:bg-cyan-500/30 transition"
                      >
                        ➡️ Next Round
                      </button>

                      <button
                        onClick={async () => await handleCloseEvent(selectedArenaEvent.id)}
                        className="h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-sm font-bold hover:bg-rose-500/30 transition"
                      >
                        ✖ Close Event
                      </button>
                    </div>
                  </div>

                  {/* Assigned Voice Channels */}
                  {selectedArenaEvent.metadata?.vc_assignments && selectedArenaEvent.metadata.vc_assignments.length > 0 && (
                    <div className="mb-6 p-4 rounded-xl bg-slate-950/50 border border-violet-500/20">
                      <h3 className="text-sm font-semibold text-violet-400 mb-3">🔊 Assigned Voice Channels</h3>
                      <div className="grid gap-2 max-h-40 overflow-y-auto">
                        {selectedArenaEvent.metadata.vc_assignments.map((assignment: any) => (
                          <div key={assignment.team_id} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-violet-400">{assignment.vc_channel}</span>
                              <span className="text-sm text-white">{assignment.team_name}</span>
                            </div>
                            <span className="text-xs text-slate-500">👑 {assignment.leader_username}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Vote Options Management */}
                  <div className="p-4 rounded-xl bg-slate-950/50 border border-white/5">
                    <h3 className="text-sm font-semibold text-amber-400 mb-3">🗳️ Voting Options</h3>
                    <div className="flex gap-2 mb-4">
                      <input
                        value={arenaNewVoteOption.name}
                        onChange={(e) => setArenaNewVoteOption({ ...arenaNewVoteOption, name: e.target.value })}
                        placeholder="Option name (e.g., Bows Only)"
                        className="flex-1 h-10 rounded-xl border border-white/8 bg-slate-900/80 px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/30 transition"
                      />
                      <input
                        value={arenaNewVoteOption.icon}
                        onChange={(e) => setArenaNewVoteOption({ ...arenaNewVoteOption, icon: e.target.value })}
                        placeholder="🎯"
                        className="w-16 h-10 rounded-xl border border-white/8 bg-slate-900/80 px-2 text-center text-sm text-white outline-none focus:border-cyan-400/30 transition"
                      />
                      <button
                        onClick={async () => await handleAddVoteOption(selectedArenaEvent.id)}
                        disabled={!arenaNewVoteOption.name.trim()}
                        className="px-4 h-10 rounded-xl bg-amber-500/20 text-amber-300 text-sm font-semibold hover:bg-amber-500/30 disabled:opacity-40"
                      >
                        Add
                      </button>
                    </div>

                    {/* Current Vote Results */}
                    {arenaVoteResults.length > 0 && (
                      <div className="space-y-2 mb-4">
                        {arenaVoteResults.map((result: any, index: number) => (
                          <div key={result.option_id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/30">
                            <span className="text-lg">{result.option_icon}</span>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className={`text-sm ${index === 0 ? "text-amber-400 font-semibold" : "text-white"}`}>
                                  {result.option_name}
                                  {index === 0 && " 👑"}
                                </span>
                                <span className="text-xs text-slate-400">{result.vote_count} votes ({result.percentage}%)</span>
                              </div>
                              <div className="h-2 rounded-full bg-slate-800 overflow-hidden mt-1">
                                <div
                                  className={`h-full rounded-full ${index === 0 ? "bg-amber-500" : "bg-violet-500"}`}
                                  style={{ width: `${result.percentage}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {arenaVoteResults.length > 0 && (
                      <button
                        onClick={async () => await handleFinalizeVotes(selectedArenaEvent.id)}
                        className="w-full h-10 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-sm font-bold text-white shadow-lg shadow-violet-500/15 hover:opacity-90 transition"
                      >
                        🏆 Finalize & Announce Winner
                      </button>
                    )}
                  </div>

                  {/* 🔴 LIVE ADMIN MONITORING PANEL */}
                  <div className="mt-6 p-4 rounded-xl bg-gradient-to-b from-rose-950/50 to-slate-950/80 border-2 border-rose-500/30">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-rose-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                        🔴 LIVE Command Center
                      </h3>
                      <span className="text-xs px-2 py-1 rounded-full bg-rose-500/20 text-rose-300">
                        Event Active
                      </span>
                    </div>

                    {/* Live Teams Status */}
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Team Status</h4>
                      <div className="grid gap-2 max-h-48 overflow-y-auto">
                        {arenaTeams.map((team: any) => (
                          <div key={team.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-white/5">
                            <div className="flex items-center gap-2">
                              {team.logo_url ? (
                                <img src={team.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
                                  {team.name[0]}
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-semibold text-white">{team.name}</p>
                                <p className="text-[10px] text-slate-500">
                                  {team.arena_team_members?.length || 0} members • 👑 {team.leader_username}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className={`w-2 h-2 rounded-full ${team.arena_team_members?.length > 0 ? "bg-emerald-500" : "bg-slate-500"}`}></span>
                              <button
                                onClick={async () => {
                                  if (confirm(`Remove team "${team.name}"? This cannot be undone.`)) {
                                    await handleRemoveTeam(selectedArenaEvent.id, team.id);
                                  }
                                }}
                                className="ml-2 px-2 py-1 rounded bg-rose-500/20 text-rose-400 text-xs hover:bg-rose-500/30"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 🔥 FFA Participant Grid */}
                    {selectedArenaEvent.metadata?.ffa_participants && selectedArenaEvent.metadata.ffa_participants.length > 0 && (() => {
                      const participants: any[] = selectedArenaEvent.metadata.ffa_participants;
                      const ffaWinner = participants.find((p: any) => p.status === "winner");
                      return (
                        <div className="mb-4">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-rose-500/40 to-transparent" />
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-rose-500/30 bg-rose-500/10">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                              <span className="text-[11px] font-bold text-rose-400 uppercase tracking-widest">
                                🔥 FFA — Round {selectedArenaEvent.current_round || 1} · {participants.length} Players
                              </span>
                            </div>
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-rose-500/40 to-transparent" />
                          </div>

                          {ffaWinner ? (
                            <div className="mb-3 rounded-2xl border border-amber-400/50 bg-gradient-to-r from-amber-950/60 to-slate-900/60 p-4 text-center shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                              <div className="text-3xl mb-1">🏆</div>
                              <div className="text-xs text-amber-400/70 uppercase tracking-widest mb-1">FFA Winner</div>
                              <div className="text-xl font-black text-amber-300">{ffaWinner.name}</div>
                              <div className="text-xs text-slate-500 mt-1">Team: {ffaWinner.team_name}</div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {participants.map((p: any, i: number) => (
                                <div key={p.id || i} className="relative rounded-xl border border-rose-500/20 bg-gradient-to-br from-rose-950/40 via-slate-950/80 to-slate-900/60 p-3 flex flex-col items-center gap-2">
                                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-rose-400/40 to-transparent" />
                                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500/30 to-orange-500/20 border border-rose-500/30 flex items-center justify-center text-lg font-black text-rose-300">
                                    {p.name?.[0]?.toUpperCase()}
                                  </div>
                                  <div className="text-center">
                                    <div className="text-xs font-bold text-white leading-tight">{p.name}</div>
                                    <div className="text-[10px] text-slate-500">{p.team_name}</div>
                                    {p.vc_channel && <div className="text-[10px] text-violet-400 font-mono">{p.vc_channel}</div>}
                                  </div>
                                  <button
                                    onClick={async () => await handleSetFFAWinner(selectedArenaEvent.id, p.name, p.team_name)}
                                    className="w-full py-1.5 rounded-lg bg-gradient-to-r from-amber-500/30 to-orange-500/20 border border-amber-500/40 text-amber-200 text-[10px] font-bold hover:from-amber-500/50 transition shadow-[0_0_8px_rgba(245,158,11,0.15)]"
                                  >🏆 Won</button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* ⚔️ Bracket */}
                    {selectedArenaEvent.metadata?.matches && selectedArenaEvent.metadata.matches.length > 0 && !selectedArenaEvent.metadata?.ffa_participants?.length && (
                      <div className="mb-4">
                        {/* Section header */}
                        <div className="flex items-center gap-3 mb-4">
                          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
                          <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest">
                              Round {selectedArenaEvent.current_round || 1} · {selectedArenaEvent.metadata.matches.length} Match{selectedArenaEvent.metadata.matches.length !== 1 ? "es" : ""}
                            </span>
                          </div>
                          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
                        </div>

                        <div className="space-y-3">
                          {selectedArenaEvent.metadata.matches.map((match: any) => {
                            const isDone = match.status === "completed";
                            return (
                              <div key={match.match_number} className={`relative rounded-2xl overflow-hidden border transition-all ${
                                isDone
                                  ? "border-slate-700/50 bg-slate-900/60"
                                  : "border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-slate-950/80 to-slate-900/60 shadow-[0_0_20px_rgba(245,158,11,0.08)]"
                              }`}>
                                {/* Top glow line */}
                                {!isDone && <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />}

                                {/* Match header */}
                                <div className={`flex items-center justify-between px-4 py-2 ${isDone ? "bg-slate-800/30" : "bg-amber-500/8"}`}>
                                  <div className="flex items-center gap-2">
                                    <span className="text-amber-500 text-xs">⚔</span>
                                    <span className="text-[11px] font-bold text-amber-400/80 uppercase tracking-widest">Match {match.match_number}</span>
                                  </div>
                                  {isDone
                                    ? <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-400 font-semibold border border-slate-600/30">✓ Complete</span>
                                    : <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/25"><span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />LIVE</span>
                                  }
                                </div>

                                {/* Body */}
                                {isDone ? (
                                  /* ── Completed state ── */
                                  <div className="flex items-center justify-between px-5 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 font-black text-base">
                                        {match.winner_name?.[0]?.toUpperCase()}
                                      </div>
                                      <div>
                                        <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-0.5">Winner</div>
                                        <div className="text-sm font-black text-amber-300 tracking-wide">{match.winner_name}</div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-lg">🏆</span>
                                      <button
                                        onClick={() => setSelectedArenaEvent((prev: any) => ({
                                          ...prev,
                                          metadata: { ...prev.metadata, matches: prev.metadata.matches.map((m: any) => m.match_number === match.match_number ? { ...m, status: "pending", winner_id: null, winner_name: null } : m) }
                                        }))}
                                        className="text-[10px] text-slate-600 hover:text-slate-400 underline transition"
                                      >Undo</button>
                                    </div>
                                  </div>
                                ) : (
                                  /* ── Active match ── */
                                  <div className="p-3">
                                    <div className="grid grid-cols-[1fr_56px_1fr] gap-2 items-stretch">

                                      {/* Team 1 */}
                                      <div className="flex flex-col items-center gap-1.5 rounded-xl bg-slate-900/70 border border-amber-500/15 p-3 hover:border-amber-500/30 transition">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/30 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-lg font-black text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
                                          {match.team1_name?.[0]?.toUpperCase()}
                                        </div>
                                        <span className="text-xs font-bold text-white text-center leading-tight">{match.team1_name}</span>
                                        {match.team1_vc && <span className="text-[10px] text-violet-400 font-mono bg-violet-500/10 px-1.5 py-0.5 rounded">{match.team1_vc}</span>}
                                        <button
                                          onClick={async () => await handleNotifyMatch(match, "team1")}
                                          className="mt-0.5 w-full py-1 rounded-lg bg-violet-500/15 border border-violet-500/20 text-violet-300 text-[10px] hover:bg-violet-500/25 transition"
                                        >📢 Ping</button>
                                        <button
                                          onClick={async () => await handleSetWinner(match, match.team1_id, match.team1_name)}
                                          className="w-full py-1.5 rounded-lg bg-gradient-to-r from-amber-500/30 to-orange-500/20 border border-amber-500/40 text-amber-200 text-[10px] font-bold hover:from-amber-500/50 hover:to-orange-500/35 transition shadow-[0_0_8px_rgba(245,158,11,0.15)]"
                                        >🏆 Won</button>
                                      </div>

                                      {/* Center VS */}
                                      <div className="flex flex-col items-center justify-center gap-2">
                                        <div className="relative">
                                          <div className="text-lg font-black text-amber-400 tracking-widest drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]">VS</div>
                                        </div>
                                        <button
                                          onClick={async () => await handleStartMatch(match)}
                                          className="w-full py-1.5 rounded-lg bg-gradient-to-b from-emerald-500/25 to-emerald-600/15 border border-emerald-500/30 text-emerald-300 text-[9px] font-bold hover:from-emerald-500/40 hover:border-emerald-400/50 transition shadow-[0_0_8px_rgba(16,185,129,0.15)] whitespace-nowrap"
                                        >▶ START</button>
                                      </div>

                                      {/* Team 2 */}
                                      <div className="flex flex-col items-center gap-1.5 rounded-xl bg-slate-900/70 border border-rose-500/15 p-3 hover:border-rose-500/30 transition">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500/30 to-pink-500/20 border border-rose-500/30 flex items-center justify-center text-lg font-black text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.2)]">
                                          {match.team2_name?.[0]?.toUpperCase()}
                                        </div>
                                        <span className="text-xs font-bold text-white text-center leading-tight">{match.team2_name}</span>
                                        {match.team2_vc && <span className="text-[10px] text-violet-400 font-mono bg-violet-500/10 px-1.5 py-0.5 rounded">{match.team2_vc}</span>}
                                        <button
                                          onClick={async () => await handleNotifyMatch(match, "team2")}
                                          className="mt-0.5 w-full py-1 rounded-lg bg-violet-500/15 border border-violet-500/20 text-violet-300 text-[10px] hover:bg-violet-500/25 transition"
                                        >📢 Ping</button>
                                        <button
                                          onClick={async () => await handleSetWinner(match, match.team2_id, match.team2_name)}
                                          className="w-full py-1.5 rounded-lg bg-gradient-to-r from-rose-500/30 to-pink-500/20 border border-rose-500/40 text-rose-200 text-[10px] font-bold hover:from-rose-500/50 hover:to-pink-500/35 transition shadow-[0_0_8px_rgba(244,63,94,0.15)]"
                                        >🏆 Won</button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Bye teams */}
                        {selectedArenaEvent.metadata?.vc_assignments &&
                          (() => {
                            const matchedIds = new Set(selectedArenaEvent.metadata.matches.flatMap((m: any) => [m.team1_id, m.team2_id]));
                            const byeTeams = (selectedArenaEvent.metadata.vc_assignments as any[]).filter(v => !matchedIds.has(v.team_id));
                            return byeTeams.length > 0 ? (
                              <div className="mt-3 space-y-1">
                                {byeTeams.map((t: any) => (
                                  <div key={t.team_id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5">
                                    <span className="text-base">🏅</span>
                                    <span className="text-sm font-semibold text-amber-200">{t.team_name}</span>
                                    <span className="text-xs text-slate-500 ml-auto">Bye — auto-advances</span>
                                  </div>
                                ))}
                              </div>
                            ) : null;
                          })()
                        }
                      </div>
                    )}
                    {/* No matches yet */}
                    {(!selectedArenaEvent.metadata?.matches || selectedArenaEvent.metadata.matches.length === 0) && (
                      <div className="mb-4 rounded-xl border border-white/5 bg-slate-900/40 px-4 py-6 text-center">
                        <div className="text-2xl mb-2">⚔️</div>
                        <p className="text-sm text-slate-400 font-semibold">No bracket yet</p>
                        <p className="text-xs text-slate-600 mt-1">Hit <span className="text-amber-400">🚀 START</span> to generate the bracket and assign voice channels.</p>
                      </div>
                    )}

                    {/* ── Round Complete Banner ── */}
                    {(() => {
                      const matches = selectedArenaEvent.metadata?.matches || [];
                      const allDone = matches.length > 0 && matches.every((m: any) => m.status === "completed");
                      if (!allDone) return null;
                      const winners = matches.filter((m: any) => m.winner_name).map((m: any) => m.winner_name);
                      const isChampion = winners.length === 1;

                      if (isChampion) {
                        return (
                          <div className="mb-4 relative rounded-2xl overflow-hidden border border-amber-400/50 bg-gradient-to-br from-amber-950/60 via-slate-950/80 to-slate-900/60 shadow-[0_0_30px_rgba(245,158,11,0.2)] text-center py-6 px-5">
                            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/80 to-transparent" />
                            <div className="text-3xl mb-2">🏆</div>
                            <div className="text-xs text-amber-400/70 uppercase tracking-widest mb-1">Tournament Champion</div>
                            <div className="text-xl font-black text-amber-300">{winners[0]}</div>
                            <div className="text-xs text-slate-500 mt-2">The tournament is complete!</div>
                          </div>
                        );
                      }

                      return (
                        <div className="mb-4 relative rounded-2xl overflow-hidden border border-emerald-500/40 bg-gradient-to-br from-emerald-950/60 via-slate-950/80 to-slate-900/60 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/80 to-transparent" />
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xl shadow-[0_0_15px_rgba(16,185,129,0.3)]">✅</div>
                              <div>
                                <div className="text-xs text-emerald-400/70 uppercase tracking-widest mb-0.5">Round {selectedArenaEvent.current_round || 1} Complete</div>
                                <div className="text-sm font-black text-emerald-300">{winners.length} teams advancing — generate next bracket</div>
                              </div>
                            </div>
                            <button
                              onClick={async () => await handleNextRound(selectedArenaEvent.id)}
                              className="shrink-0 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500/40 to-cyan-500/30 border border-emerald-400/50 text-emerald-200 text-sm font-black hover:from-emerald-500/60 hover:to-cyan-500/50 transition shadow-[0_0_15px_rgba(16,185,129,0.25)] whitespace-nowrap"
                            >
                              ➡️ Advance to Round {(selectedArenaEvent.current_round || 1) + 1}
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* ── Game Rules Panel ── */}
                    <div className="pt-3 border-t border-white/10">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/10">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                          <span className="text-[11px] font-bold text-violet-400 uppercase tracking-widest">Game Rules</span>
                        </div>
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
                      </div>

                      {/* Mode presets */}
                      <div className="mb-3">
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Quick Preset</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { label: "Standard", icon: "⚔️", mode: "Standard", weapons: [], ffa: false, no_deviants: false },
                            { label: "FFA", icon: "🔥", mode: "Free For All", weapons: [], ffa: true, no_deviants: false },
                            { label: "Pistols", icon: "🔫", mode: "Pistols Only", weapons: ["Pistols"], ffa: false, no_deviants: true },
                            { label: "Bows", icon: "🏹", mode: "Bows Only", weapons: ["Bows"], ffa: false, no_deviants: true },
                            { label: "Knife", icon: "🗡️", mode: "Knife Only", weapons: ["Knife"], ffa: true, no_deviants: true },
                            { label: "No Deviants", icon: "🚫", mode: "No Deviants", weapons: [], ffa: false, no_deviants: true },
                            { label: "Bows + Knife", icon: "🏹🗡️", mode: "Bows & Knife", weapons: ["Bows", "Knife"], ffa: false, no_deviants: true },
                            { label: "Pistols + Knife", icon: "🔫🗡️", mode: "Pistols & Knife", weapons: ["Pistols", "Knife"], ffa: false, no_deviants: true },
                          ].map((preset) => {
                            const isActive = arenaRules.mode === preset.mode;
                            return (
                              <button
                                key={preset.label}
                                onClick={() => setArenaRules({ mode: preset.mode, ffa: preset.ffa, weapons: preset.weapons, no_deviants: preset.no_deviants, extra: arenaRules.extra })}
                                className={`py-2 px-2 rounded-xl border text-[11px] font-bold transition-all ${
                                  isActive
                                    ? "border-violet-400/60 bg-violet-500/25 text-violet-200 shadow-[0_0_10px_rgba(139,92,246,0.3)]"
                                    : "border-white/8 bg-slate-900/50 text-slate-400 hover:border-violet-500/30 hover:text-violet-300"
                                }`}
                              >
                                <div>{preset.icon}</div>
                                <div className="mt-0.5">{preset.label}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Live rule toggles */}
                      <div className="rounded-xl border border-violet-500/20 bg-slate-900/60 p-3 mb-3 space-y-2">
                        {[
                          { key: "ffa", label: "Free For All", icon: "🔥", desc: "No teams — solo survival" },
                          { key: "no_deviants", label: "No Deviants", icon: "🚫", desc: "Deviant abilities disabled" },
                        ].map(({ key, label, icon, desc }) => {
                          const val = arenaRules[key as "ffa" | "no_deviants"];
                          return (
                            <div key={key} className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <span>{icon}</span>
                                <div>
                                  <div className="text-xs font-semibold text-white">{label}</div>
                                  <div className="text-[10px] text-slate-500">{desc}</div>
                                </div>
                              </div>
                              <button
                                onClick={() => setArenaRules((r) => ({ ...r, [key]: !val }))}
                                className={`relative w-10 h-5 rounded-full transition-all ${val ? "bg-violet-500" : "bg-slate-700"}`}
                              >
                                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${val ? "left-5" : "left-0.5"}`} />
                              </button>
                            </div>
                          );
                        })}

                        {/* Weapon toggles */}
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">Allowed Weapons</div>
                          <div className="flex flex-wrap gap-1.5">
                            {["Pistols", "Bows", "Knife", "AR", "Shotgun", "Sniper"].map((w) => {
                              const active = arenaRules.weapons.includes(w);
                              return (
                                <button
                                  key={w}
                                  onClick={() => setArenaRules((r) => ({
                                    ...r,
                                    weapons: active ? r.weapons.filter((x) => x !== w) : [...r.weapons, w],
                                  }))}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                                    active
                                      ? "border-cyan-400/50 bg-cyan-500/20 text-cyan-200"
                                      : "border-white/8 bg-slate-800/60 text-slate-500 hover:text-slate-300"
                                  }`}
                                >
                                  {active ? "✓ " : ""}{w}
                                </button>
                              );
                            })}
                            {arenaRules.weapons.length === 0 && (
                              <span className="text-[10px] text-slate-600 italic">All weapons allowed</span>
                            )}
                          </div>
                        </div>

                        {/* Extra notes */}
                        <input
                          value={arenaRules.extra}
                          onChange={(e) => setArenaRules((r) => ({ ...r, extra: e.target.value }))}
                          placeholder="Additional rules / notes..."
                          className="w-full mt-1 h-8 rounded-lg border border-white/8 bg-slate-800/80 px-3 text-[11px] text-white outline-none placeholder:text-slate-600 focus:border-violet-400/30 transition"
                        />
                      </div>

                      {/* Live preview badge row */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        <span className="px-2 py-1 rounded-full bg-violet-500/15 border border-violet-500/25 text-[10px] font-bold text-violet-300">{arenaRules.mode}</span>
                        {arenaRules.ffa && <span className="px-2 py-1 rounded-full bg-rose-500/15 border border-rose-500/25 text-[10px] font-bold text-rose-300">🔥 FFA</span>}
                        {arenaRules.no_deviants && <span className="px-2 py-1 rounded-full bg-amber-500/15 border border-amber-500/25 text-[10px] font-bold text-amber-300">🚫 No Deviants</span>}
                        {arenaRules.weapons.map((w) => (
                          <span key={w} className="px-2 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/25 text-[10px] font-bold text-cyan-300">🔫 {w}</span>
                        ))}
                      </div>

                      <button
                        onClick={() => void handleUpdateRules()}
                        disabled={rulesSaving}
                        className={`w-full py-2.5 rounded-xl text-sm font-black transition-all border ${
                          rulesSaved
                            ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-300"
                            : "bg-gradient-to-r from-violet-500/30 to-purple-500/20 border-violet-400/40 text-violet-200 hover:from-violet-500/50 hover:border-violet-400/60 shadow-[0_0_12px_rgba(139,92,246,0.2)]"
                        } disabled:opacity-50`}
                      >
                        {rulesSaved ? "✓ Rules Published to Discord!" : rulesSaving ? "Publishing..." : "📋 Publish Rules to Discord"}
                      </button>
                    </div>

                    {/* Admin Actions */}
                    <div className="pt-3 border-t border-white/10">
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Broadcast Actions</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          onClick={async () => await handleNotifyAllTeams(selectedArenaEvent.id, "🎮 It's your turn in the arena! Join your assigned voice channel NOW!")}
                          className="py-2 rounded bg-amber-500/20 text-amber-300 text-sm font-semibold hover:bg-amber-500/30"
                        >
                          📢 Notify All: Your Turn
                        </button>
                        <button
                          onClick={async () => await handleNotifyAllTeams(selectedArenaEvent.id, "⏰ Match starting in 5 minutes! Get ready!")}
                          className="py-2 rounded bg-cyan-500/20 text-cyan-300 text-sm font-semibold hover:bg-cyan-500/30"
                        >
                          ⏰ 5 Min Warning
                        </button>
                        <button
                          onClick={async () => await handleGenerateBracket(selectedArenaEvent.id)}
                          className="py-2 rounded bg-rose-500/20 text-rose-300 text-sm font-semibold hover:bg-rose-500/30"
                        >
                          ⚔️ Generate Bracket
                        </button>
                        <button
                          onClick={async () => await handleShuffleTeams(selectedArenaEvent.id)}
                          className="py-2 rounded bg-violet-500/20 text-violet-300 text-sm font-semibold hover:bg-violet-500/30"
                        >
                          🔀 Shuffle Matches
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════ INVENTORY ════ */}
          {activeTab === "inventory" && (
            <div className="space-y-6">
              {/* Header with stats */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">User Inventory</h2>
                  <p className="text-sm text-slate-400">Track purchased items, insurance claims, and pack usage.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowGivePackageModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 text-sm font-semibold hover:bg-emerald-500/30 transition"
                  >
                    🎁 Give Package
                  </button>
                  <button
                    onClick={() => void loadInventory()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 text-sm font-semibold hover:bg-cyan-500/30 transition"
                  >
                    🔄 Refresh
                  </button>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="rounded-xl border border-white/6 bg-slate-900/50 p-4">
                  <div className="text-2xl font-bold text-white">{inventorySummary.total}</div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider">Total Items</div>
                </div>
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                  <div className="text-2xl font-bold text-emerald-400">{inventorySummary.available}</div>
                  <div className="text-xs text-emerald-500/70 uppercase tracking-wider">Available</div>
                </div>
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                  <div className="text-2xl font-bold text-amber-400">{inventorySummary.saved}</div>
                  <div className="text-xs text-amber-500/70 uppercase tracking-wider">Saved</div>
                </div>
                <div className="rounded-xl border border-slate-500/20 bg-slate-500/10 p-4">
                  <div className="text-2xl font-bold text-slate-400">{inventorySummary.used}</div>
                  <div className="text-xs text-slate-500/70 uppercase tracking-wider">Used</div>
                </div>
                <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-4">
                  <div className="text-2xl font-bold text-violet-400">{inventorySummary.insurance_count}</div>
                  <div className="text-xs text-violet-500/70 uppercase tracking-wider">Insurance</div>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <input
                  type="text"
                  placeholder="Search by user ID..."
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  className="px-4 py-2 rounded-xl bg-slate-900/50 border border-white/10 text-white text-sm placeholder:text-slate-500 focus:border-cyan-500/50 outline-none"
                />
                <select
                  value={inventoryFilter}
                  onChange={(e) => setInventoryFilter(e.target.value)}
                  className="px-4 py-2 rounded-xl bg-slate-900/50 border border-white/10 text-white text-sm focus:border-cyan-500/50 outline-none"
                >
                  <option value="all">All Items</option>
                  <option value="available">Available</option>
                  <option value="used">Used</option>
                  <option value="saved">Saved</option>
                  <option value="insurance">Insurance Only</option>
                </select>
              </div>

              {/* Inventory Table */}
              <div className="rounded-2xl border border-white/6 bg-slate-900/50 overflow-hidden">
                <div className="border-b border-white/6 px-5 py-3 grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 text-[11px] font-semibold uppercase tracking-widest text-slate-600">
                  <span>User</span>
                  <span>Item</span>
                  <span>Status</span>
                  <span>Date</span>
                  <span>Actions</span>
                </div>
                
                {inventoryLoading ? (
                  <div className="px-5 py-8 text-center text-slate-500">Loading inventory...</div>
                ) : inventoryItems.length === 0 ? (
                  <div className="px-5 py-8 text-center text-slate-500">No items in inventory</div>
                ) : (
                  <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
                    {inventoryItems
                      .filter((item) => {
                        if (inventoryFilter === "all") return true;
                        if (inventoryFilter === "insurance") return item.item_type === "insurance";
                        return item.status === inventoryFilter;
                      })
                      .filter((item) => {
                        if (!inventorySearch) return true;
                        return item.user_id?.toLowerCase().includes(inventorySearch.toLowerCase());
                      })
                      .map((item) => (
                        <div key={item.id} className="px-5 py-3 grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 items-center text-sm">
                          <div className="font-mono text-xs text-slate-400 truncate">
                            {item.user_id?.slice(0, 12)}...
                          </div>
                          <div>
                            <span className="text-white">{item.item_name}</span>
                            {item.item_type === "insurance" && (
                              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300">INS</span>
                            )}
                          </div>
                          <div>
                            <span className={`text-[10px] px-2 py-1 rounded-full uppercase font-bold ${
                              item.status === "available" ? "bg-emerald-500/20 text-emerald-400" :
                              item.status === "used" ? "bg-slate-500/20 text-slate-400" :
                              item.status === "saved" ? "bg-amber-500/20 text-amber-400" :
                              "bg-rose-500/20 text-rose-400"
                            }`}>
                              {item.status}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500">
                            {new Date(item.purchase_date).toLocaleDateString()}
                          </div>
                          <div className="flex gap-1">
                            {item.status === "available" && (
                              <>
                                <button
                                  onClick={() => void handleInventoryAction([item.id], "mark_used")}
                                  className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 text-xs hover:bg-emerald-500/30"
                                  title="Mark as used"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => void handleInventoryAction([item.id], "mark_saved")}
                                  className="px-2 py-1 rounded bg-amber-500/20 text-amber-400 text-xs hover:bg-amber-500/30"
                                  title="Save for next wipe"
                                >
                                  💾
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => void handleInventoryAction([item.id], "delete")}
                              className="px-2 py-1 rounded bg-rose-500/20 text-rose-400 text-xs hover:bg-rose-500/30"
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Package Logs Section */}
              <div className="pt-6 border-t border-white/10">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">Package Logs</h3>
                    <p className="text-sm text-slate-400">History of all package transactions and usage.</p>
                  </div>
                  {packageLogsSummary && (
                    <div className="flex gap-3 text-xs">
                      <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400">
                        Given: {packageLogsSummary.admin_given || 0}
                      </span>
                      <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-400">
                        Used: {packageLogsSummary.user_used || 0}
                      </span>
                      <span className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-400">
                        Saved: {packageLogsSummary.user_saved || 0}
                      </span>
                    </div>
                  )}
                </div>

                {/* Log Filters */}
                <div className="flex flex-wrap gap-3 mb-4">
                  <input
                    type="text"
                    placeholder="Filter by user ID..."
                    value={packageLogsUserFilter}
                    onChange={(e) => setPackageLogsUserFilter(e.target.value)}
                    className="px-4 py-2 rounded-xl bg-slate-900/50 border border-white/10 text-white text-sm placeholder:text-slate-500 focus:border-cyan-500/50 outline-none"
                  />
                  <select
                    value={packageLogsFilter}
                    onChange={(e) => setPackageLogsFilter(e.target.value)}
                    className="px-4 py-2 rounded-xl bg-slate-900/50 border border-white/10 text-white text-sm focus:border-cyan-500/50 outline-none"
                  >
                    <option value="all">All Actions</option>
                    <option value="admin_given">Admin Given</option>
                    <option value="user_used">User Used</option>
                    <option value="user_saved">User Saved</option>
                    <option value="admin_revoked">Admin Revoked</option>
                  </select>
                  <button
                    onClick={() => void loadPackageLogs()}
                    className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 text-sm font-semibold hover:bg-cyan-500/30 transition"
                  >
                    🔍 Search
                  </button>
                </div>

                {/* Logs Table */}
                <div className="rounded-2xl border border-white/6 bg-slate-900/50 overflow-hidden">
                  <div className="border-b border-white/6 px-5 py-3 grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 text-[11px] font-semibold uppercase tracking-widest text-slate-600">
                    <span>Time</span>
                    <span>Action</span>
                    <span>User</span>
                    <span>Item</span>
                    <span>By</span>
                  </div>
                  
                  {packageLogsLoading ? (
                    <div className="px-5 py-8 text-center text-slate-500">Loading logs...</div>
                  ) : packageLogs.length === 0 ? (
                    <div className="px-5 py-8 text-center text-slate-500">No logs found</div>
                  ) : (
                    <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
                      {packageLogs.map((log) => (
                        <div key={log.id} className="px-5 py-3 grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 items-center text-sm">
                          <div className="text-xs text-slate-500">
                            {new Date(log.action_at).toLocaleString()}
                          </div>
                          <div>
                            <span className={`text-[10px] px-2 py-1 rounded-full uppercase font-bold ${
                              log.action === "admin_given" ? "bg-emerald-500/20 text-emerald-400" :
                              log.action === "user_used" ? "bg-amber-500/20 text-amber-400" :
                              log.action === "user_saved" ? "bg-cyan-500/20 text-cyan-400" :
                              log.action === "admin_revoked" ? "bg-rose-500/20 text-rose-400" :
                              "bg-slate-500/20 text-slate-400"
                            }`}>
                              {log.action.replace("_", " ")}
                            </span>
                          </div>
                          <div className="font-mono text-xs text-slate-400 truncate">
                            {log.user_id?.slice(0, 12)}...
                          </div>
                          <div className="text-white">{log.item_name}</div>
                          <div className="text-xs text-slate-500">
                            {log.action_by_name || log.action_by?.slice(0, 8)}...
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {packageLogsHasMore && (
                    <div className="px-5 py-3 border-t border-white/6 text-center">
                      <button
                        onClick={() => void loadPackageLogs(packageLogsOffset + 50, true)}
                        className="text-sm text-cyan-400 hover:text-cyan-300"
                      >
                        Load more...
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Give Package Modal */}
              {showGivePackageModal && (
                <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-black/70 overflow-y-auto">
                  <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-5 sm:p-6 shadow-2xl my-auto">
                    <h3 className="text-xl font-bold text-white mb-4">Give Package to User</h3>
                    
                    <form onSubmit={handleGivePackage} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Search User *</label>
                        <input
                          type="text"
                          placeholder="Type name or Discord ID..."
                          value={userSearchQuery}
                          onChange={(e) => {
                            setUserSearchQuery(e.target.value);
                            setShowUserDropdown(true);
                            if (!e.target.value) {
                              setGivePackageForm(prev => ({ ...prev, user_id: "", user_name: "" }));
                            }
                          }}
                          onFocus={() => setShowUserDropdown(true)}
                          className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-sm focus:border-cyan-500/50 outline-none"
                        />
                        {showUserDropdown && userSearchQuery.length >= 1 && (
                          <div className="relative">
                            <div className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto rounded-xl bg-slate-800 border border-white/10 shadow-xl">
                              {(stats?.summary.members || [])
                                .filter((m: MemberSummary) => {
                                  const q = userSearchQuery.toLowerCase();
                                  return (
                                    m.discordId.includes(q) ||
                                    m.username?.toLowerCase().includes(q) ||
                                    m.globalName?.toLowerCase().includes(q)
                                  );
                                })
                                .slice(0, 10)
                                .map((m: MemberSummary) => {
                                  const name = m.globalName || m.username;
                                  return (
                                    <button
                                      key={m.discordId}
                                      type="button"
                                      onClick={() => {
                                        setGivePackageForm(prev => ({ ...prev, user_id: m.discordId, user_name: name }));
                                        setUserSearchQuery(`${name} (${m.discordId})`);
                                        setShowUserDropdown(false);
                                      }}
                                      className="w-full text-left px-3 py-2 text-sm hover:bg-white/5 border-b border-white/5 last:border-0"
                                    >
                                      <div className="font-medium text-white">{name}</div>
                                      <div className="text-xs text-slate-500 font-mono">{m.discordId}</div>
                                    </button>
                                  );
                                })}
                              {(stats?.summary.members || []).filter((m: MemberSummary) => {
                                const q = userSearchQuery.toLowerCase();
                                return m.discordId.includes(q) || m.username?.toLowerCase().includes(q) || m.globalName?.toLowerCase().includes(q);
                              }).length === 0 && (
                                <div className="px-3 py-3 text-sm text-slate-500">
                                  No users found. You can still paste a Discord ID directly.
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setGivePackageForm(prev => ({ ...prev, user_id: userSearchQuery, user_name: userSearchQuery }));
                                      setShowUserDropdown(false);
                                    }}
                                    className="mt-2 block text-cyan-400 hover:text-cyan-300"
                                  >
                                    Use "{userSearchQuery}" as Discord ID →
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        {givePackageForm.user_id && (
                          <div className="mt-2 text-xs text-emerald-400">
                            ✓ Selected: {givePackageForm.user_name} (<span className="font-mono">{givePackageForm.user_id}</span>)
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Item Type</label>
                        <select
                          value={givePackageForm.item_type}
                          onChange={(e) => setGivePackageForm(prev => ({ ...prev, item_type: e.target.value }))}
                          className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-sm focus:border-cyan-500/50 outline-none"
                        >
                          <option value="pack">Pack</option>
                          <option value="insurance">Insurance</option>
                          <option value="construction">Construction</option>
                          <option value="defense">Defense</option>
                          <option value="tactical">Tactical</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Package Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g., Construction Package"
                          value={givePackageForm.item_name}
                          onChange={(e) => {
                            const name = e.target.value;
                            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
                            setGivePackageForm(prev => ({ ...prev, item_name: name, item_slug: slug || "package" }));
                          }}
                          className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-sm focus:border-cyan-500/50 outline-none"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Reason</label>
                        <input
                          type="text"
                          placeholder="Why are you giving this package?"
                          value={givePackageForm.reason}
                          onChange={(e) => setGivePackageForm(prev => ({ ...prev, reason: e.target.value }))}
                          className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-white/10 text-white text-sm focus:border-cyan-500/50 outline-none"
                        />
                      </div>
                      
                      <div className="flex gap-3 pt-4">
                        <button
                          type="button"
                          onClick={() => setShowGivePackageModal(false)}
                          className="flex-1 px-4 py-2 rounded-xl border border-white/10 text-slate-300 text-sm font-semibold hover:bg-white/5 transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={givePackageLoading}
                          className="flex-1 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 text-sm font-semibold hover:bg-emerald-500/30 transition disabled:opacity-50"
                        >
                          {givePackageLoading ? "Giving..." : "Give Package"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════ TICKETS ════ */}
          {activeTab === "tickets" && (
            <div className="grid gap-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight">Support Tickets</h1>
                  <p className="mt-0.5 text-sm text-slate-500">View and manage user support requests.</p>
                </div>
                <button type="button" onClick={() => void loadTickets()} disabled={ticketsLoading}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-white/10 hover:text-white transition disabled:opacity-40">
                  {ticketsLoading ? "⟳" : "↻"} Refresh
                </button>
                <div className="flex gap-2">
                  {[{label:"Open",val:tickets.filter(t=>t.status==="open").length,color:"text-amber-400"},{label:"Resolved",val:tickets.filter(t=>t.status==="resolved").length,color:"text-emerald-400"},{label:"Closed",val:tickets.filter(t=>t.status==="closed").length,color:"text-slate-500"}].map(s=>(
                    <div key={s.label} className="rounded-xl border border-white/8 bg-white/4 px-3 py-1.5 text-center">
                      <div className={`text-sm font-black ${s.color}`}>{s.val}</div>
                      <div className="text-[10px] text-slate-600">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              {ticketStatusMsg && (
                <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${ticketStatusMsg.startsWith("✓") ? "border-emerald-500/20 bg-emerald-500/8 text-emerald-300" : "border-rose-500/20 bg-rose-500/8 text-rose-300"}`}>{ticketStatusMsg}</div>
              )}
              {ticketsLoading && <div className="text-sm text-slate-500 animate-pulse">Loading tickets…</div>}
              <div className="rounded-2xl border border-white/6 bg-gradient-to-b from-slate-900/80 to-slate-950/80 overflow-hidden">
                <div className="divide-y divide-white/4">
                  {tickets.length === 0 && !ticketsLoading && (
                    <div className="py-10 text-center text-sm text-slate-600">No tickets yet.</div>
                  )}
                  {tickets.map((ticket) => (
                    <div key={ticket.id} className="px-5 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                              ticket.status === "open" ? "border-amber-400/25 bg-amber-400/10 text-amber-300" :
                              ticket.status === "resolved" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" :
                              "border-slate-500/20 bg-slate-500/10 text-slate-400"
                            }`}>{ticket.status}</span>
                            <span className="text-sm font-semibold text-slate-100 truncate">{ticket.subject}</span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            <span className="text-slate-400">{ticket.guest_username}</span>
                            <span className="mx-1.5 text-slate-700">·</span>
                            {new Date(ticket.created_at).toLocaleString()}
                          </div>
                          <div className="mt-1.5 text-sm text-slate-400 line-clamp-2 bg-slate-900/60 rounded-xl px-3 py-2 border border-white/5">{ticket.message}</div>
                          {ticket.discord_channel_id && (
                            <div className="mt-1.5 flex items-center gap-2">
                              <button type="button"
                                onClick={() => setLiveTicketId(liveTicketId === ticket.id ? null : ticket.id)}
                                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold border transition ${
                                  liveTicketId === ticket.id
                                    ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
                                    : "border-white/10 bg-white/5 text-slate-400 hover:text-cyan-300 hover:border-cyan-400/20"
                                }`}>
                                {liveTicketId === ticket.id ? "✕ Hide Chat" : "💬 Join Chat"}
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-1.5 flex-wrap items-start">
                          {ticket.status !== "resolved" && ticket.status !== "closed" && (
                            <button type="button"
                              onClick={async () => {
                                setTicketStatusMsg("");
                                const res = await fetch("/api/admin/tickets", { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({id: ticket.id, status:"resolved"}) });
                                const d = await res.json().catch(()=>({}));
                                if (d.ok) { setTickets(prev => prev.map(t => t.id === ticket.id ? {...t, status:"resolved"} : t)); setTicketStatusMsg("✓ Ticket marked resolved."); }
                                else setTicketStatusMsg(d.error || "Failed.");
                              }}
                              className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition">✓ Resolve</button>
                          )}
                          {ticket.status !== "closed" && (
                            <button type="button"
                              onClick={async () => {
                                setTicketStatusMsg("");
                                const adminName = stats?.viewer?.username ?? "Admin";
                                const res = await fetch(`/api/support/ticket/${ticket.id}/close`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({channelId: ticket.discord_channel_id ?? "", closedBy: adminName}) });
                                const d = await res.json().catch(()=>({}));
                                if (d.ok) { setTickets(prev => prev.map(t => t.id === ticket.id ? {...t, status:"closed"} : t)); setLiveTicketId(null); setTicketStatusMsg("✓ Ticket closed."); }
                                else setTicketStatusMsg(d.error || "Failed.");
                              }}
                              className="rounded-lg border border-slate-500/20 bg-slate-500/10 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:bg-slate-500/20 transition">🔒 Close</button>
                          )}
                        </div>
                      </div>
                      {liveTicketId === ticket.id && ticket.discord_channel_id && (
                        <AdminTicketChat ticketId={ticket.id} channelId={ticket.discord_channel_id} adminName={stats?.viewer?.username ?? "Admin"} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════ MOD LOG ════ */}
          {activeTab === "modlog" && (
            <div className="grid gap-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight">Moderation Center</h1>
                  <p className="mt-0.5 text-sm text-slate-500">Multi-signature moderation · Owners execute immediately · Regular admins need 2 approvals to ban</p>
                </div>
                <button type="button" onClick={() => { setShowModModal(true); setModTargetId(""); }}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-orange-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-rose-500/15 hover:opacity-90 transition">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  New Action
                </button>
              </div>

              {modStatus && (
                <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${
                  modStatus.startsWith("✓") ? "border-emerald-500/20 bg-emerald-500/8 text-emerald-300" :
                  modStatus.startsWith("⏳") ? "border-amber-400/20 bg-amber-500/8 text-amber-300" :
                  "border-rose-500/20 bg-rose-500/8 text-rose-300"
                }`}>{modStatus}</div>
              )}

              {/* Pending Bans Section */}
              {pendingBans.filter(pb => pb.status === "pending").length > 0 && (
                <div className="rounded-2xl border border-amber-400/30 bg-gradient-to-b from-amber-950/40 to-slate-950/80 overflow-hidden">
                  <div className="border-b border-amber-400/20 px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400">⏳</span>
                      <span className="text-sm font-bold text-amber-200">Pending Ban Proposals</span>
                      <span className="text-xs text-amber-400/60">({pendingBans.filter(pb => pb.status === "pending").length} awaiting approval)</span>
                    </div>
                  </div>
                  <div className="divide-y divide-amber-400/10">
                    {pendingBans.filter(pb => pb.status === "pending").map((pb) => {
                      const approvals = pb.approvals || [];
                      const hasApproved = approvals.some(a => a.discord_id === stats?.viewer?.discordId);
                      const isProposer = pb.proposed_by_discord_id === stats?.viewer?.discordId;
                      return (
                        <div key={pb.id} className="px-5 py-4">
                          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/15 text-rose-400 text-lg">🔨</div>
                              <div>
                                <div className="text-sm font-bold text-white">Ban <span className="font-mono text-slate-400">{pb.target_discord_id.slice(0, 12)}...</span></div>
                                <div className="text-xs text-slate-500">Proposed by {pb.proposed_by_username}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-amber-400">{approvals.length}/2 approvals</span>
                            </div>
                          </div>

                          <div className="mb-3 text-sm text-slate-300 bg-slate-900/50 rounded-lg px-3 py-2 border border-white/5">
                            <span className="text-slate-500">Reason:</span> {pb.reason}
                          </div>

                          {/* Approval Tracker */}
                          <div className="mb-3">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Approval Tracker</div>
                            <div className="flex flex-wrap gap-2">
                              {approvals.map((approval, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1">
                                  <span className="text-emerald-400 text-xs">✓</span>
                                  <span className="text-xs font-medium text-emerald-200">{approval.username}</span>
                                  <span className="text-[10px] text-emerald-400/60">{new Date(approval.approved_at).toLocaleTimeString()}</span>
                                </div>
                              ))}
                              {Array.from({ length: Math.max(0, 2 - approvals.length) }).map((_, idx) => (
                                <div key={`empty-${idx}`} className="flex items-center gap-1.5 rounded-full border border-slate-600/30 bg-slate-800/30 px-2.5 py-1">
                                  <span className="text-slate-600 text-xs">○</span>
                                  <span className="text-xs font-medium text-slate-500">Awaiting...</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-2">
                            {!hasApproved && !isProposer && (
                              <button
                                type="button"
                                disabled={pendingBanActionLoading === pb.id + "approve"}
                                onClick={() => setShowApproveModal(pb.id)}
                                className="flex items-center gap-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25 transition disabled:opacity-50"
                              >
                                {pendingBanActionLoading === pb.id + "approve" ? "Processing..." : "✓ Approve Ban"}
                              </button>
                            )}
                            {(isOwner || isProposer) && (
                              <button
                                type="button"
                                disabled={pendingBanActionLoading === pb.id + "reject"}
                                onClick={() => handleApproveBan(pb.id, "reject")}
                                className="flex items-center gap-1.5 rounded-xl bg-slate-700/30 border border-slate-600/30 px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-700/50 transition disabled:opacity-50"
                              >
                                {pendingBanActionLoading === pb.id + "reject" ? "Processing..." : "✕ Reject"}
                              </button>
                            )}
                            {isOwner && (
                              <button
                                type="button"
                                disabled={pendingBanActionLoading === pb.id + "approve"}
                                onClick={() => setShowApproveModal(pb.id)}
                                className="flex items-center gap-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 px-3 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-500/25 transition disabled:opacity-50"
                              >
                                🔨 Execute Now (Owner)
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Executed/Rejected Bans History */}
              {pendingBans.filter(pb => pb.status !== "pending").length > 0 && (
                <div className="rounded-2xl border border-white/6 bg-slate-900/50 overflow-hidden">
                  <div className="border-b border-white/6 px-5 py-3">
                    <span className="text-sm font-bold text-slate-300">Multi-Sig Ban History</span>
                  </div>
                  <div className="divide-y divide-white/5 max-h-[200px] overflow-y-auto">
                    {pendingBans.filter(pb => pb.status !== "pending").map((pb) => (
                      <div key={pb.id} className="px-5 py-2.5 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className={pb.status === "executed" ? "text-rose-400" : pb.status === "rejected" ? "text-slate-500" : "text-amber-400"}>
                            {pb.status === "executed" ? "🔨" : pb.status === "rejected" ? "✕" : "⏳"}
                          </span>
                          <span className="font-mono text-xs text-slate-400">{pb.target_discord_id.slice(0, 12)}...</span>
                          <span className="text-xs text-slate-500">by {pb.proposed_by_username}</span>
                        </div>
                        <div className="text-xs">
                          {pb.status === "executed" && (
                            <span className="text-emerald-400">Executed by {pb.executed_by_username}</span>
                          )}
                          {pb.status === "rejected" && (
                            <span className="text-slate-500">Rejected by {pb.rejected_by_username}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Regular Mod Actions Table */}
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

      {/* ════ APPROVE BAN MODAL ════ */}
      {showApproveModal && (
        <div className="fixed inset-0 z-[101] flex items-end justify-center sm:items-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setShowApproveModal(null); }}>
          <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl shadow-black/60">
            <div className="h-0.5 w-full bg-gradient-to-r from-emerald-500 to-cyan-400" />
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-base font-bold text-white">Approve Ban Proposal</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Your approval brings this ban closer to execution.</p>
                </div>
                <button type="button" onClick={() => setShowApproveModal(null)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/8 hover:text-white transition">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              {(() => {
                const pb = pendingBans.find(p => p.id === showApproveModal);
                if (!pb) return null;
                const isOwner = stats?.viewer?.isOwner;
                const willExecute = isOwner || (pb.approvals?.length || 0) >= 1;
                return (
                  <>
                    <div className="mb-4 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3">
                      <div className="text-xs text-amber-400 font-bold mb-1">Target</div>
                      <div className="text-sm text-white font-mono">{pb.target_discord_id}</div>
                      <div className="text-xs text-slate-400 mt-1">{pb.reason}</div>
                    </div>

                    <div className="mb-4">
                      <label className="mb-1.5 block text-xs font-semibold text-slate-400 uppercase tracking-widest">Approval Note (Optional)</label>
                      <textarea
                        className="w-full rounded-xl border border-white/8 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-400/30 resize-none transition"
                        rows={2}
                        value={approveNote}
                        onChange={(e) => setApproveNote(e.target.value)}
                        placeholder="Add a note about your approval decision..."
                        maxLength={200}
                      />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button type="button" onClick={() => setShowApproveModal(null)} className="flex-1 rounded-xl border border-white/8 bg-white/4 py-2.5 text-sm font-semibold text-slate-400 hover:bg-white/8 transition">Cancel</button>
                      <button
                        type="button"
                        disabled={pendingBanActionLoading === showApproveModal + "approve"}
                        onClick={() => handleApproveBan(showApproveModal, "approve")}
                        className={`flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50 ${
                          willExecute
                            ? "bg-gradient-to-r from-rose-600 to-red-700 shadow-rose-500/15"
                            : "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/15"
                        } shadow-lg`}
                      >
                        {pendingBanActionLoading === showApproveModal + "approve" ? "Processing..." : willExecute ? "🔨 Execute Ban" : "✓ Approve"}
                      </button>
                    </div>

                    {willExecute && (
                      <div className="mt-3 text-xs text-rose-300 text-center">
                        ⚠️ This will immediately ban the user from Discord
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom nav — horizontally scrollable */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/8 bg-slate-950/98 backdrop-blur-xl md:hidden">
        {/* Swipe hint pill — disappears after first scroll */}
        {!navScrolled && (
          <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1 rounded-full border border-white/10 bg-slate-900/95 px-2.5 py-1 text-[10px] font-semibold text-slate-400 shadow-lg backdrop-blur animate-pulse">
            swipe ›
          </div>
        )}
        {/* Right-edge fade — always visible until scrolled to end */}
        {!navScrolled && (
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 z-10 bg-gradient-to-l from-slate-950 to-transparent" />
        )}
        <div
          ref={navScrollRef}
          className="flex overflow-x-auto scrollbar-none px-2 py-2 gap-1.5"
          style={{ WebkitOverflowScrolling: "touch" }}
          onScroll={() => { if (!navScrolled) setNavScrolled(true); }}
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                data-tabid={tab.id}
                type="button"
                onClick={() => switchTab(tab.id)}
                className={`relative flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all duration-150 active:scale-95 ${
                  active
                    ? "bg-cyan-500/15 text-cyan-300 border border-cyan-400/30 shadow-[0_0_10px_rgba(34,211,238,0.15)]"
                    : "text-slate-500 border border-transparent hover:bg-white/5 hover:text-slate-300"
                }`}
              >
                <span className={`text-base leading-none ${active ? "scale-110" : ""} transition-transform duration-150`}>{tab.icon}</span>
                <span className="whitespace-nowrap">{tab.label}</span>
                {"badge" in tab && tab.badge > 0 && (
                  <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-amber-400 px-1 text-[9px] font-black text-slate-950">{tab.badge}</span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
