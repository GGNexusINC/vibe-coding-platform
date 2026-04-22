"use client";

import { useCallback, useEffect, useState } from "react";

interface RaidParticipant {
  id: string;
  discord_id: string;
  username: string;
  avatar_url: string | null;
  role: string;
  status: string;
}

interface Raid {
  id: string;
  target_location: string;
  raid_type: string;
  enemy_count: number | null;
  description: string | null;
  status: string;
  team_size: number;
  created_by: string;
  creator_username: string;
  creator_avatar_url: string | null;
  created_at: string;
  expires_at: string;
  raid_participants: RaidParticipant[];
}

interface RaidRole {
  id: string;
  label: string;
  emoji: string;
  description: string;
  color: string;
}

interface HiveMember {
  discord_id: string;
  username: string;
  avatar_url: string | null;
  role: string;
  joined_at: string;
}

interface HiveRecord {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  owner_username: string;
  map_label: string;
  map_x: number;
  map_y: number;
  level: number;
  xp: number;
  next_reward_xp: number;
  status: string;
  members: HiveMember[];
  activity_log: { id: string; actor_id?: string; actor_username: string; action: string; xp: number; created_at: string }[];
  created_at: string;
  updated_at: string;
}

type RaidKind = "normal" | "counter" | "defense";

type HiveRaidCommand = {
  raidType: RaidKind;
  targetLocation: string;
  enemyCount: string;
  priority: string;
  rallyPoint: string;
  comms: string;
  supplies: string;
  description: string;
  teamSize: string;
  myRole: string;
};

interface RaidDashboardProps {
  user: any;
}

const RAIDZONE_MAP_URL = "https://oncehuman.th.gl/maps/Once%20Human%3A%20RaidZone";

const raidTypeLabels: Record<string, { label: string; icon: string; color: string; copy: string }> = {
  normal: { label: "Raid", icon: "RAID", color: "text-amber-300", copy: "Push an enemy target." },
  counter: { label: "Counter Raid", icon: "COUNTER", color: "text-sky-300", copy: "Respond to pressure fast." },
  defense: { label: "Hive Defense", icon: "DEFEND", color: "text-red-300", copy: "Defend your hive or help an ally." },
};

const fallbackRoles: RaidRole[] = [
  { id: "leader", label: "Raid Leader", emoji: "Lead", description: "Coordinates the team.", color: "#fbbf24" },
  { id: "pvp", label: "PvP Fighter", emoji: "PvP", description: "Frontline combat.", color: "#dc2626" },
  { id: "builder", label: "Builder", emoji: "Build", description: "Repairs and defenses.", color: "#3b82f6" },
  { id: "miner", label: "Miner", emoji: "Mine", description: "Breaks structures and gathers.", color: "#ef4444" },
  { id: "scout", label: "Scout", emoji: "Scout", description: "Spots enemies and routes.", color: "#22c55e" },
  { id: "medic", label: "Medic", emoji: "Heal", description: "Keeps the team alive.", color: "#ec4899" },
  { id: "driver", label: "Driver/Pilot", emoji: "Drive", description: "Handles vehicles.", color: "#f59e0b" },
  { id: "member", label: "Team Member", emoji: "Team", description: "General support.", color: "#64748b" },
];

export function RaidDashboard({ user }: RaidDashboardProps) {
  const [raids, setRaids] = useState<Raid[]>([]);
  const [roles, setRoles] = useState<RaidRole[]>(fallbackRoles);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createMode, setCreateMode] = useState<"normal" | "counter" | "defense">("normal");
  const [selectedRaid, setSelectedRaid] = useState<Raid | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [hives, setHives] = useState<HiveRecord[]>([]);
  const [hivesLoading, setHivesLoading] = useState(true);
  const [showHiveModal, setShowHiveModal] = useState(false);
  const [pendingHiveAction, setPendingHiveAction] = useState<string | null>(null);
  const [hiveRaidDraft, setHiveRaidDraft] = useState<{ hive: HiveRecord; raidType: RaidKind } | null>(null);

  const fetchRaids = useCallback(async () => {
    try {
      const res = await fetch("/api/raids", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to load raids");
      setRaids(data.raids || []);
      setRoles((data.roles?.length ? data.roles : fallbackRoles) || fallbackRoles);
      setSelectedRaid((current) => current ? (data.raids || []).find((raid: Raid) => raid.id === current.id) || current : null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to load raids");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRaids();
    const interval = window.setInterval(() => void fetchRaids(), 10000);
    return () => window.clearInterval(interval);
  }, [fetchRaids]);

  const fetchHives = useCallback(async () => {
    try {
      const res = await fetch("/api/hives", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to load hives");
      setHives(data.hives || []);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to load hives");
    } finally {
      setHivesLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchHives();
  }, [fetchHives]);

  const isInRaid = (raid: Raid) =>
    raid.raid_participants.some((participant) =>
      participant.discord_id === user?.discord_id &&
      (participant.status === "joined" || participant.status === "confirmed")
    );

  const getRoleLabel = (roleId: string) => {
    const role = roles.find((item) => item.id === roleId);
    return role ? `${role.emoji} ${role.label}` : roleId;
  };

  const getMyRole = (raid: Raid) => {
    const me = raid.raid_participants.find((participant) => participant.discord_id === user?.discord_id);
    return me?.role || "member";
  };

  const openCreate = (mode: "normal" | "counter" | "defense") => {
    setActionError(null);
    setCreateMode(mode);
    setShowCreateModal(true);
  };

  const joinRaid = async (raid: Raid, role = "member") => {
    setActionError(null);
    const res = await fetch(`/api/raids/${raid.id}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed to join raid");
    await fetchRaids();
  };

  const updateHiveActivity = async (hiveId: string, action: string) => {
    setActionError(null);
    setPendingHiveAction(`${hiveId}:${action}`);
    try {
      const res = await fetch(`/api/hives/${hiveId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed to update hive");
      setHives((current) => current.map((hive) => hive.id === hiveId ? data.hive : hive).sort((a, b) => b.level - a.level || b.xp - a.xp));
      return data;
    } finally {
      setPendingHiveAction(null);
    }
  };

  const createRaidFromHive = async (hive: HiveRecord, command: HiveRaidCommand) => {
    setActionError(null);
    const raidType = command.raidType;
    const label = raidType === "defense" ? `${hive.name} Defense` : raidType === "counter" ? `${hive.name} Counter Raid` : `${hive.name} Raid`;
    const description = [
      `Hive: ${hive.name}.`,
      `Priority: ${command.priority}.`,
      `Map pin: ${Math.round(hive.map_x)}, ${Math.round(hive.map_y)}.`,
      command.rallyPoint ? `Rally point: ${command.rallyPoint}.` : "",
      command.comms ? `Comms: ${command.comms}.` : "",
      command.supplies ? `Bring: ${command.supplies}.` : "",
      command.description,
    ].filter(Boolean).join(" ");
    const res = await fetch("/api/raids", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetLocation: command.targetLocation.trim() || `${label} - ${hive.map_label}`,
        raidType,
        enemyCount: command.enemyCount ? parseInt(command.enemyCount) : undefined,
        description,
        teamSize: Math.max(2, parseInt(command.teamSize) || Math.max(4, hive.members.length || 4)),
        myRole: command.myRole || "leader",
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed to create alert");
    if (data.raid) setRaids((current) => [data.raid, ...current.filter((raid) => raid.id !== data.raid.id)]);
    try {
      await updateHiveActivity(hive.id, raidType === "defense" ? "defense" : "raid");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Command launched, but hive XP is cooling down.");
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <HiveCommandCenter
        hives={hives}
        loading={hivesLoading}
        user={user}
        onCreateHive={() => setShowHiveModal(true)}
        onActivity={(hiveId, action) => updateHiveActivity(hiveId, action).catch((err) => setActionError(err instanceof Error ? err.message : "Hive action failed"))}
        onCreateRaid={(hive, raidType) => setHiveRaidDraft({ hive, raidType })}
        pendingHiveAction={pendingHiveAction}
      />

      <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-4 shadow-2xl shadow-black/20">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">Beta Operations</p>
            <h2 className="text-2xl font-black text-white">Raid Switch</h2>
            <p className="text-sm text-slate-400">Create raid, counter-raid, and hive-defense teams that survive refreshes.</p>
          </div>
          <button
            onClick={() => void fetchRaids()}
            className="rounded-xl border border-white/10 bg-slate-950 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800"
          >
            Refresh
          </button>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {Object.entries(raidTypeLabels).map(([id, info]) => (
            <button
              key={id}
              type="button"
              onClick={() => openCreate(id as "normal" | "counter" | "defense")}
              className="rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-left transition hover:-translate-y-0.5 hover:border-amber-400/40 hover:bg-slate-900"
            >
              <span className={`block text-[10px] font-black uppercase tracking-[0.22em] ${info.color}`}>{info.icon}</span>
              <span className="mt-1 block text-base font-black text-white">{info.label}</span>
              <span className="mt-1 block text-xs text-slate-500">{info.copy}</span>
            </button>
          ))}
        </div>
      </div>

      {actionError && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
          {actionError}
        </div>
      )}

      {raids.length === 0 ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-xs font-black tracking-widest text-cyan-200">CLEAR</div>
          <h3 className="text-lg font-bold text-white">No Active Teams</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">Create a raid or hive defense team above. Members will see a clear Join button and role picker.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {raids.map((raid) => {
            const inRaid = isInRaid(raid);
            const participantCount = raid.raid_participants.filter((participant) => participant.status === "joined" || participant.status === "confirmed").length;
            const typeInfo = raidTypeLabels[raid.raid_type] || raidTypeLabels.normal;

            return (
              <article key={raid.id} className={`rounded-3xl border p-4 ${inRaid ? "border-amber-400/40 bg-amber-500/10" : "border-slate-800 bg-slate-900/60"}`}>
                <button type="button" onClick={() => setSelectedRaid(raid)} className="block w-full text-left">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-slate-950 text-[10px] font-black tracking-widest text-slate-200">{typeInfo.icon}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-xs font-black uppercase ${typeInfo.color}`}>{typeInfo.label}</span>
                        <span className="text-xs text-slate-500">{new Date(raid.created_at).toLocaleTimeString()}</span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-300">{raid.status}</span>
                        {inRaid && <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-200">Joined</span>}
                      </div>
                      <h3 className="mt-1 break-words text-lg font-black text-white">{raid.target_location}</h3>
                      {raid.description && <p className="mt-1 line-clamp-2 text-sm text-slate-400">{raid.description}</p>}
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                        <span className="rounded-lg bg-slate-950 px-2.5 py-1 text-slate-300">{participantCount}/{raid.team_size} members</span>
                        {raid.enemy_count ? <span className="rounded-lg bg-red-500/10 px-2.5 py-1 text-red-200">{raid.enemy_count} enemies</span> : null}
                        <span className="rounded-lg bg-slate-950 px-2.5 py-1 text-slate-400">Leader: {raid.creator_username}</span>
                      </div>
                    </div>
                  </div>
                </button>

                <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="flex flex-wrap gap-2">
                    {raid.raid_participants.slice(0, 6).map((participant) => (
                      <span key={participant.id} className="rounded-full border border-white/10 bg-slate-950 px-2.5 py-1 text-xs text-slate-300">
                        {participant.username} · {getRoleLabel(participant.role)}
                      </span>
                    ))}
                  </div>
                  {inRaid ? (
                    <button type="button" onClick={() => setSelectedRaid(raid)} className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-bold text-amber-200">
                      Manage My Role
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => joinRaid(raid).catch((err) => setActionError(err instanceof Error ? err.message : "Failed to join raid"))}
                      className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-black text-white"
                    >
                      Join Team
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {showCreateModal && (
        <CreateRaidModal
          roles={roles}
          initialRaidType={createMode}
          onClose={() => setShowCreateModal(false)}
          onCreated={(createdRaid) => {
            setShowCreateModal(false);
            if (createdRaid) setRaids((current) => [createdRaid, ...current.filter((raid) => raid.id !== createdRaid.id)]);
            window.setTimeout(() => void fetchRaids(), 350);
          }}
        />
      )}

      {showHiveModal && (
        <CreateHiveModal
          onClose={() => setShowHiveModal(false)}
          onCreated={(hive) => {
            setShowHiveModal(false);
            setHives((current) => [hive, ...current.filter((item) => item.id !== hive.id)]);
          }}
        />
      )}

      {hiveRaidDraft && (
        <HiveRaidCommandModal
          hive={hiveRaidDraft.hive}
          roles={roles}
          initialRaidType={hiveRaidDraft.raidType}
          onClose={() => setHiveRaidDraft(null)}
          onCreated={(createdRaid) => {
            setHiveRaidDraft(null);
            if (createdRaid) setRaids((current) => [createdRaid, ...current.filter((raid) => raid.id !== createdRaid.id)]);
            window.setTimeout(() => void fetchRaids(), 350);
          }}
          onSubmit={(hive, command) => createRaidFromHive(hive, command)}
        />
      )}

      {selectedRaid && (
        <RaidDetailModal
          raid={selectedRaid}
          roles={roles}
          user={user}
          isInRaid={isInRaid(selectedRaid)}
          myRole={getMyRole(selectedRaid)}
          getRoleLabel={getRoleLabel}
          onClose={() => setSelectedRaid(null)}
          onUpdate={() => void fetchRaids()}
        />
      )}
    </div>
  );
}

function HiveCommandCenter({ hives, loading, user, onCreateHive, onActivity, onCreateRaid, pendingHiveAction }: {
  hives: HiveRecord[];
  loading: boolean;
  user: any;
  onCreateHive: () => void;
  onActivity: (hiveId: string, action: string) => void;
  onCreateRaid: (hive: HiveRecord, raidType: RaidKind) => void;
  pendingHiveAction: string | null;
}) {
  const myHives = hives.filter((hive) => hive.members.some((member) => member.discord_id === user?.discord_id));
  const featuredHive = myHives[0] || hives[0] || null;

  return (
    <section className="overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-4 shadow-2xl shadow-cyan-950/20 sm:p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">Once Human Hive Command</p>
          <h2 className="text-3xl font-black text-white">Build your hive, mark the map, earn rewards.</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Hives gain XP when members stay active, defend, support allies, and launch raid alerts. Higher level hives unlock free store pack rewards.
          </p>
        </div>
        <button type="button" onClick={onCreateHive} className="rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-cyan-500/20">
          Create Hive
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-sm text-slate-400">Loading hives...</div>
      ) : hives.length === 0 ? (
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-6 text-center">
          <h3 className="text-xl font-black text-white">No hives yet</h3>
          <p className="mt-2 text-sm text-slate-400">Create the first NewHopeGGN hive and pin your territory on the map.</p>
          <button type="button" onClick={onCreateHive} className="mt-4 rounded-xl bg-cyan-500 px-5 py-2 text-sm font-black text-white">Create First Hive</button>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-3 sm:p-4">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-300">RaidZone Hive Map</h3>
                <p className="mt-1 text-xs text-slate-500">Use the Once Human RaidZone map for exact callouts, then pin your hive here for NewHope coordination.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-[10px] font-black text-cyan-200">{hives.length} pins</span>
                <a href={RAIDZONE_MAP_URL} target="_blank" rel="noreferrer" className="rounded-full border border-cyan-300/40 bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100 hover:bg-cyan-300/20">
                  Open RaidZone
                </a>
              </div>
            </div>
            <HiveMap hives={hives} />
          </div>

          <div className="space-y-3">
            <div className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-4">
              <h3 className="text-sm font-black uppercase tracking-[0.18em] text-amber-200">Hive Leaderboard</h3>
              <div className="mt-3 space-y-2">
                {hives.slice(0, 5).map((hive, index) => (
                  <div key={hive.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl bg-slate-950/70 p-3">
                    <span className="text-sm font-black text-amber-200">#{index + 1}</span>
                    <div className="min-w-0">
                      <p className="break-words text-sm font-black text-white">{hive.name}</p>
                      <p className="text-xs text-slate-500">{hive.members.length} members · {hive.map_label}</p>
                    </div>
                    <span className="rounded-xl bg-amber-400/10 px-2 py-1 text-xs font-black text-amber-200">Lv {hive.level}</span>
                  </div>
                ))}
              </div>
            </div>

            {featuredHive && (
              <HiveActionCard hive={featuredHive} user={user} isMine={myHives.some((hive) => hive.id === featuredHive.id)} onActivity={onActivity} onCreateRaid={onCreateRaid} pendingHiveAction={pendingHiveAction} />
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function HiveMap({ hives, draft, onPick }: { hives: HiveRecord[]; draft?: { x: number; y: number }; onPick?: (x: number, y: number) => void }) {
  return (
    <div
      role={onPick ? "button" : undefined}
      tabIndex={onPick ? 0 : undefined}
      onClick={(event) => {
        if (!onPick) return;
        const rect = event.currentTarget.getBoundingClientRect();
        onPick(((event.clientX - rect.left) / rect.width) * 100, ((event.clientY - rect.top) / rect.height) * 100);
      }}
      className="relative aspect-square min-h-[260px] overflow-hidden rounded-2xl border border-cyan-400/20 bg-slate-950 bg-contain bg-center bg-no-repeat shadow-inner shadow-cyan-950/40"
      style={{ backgroundImage: "url('/once-human-raidzone-full-map.jpg')" }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_22%,rgba(34,211,238,0.1),transparent_22%),linear-gradient(135deg,rgba(2,6,23,0.14),rgba(15,23,42,0.34))]" />
      <div className="absolute inset-0 pointer-events-none opacity-10 [background-image:linear-gradient(rgba(255,255,255,.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.1)_1px,transparent_1px)] [background-size:8%_8%]" />
      <a href={RAIDZONE_MAP_URL} target="_blank" rel="noreferrer" className="absolute right-3 top-3 rounded-full border border-cyan-300/40 bg-slate-950/75 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100 shadow-2xl backdrop-blur hover:bg-cyan-300/20">
        Open live map
      </a>
      {hives.map((hive) => (
        <div key={hive.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${hive.map_x}%`, top: `${hive.map_y}%` }}>
          <div className="h-5 w-5 rounded-full border-2 border-white bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.9)]" />
          <div className="mt-1 max-w-[9rem] rounded-lg border border-cyan-300/25 bg-slate-950/95 px-2 py-1 text-[10px] font-black text-white shadow-xl backdrop-blur">{hive.name}</div>
        </div>
      ))}
      {draft && (
        <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${draft.x}%`, top: `${draft.y}%` }}>
          <div className="h-5 w-5 animate-pulse rounded-full border-2 border-white bg-amber-400 shadow-[0_0_22px_rgba(251,191,36,0.9)]" />
        </div>
      )}
      {onPick && <div className="absolute bottom-3 left-3 rounded-xl bg-slate-950/80 px-3 py-2 text-xs font-bold text-slate-300">Tap the map to set your hive location</div>}
    </div>
  );
}

function HiveActionCard({ hive, user, isMine, onActivity, onCreateRaid, pendingHiveAction }: {
  hive: HiveRecord;
  user: any;
  isMine: boolean;
  onActivity: (hiveId: string, action: string) => void;
  onCreateRaid: (hive: HiveRecord, raidType: RaidKind) => void;
  pendingHiveAction: string | null;
}) {
  const progress = Math.min(100, Math.round((hive.xp / Math.max(1, hive.next_reward_xp)) * 100));
  const myCheckin = hive.activity_log.find((log) => log.actor_id === user?.discord_id && log.action === "daily activity check-in");
  const checkinAvailableAt = myCheckin ? new Date(new Date(myCheckin.created_at).getTime() + 20 * 60 * 60 * 1000) : null;
  const checkinLocked = !!checkinAvailableAt && checkinAvailableAt.getTime() > Date.now();
  const checkinPending = pendingHiveAction === `${hive.id}:checkin`;
  const checkinLabel = checkinPending
    ? "Recording activity..."
    : checkinLocked
      ? `Active marked until ${checkinAvailableAt?.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
      : "Mark Active +15 XP";
  return (
    <div className="rounded-3xl border border-cyan-400/20 bg-slate-950/80 p-4 shadow-2xl shadow-cyan-950/20">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">{isMine ? "Your Hive" : "Featured Hive"}</p>
          <h3 className="break-words text-xl font-black text-white">{hive.name}</h3>
          <p className="text-xs text-slate-500">Owner: {hive.owner_username}</p>
        </div>
        <span className="rounded-2xl bg-cyan-400/10 px-3 py-2 text-sm font-black text-cyan-100">Lv {hive.level}</span>
      </div>
      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs font-bold text-slate-400">
          <span>Hive XP</span>
          <span>{hive.xp}/{hive.next_reward_xp}</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-xs text-amber-200">Next reward: free beta store pack at full bar.</p>
      </div>
      <div className="mt-4 grid gap-2">
        <button
          type="button"
          onClick={() => onActivity(hive.id, "checkin")}
          disabled={checkinLocked || checkinPending}
          className="rounded-xl border border-emerald-300/20 bg-emerald-500/20 px-3 py-3 text-sm font-black text-emerald-200 shadow-lg shadow-emerald-950/20 transition hover:-translate-y-0.5 hover:bg-emerald-400/25 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55"
        >
          {checkinLabel}
        </button>
        <button type="button" onClick={() => onCreateRaid(hive, "defense")} className="rounded-xl border border-red-300/20 bg-red-500/20 px-3 py-3 text-sm font-black text-red-200 shadow-lg shadow-red-950/20 transition hover:-translate-y-0.5 hover:bg-red-400/25">Open Defense Console</button>
        <button type="button" onClick={() => onCreateRaid(hive, "normal")} className="rounded-xl border border-amber-300/20 bg-amber-500/20 px-3 py-3 text-sm font-black text-amber-200 shadow-lg shadow-amber-950/20 transition hover:-translate-y-0.5 hover:bg-amber-400/25">Open Raid Console</button>
      </div>
      <p className="mt-3 text-[11px] font-bold text-slate-500">Activity XP is protected by server cooldowns, so refresh-spam will not farm hive levels.</p>
    </div>
  );
}

function HiveRaidCommandModal({ hive, roles, initialRaidType, onClose, onCreated, onSubmit }: {
  hive: HiveRecord;
  roles: RaidRole[];
  initialRaidType: RaidKind;
  onClose: () => void;
  onCreated: (raid?: Raid) => void;
  onSubmit: (hive: HiveRecord, command: HiveRaidCommand) => Promise<void>;
}) {
  const [form, setForm] = useState<HiveRaidCommand>({
    raidType: initialRaidType,
    targetLocation: initialRaidType === "defense" ? `${hive.name} Defense - ${hive.map_label}` : `${hive.name} Raid - ${hive.map_label}`,
    enemyCount: "",
    priority: initialRaidType === "defense" ? "Critical defense" : "Standard raid",
    rallyPoint: hive.map_label,
    comms: "Discord voice",
    supplies: initialRaidType === "defense" ? "Turrets, repair mats, ammo, adrenaline" : "Ammo, explosives, heals, food buffs",
    description: initialRaidType === "defense" ? "Need defenders to reinforce the hive and hold territory." : "Raid command needs a squad ready to move together.",
    teamSize: String(Math.max(4, hive.members.length || 4)),
    myRole: "leader",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSubmit(hive, form);
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to launch hive command");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 p-3 backdrop-blur-sm">
      <div className="mx-auto my-4 w-full max-w-3xl overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-slate-950 shadow-2xl shadow-cyan-950/40">
        <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.22),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98))] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">Hive Operations Console</p>
              <h3 className="mt-1 text-2xl font-black text-white">{initialRaidType === "defense" ? "Launch Hive Defense" : "Launch Raid Alert"}</h3>
              <p className="mt-1 text-sm text-slate-400">Build a clean command post with target, rally, comms, supplies, and squad size before alerting members.</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-xl border border-white/10 px-3 py-1 text-sm text-slate-300 hover:bg-white/10">Close</button>
          </div>
        </div>

        <form onSubmit={submit} className="grid gap-4 p-4 lg:grid-cols-[0.9fr_1.1fr] sm:p-5">
          <div className="space-y-3">
            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">Selected Hive</p>
              <h4 className="mt-1 break-words text-xl font-black text-white">{hive.name}</h4>
              <p className="mt-1 text-xs text-slate-400">{hive.members.length} members · {hive.map_label} · Lv {hive.level}</p>
            </div>

            <label className="block">
              <span className="mb-1 block text-sm font-bold text-slate-300">Command Type</span>
              <select value={form.raidType} onChange={(event) => setForm({ ...form, raidType: event.target.value as RaidKind })} className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white">
                <option value="defense">Hive/base defense</option>
                <option value="normal">Enemy raid</option>
                <option value="counter">Counter raid</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-bold text-slate-300">Priority</span>
              <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white">
                <option>Critical defense</option>
                <option>High priority</option>
                <option>Standard raid</option>
                <option>Scout first</option>
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-bold text-slate-300">Team Size</span>
                <select value={form.teamSize} onChange={(event) => setForm({ ...form, teamSize: event.target.value })} className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white">
                  {[2, 3, 4, 5, 6, 8, 10, 12].map((size) => <option key={size} value={size}>{size} members</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-bold text-slate-300">Enemy Count</span>
                <input type="number" min="0" value={form.enemyCount} onChange={(event) => setForm({ ...form, enemyCount: event.target.value })} placeholder="Optional" className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm text-white placeholder:text-slate-600" />
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-bold text-slate-300">Target / Alert Title</span>
              <input value={form.targetLocation} onChange={(event) => setForm({ ...form, targetLocation: event.target.value })} required className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40" />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-bold text-slate-300">Rally Point</span>
                <input value={form.rallyPoint} onChange={(event) => setForm({ ...form, rallyPoint: event.target.value })} placeholder="Where should members meet?" className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm text-white placeholder:text-slate-600" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-bold text-slate-300">Comms</span>
                <input value={form.comms} onChange={(event) => setForm({ ...form, comms: event.target.value })} placeholder="Discord voice, squad chat..." className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm text-white placeholder:text-slate-600" />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-sm font-bold text-slate-300">Loadout / Supplies</span>
              <input value={form.supplies} onChange={(event) => setForm({ ...form, supplies: event.target.value })} placeholder="Ammo, repairs, turrets, explosives..." className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm text-white placeholder:text-slate-600" />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-bold text-slate-300">Your Role</span>
              <select value={form.myRole} onChange={(event) => setForm({ ...form, myRole: event.target.value })} className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white">
                {roles.map((role) => <option key={role.id} value={role.id}>{role.emoji} {role.label}</option>)}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-bold text-slate-300">Intel Notes</span>
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={4} placeholder="Enemy names, route, timing, what to bring..." className="w-full resize-none rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600" />
            </label>

            {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">{error}</div>}

            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={onClose} className="h-11 rounded-xl border border-slate-700 text-sm font-bold text-slate-300 hover:bg-white/5">Cancel</button>
              <button type="submit" disabled={loading || !form.targetLocation.trim()} className="h-11 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 text-sm font-black text-white shadow-lg shadow-cyan-500/20 disabled:opacity-50">
                {loading ? "Launching..." : "Launch Command"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateHiveModal({ onClose, onCreated }: { onClose: () => void; onCreated: (hive: HiveRecord) => void }) {
  const [form, setForm] = useState({ name: "", description: "", mapLabel: "Chalk Peak", mapX: 50, mapY: 50 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/hives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed to create hive");
      onCreated(data.hive);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create hive");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-3 backdrop-blur-sm">
      <div className="mx-auto my-4 w-full max-w-3xl rounded-3xl border border-cyan-400/20 bg-slate-950 p-4 shadow-2xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-300">Once Human</p>
            <h3 className="text-2xl font-black text-white">Create Hive</h3>
            <p className="text-sm text-slate-400">Pin your territory so members know where to defend, raid, and support.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-white/10 px-3 py-1 text-sm text-slate-300">Close</button>
        </div>
        <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-bold text-slate-300">Hive Name</span>
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required placeholder="e.g. NewHope North Hive" className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm text-white outline-none placeholder:text-slate-600" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-bold text-slate-300">Map Label</span>
              <input value={form.mapLabel} onChange={(event) => setForm({ ...form, mapLabel: event.target.value })} placeholder="Region or nearest landmark" className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm text-white outline-none placeholder:text-slate-600" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-bold text-slate-300">Description</span>
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={4} placeholder="What this hive needs, defense notes, rally instructions..." className="w-full resize-none rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600" />
            </label>
            {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">{error}</div>}
            <button type="submit" disabled={loading || !form.name.trim()} className="h-11 w-full rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 text-sm font-black text-white disabled:opacity-50">
              {loading ? "Creating..." : "Create Hive"}
            </button>
          </div>
          <HiveMap hives={[]} draft={{ x: form.mapX, y: form.mapY }} onPick={(x, y) => setForm({ ...form, mapX: x, mapY: y })} />
        </form>
      </div>
    </div>
  );
}

function CreateRaidModal({ roles, initialRaidType, onClose, onCreated }: {
  roles: RaidRole[];
  initialRaidType: "normal" | "counter" | "defense";
  onClose: () => void;
  onCreated: (raid?: Raid) => void;
}) {
  const [form, setForm] = useState({
    targetLocation: initialRaidType === "defense" ? "My Hive / Base Defense" : "",
    raidType: initialRaidType,
    enemyCount: "",
    description: initialRaidType === "defense" ? "Need help defending or reinforcing a hive." : "",
    teamSize: "4",
    myRole: "leader",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/raids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetLocation: form.targetLocation,
          raidType: form.raidType,
          enemyCount: form.enemyCount ? parseInt(form.enemyCount) : undefined,
          description: form.description,
          teamSize: parseInt(form.teamSize),
          myRole: form.myRole,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed to create raid");
      onCreated(data.raid);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create raid");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-3 backdrop-blur-sm">
      <div className="mx-auto my-4 w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-950 p-4 shadow-2xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-300">Team Alert</p>
            <h3 className="text-xl font-black text-white">Create Raid Team</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-white/10 px-3 py-1 text-sm text-slate-300">Close</button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <QuickModeButton label="Defend my hive" onClick={() => setForm({ ...form, raidType: "defense", targetLocation: "My Hive / Base Defense", description: "Need help defending or reinforcing my hive." })} />
            <QuickModeButton label="Join ally hive" onClick={() => setForm({ ...form, raidType: "defense", targetLocation: "Ally Hive Assist", description: "Helping another member defend their hive." })} />
            <QuickModeButton label="Enemy raid" onClick={() => setForm({ ...form, raidType: "normal", targetLocation: "Enemy Base Raid", description: "" })} />
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-bold text-slate-300">Target / Hive</span>
            <input
              value={form.targetLocation}
              onChange={(e) => setForm({ ...form, targetLocation: e.target.value })}
              placeholder="My hive, ally hive, enemy base, sector..."
              required
              className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-bold text-slate-300">Type</span>
              <select value={form.raidType} onChange={(e) => setForm({ ...form, raidType: e.target.value as "normal" | "counter" | "defense" })} className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white">
                <option value="normal">Raid enemy target</option>
                <option value="counter">Counter raid response</option>
                <option value="defense">Hive/base defense</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-bold text-slate-300">Enemy Count</span>
              <input type="number" value={form.enemyCount} onChange={(e) => setForm({ ...form, enemyCount: e.target.value })} placeholder="Optional" className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm text-white placeholder:text-slate-600" />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-bold text-slate-300">Your Role</span>
            <select value={form.myRole} onChange={(e) => setForm({ ...form, myRole: e.target.value })} className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white">
              {roles.map((role) => <option key={role.id} value={role.id}>{role.emoji} {role.label}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-bold text-slate-300">Team Size</span>
            <select value={form.teamSize} onChange={(e) => setForm({ ...form, teamSize: e.target.value })} className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white">
              {[2, 3, 4, 5, 6, 8, 10, 12].map((size) => <option key={size} value={size}>{size} members</option>)}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-bold text-slate-300">Details</span>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Extra intel, where to meet, what to bring..." className="w-full resize-none rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600" />
          </label>

          {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">{error}</div>}

          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={onClose} className="h-11 rounded-xl border border-slate-700 text-sm font-bold text-slate-300">Cancel</button>
            <button type="submit" disabled={loading || !form.targetLocation.trim()} className="h-11 rounded-xl bg-gradient-to-r from-red-500 to-orange-600 text-sm font-black text-white disabled:opacity-50">
              {loading ? "Creating..." : "Create Team"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function QuickModeButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs font-black text-cyan-100">
      {label}
    </button>
  );
}

function RaidDetailModal({ raid, roles, user, isInRaid, myRole, getRoleLabel, onClose, onUpdate }: {
  raid: Raid;
  roles: RaidRole[];
  user: any;
  isInRaid: boolean;
  myRole: string;
  getRoleLabel: (roleId: string) => string;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [selectedRole, setSelectedRole] = useState(myRole || "member");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isCreator = raid.created_by === user?.discord_id;
  const activeParticipants = raid.raid_participants.filter((participant) => participant.status === "joined" || participant.status === "confirmed");

  const callAction = async (name: string, run: () => Promise<Response>) => {
    setLoading(name);
    setError(null);
    try {
      const res = await run();
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Action failed");
      onUpdate();
      if (name === "leave") onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-3 backdrop-blur-sm">
      <div className="mx-auto my-4 w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-950 p-4 shadow-2xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-300">{raid.raid_type}</p>
            <h3 className="break-words text-2xl font-black text-white">{raid.target_location}</h3>
            {raid.description && <p className="mt-2 text-sm text-slate-400">{raid.description}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-white/10 px-3 py-1 text-sm text-slate-300">Close</button>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <InfoTile label="Members" value={`${activeParticipants.length}/${raid.team_size}`} />
          <InfoTile label="Enemies" value={raid.enemy_count ? String(raid.enemy_count) : "Unknown"} />
          <InfoTile label="Status" value={raid.status} />
        </div>

        <div className="mb-5 space-y-2">
          <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Team Members</h4>
          {activeParticipants.map((participant) => {
            const isMe = participant.discord_id === user?.discord_id;
            return (
              <div key={participant.id} className={`grid gap-3 rounded-2xl border p-3 sm:grid-cols-[1fr_auto] sm:items-center ${isMe ? "border-amber-400/30 bg-amber-400/10" : "border-slate-800 bg-slate-900/60"}`}>
                <div className="min-w-0">
                  <p className="break-words text-sm font-black text-white">{participant.username} {isMe ? <span className="text-amber-300">(You)</span> : null}</p>
                  <p className="text-xs text-slate-500">{getRoleLabel(participant.role)}</p>
                </div>
                {(isMe || isCreator) && (
                  <select
                    value={participant.role}
                    onChange={(event) => void callAction("role", () => fetch(`/api/raids/${raid.id}/role`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ role: event.target.value, targetDiscordId: participant.discord_id !== user?.discord_id ? participant.discord_id : undefined }),
                    }))}
                    className="h-10 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white"
                  >
                    {roles.map((role) => <option key={role.id} value={role.id}>{role.emoji} {role.label}</option>)}
                  </select>
                )}
              </div>
            );
          })}
        </div>

        {!isInRaid && (
          <div className="mb-5 grid gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 sm:grid-cols-[1fr_auto]">
            <select value={selectedRole} onChange={(event) => setSelectedRole(event.target.value)} className="h-11 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white">
              {roles.map((role) => <option key={role.id} value={role.id}>{role.emoji} Join as {role.label}</option>)}
            </select>
            <button type="button" onClick={() => void callAction("join", () => fetch(`/api/raids/${raid.id}/join`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: selectedRole }) }))} className="h-11 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 text-sm font-black text-white">
              {loading === "join" ? "Joining..." : "Join Team"}
            </button>
          </div>
        )}

        {error && <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">{error}</div>}

        <div className="grid gap-2 border-t border-slate-800 pt-4 sm:grid-cols-4">
          {isInRaid && <button type="button" onClick={() => void callAction("leave", () => fetch(`/api/raids/${raid.id}/leave`, { method: "POST" }))} className="h-11 rounded-xl border border-red-500/30 bg-red-500/10 text-sm font-bold text-red-200">{loading === "leave" ? "Leaving..." : "Leave"}</button>}
          {isCreator && (
            <>
              <button type="button" onClick={() => void callAction("active", () => fetch(`/api/raids/${raid.id}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "active" }) }))} className="h-11 rounded-xl bg-emerald-500/20 text-sm font-bold text-emerald-200">Start</button>
              <button type="button" onClick={() => void callAction("completed", () => fetch(`/api/raids/${raid.id}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "completed" }) }))} className="h-11 rounded-xl bg-blue-500/20 text-sm font-bold text-blue-200">Complete</button>
              <button type="button" onClick={() => void callAction("cancelled", () => fetch(`/api/raids/${raid.id}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "cancelled" }) }))} className="h-11 rounded-xl bg-slate-800 text-sm font-bold text-slate-300">Cancel</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-center">
      <div className="text-xl font-black text-white">{value}</div>
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</div>
    </div>
  );
}
