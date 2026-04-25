"use client";

import { useCallback, useEffect, useState } from "react";
import { InteractiveMap } from "./interactive-map";

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
      <div className="flex h-96 items-center justify-center">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-4 border-white/5" />
          <div className="absolute inset-0 rounded-full border-4 border-t-cyan-500 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <HiveCommandCenter
        hives={hives}
        loading={hivesLoading}
        user={user}
        onCreateHive={() => setShowHiveModal(true)}
        onActivity={(hiveId, action) => updateHiveActivity(hiveId, action).catch((err) => setActionError(err instanceof Error ? err.message : "Hive action failed"))}
        onCreateRaid={(hive, raidType) => setHiveRaidDraft({ hive, raidType })}
        pendingHiveAction={pendingHiveAction}
      />

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[2.5rem] border border-white/5 bg-slate-900/30 p-8 backdrop-blur-xl">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 mb-1">Beta Operations</p>
              <h2 className="text-3xl font-black text-white tracking-tight">Raid Switch</h2>
              <p className="text-sm font-medium text-slate-500">Create raid, counter-raid, and hive-defense teams.</p>
            </div>
            <button
              onClick={() => void fetchRaids()}
              className="h-11 rounded-2xl border border-white/10 bg-slate-950 px-6 text-sm font-bold text-white transition hover:bg-slate-900"
            >
              Refresh
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 mb-10">
            {Object.entries(raidTypeLabels).map(([id, info]) => (
              <button
                key={id}
                type="button"
                onClick={() => openCreate(id as "normal" | "counter" | "defense")}
                className="group relative overflow-hidden rounded-2xl border border-white/5 bg-slate-950 p-6 text-left transition hover:scale-[1.02] hover:border-white/20 active:scale-[0.98]"
              >
                <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${info.color} mb-2`}>{info.icon}</div>
                <div className="text-lg font-black text-white mb-1">{info.label}</div>
                <div className="text-xs font-medium text-slate-500 line-clamp-1">{info.copy}</div>
              </button>
            ))}
          </div>

          {actionError && (
            <div className="mb-8 rounded-2xl border border-rose-500/20 bg-rose-500/5 px-5 py-4 text-sm font-bold text-rose-300">
              {actionError}
            </div>
          )}

          {raids.length === 0 ? (
            <div className="rounded-[2rem] border border-white/5 bg-slate-950/50 p-12 text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-[10px] font-black tracking-[0.3em] text-slate-500">CLEAR</div>
              <h3 className="text-xl font-black text-white mb-2">No Active Teams</h3>
              <p className="text-sm font-medium text-slate-500 max-w-sm mx-auto leading-relaxed">
                Create a raid or hive defense team above. Members will see a clear Join button and role picker.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {raids.map((raid) => {
                const inRaid = isInRaid(raid);
                const participantCount = raid.raid_participants.filter((p) => p.status === "joined" || p.status === "confirmed").length;
                const typeInfo = raidTypeLabels[raid.raid_type] || raidTypeLabels.normal;

                return (
                  <article key={raid.id} className={`group relative rounded-[2rem] border p-1 transition-all ${inRaid ? "border-amber-400/30 bg-amber-500/10" : "border-white/5 bg-slate-950/50 hover:bg-slate-950"}`}>
                    <div className="p-6">
                      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-slate-950 text-[10px] font-black tracking-[0.2em] text-white">
                          {typeInfo.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                            <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${typeInfo.color}`}>{typeInfo.label}</span>
                            <span className="h-1 w-1 rounded-full bg-white/20" />
                            <span className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">{new Date(raid.created_at).toLocaleTimeString()}</span>
                            {inRaid && <span className="rounded-full bg-amber-400/20 px-3 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-amber-300">Active Duty</span>}
                          </div>
                          <h3 className="text-2xl font-black text-white tracking-tight mb-2 truncate">{raid.target_location}</h3>
                          {raid.description && <p className="text-sm font-medium text-slate-500 mb-6 line-clamp-2 leading-relaxed">{raid.description}</p>}
                          
                          <div className="flex flex-wrap items-center gap-6">
                            <div className="flex items-center gap-2">
                              <div className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-600">Squad</div>
                              <div className="text-sm font-black text-white">{participantCount} <span className="text-slate-500">/ {raid.team_size}</span></div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-600">Commander</div>
                              <div className="text-sm font-black text-white truncate max-w-[120px]">{raid.creator_username}</div>
                            </div>
                            {raid.enemy_count && (
                              <div className="flex items-center gap-2">
                                <div className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-600">Intel</div>
                                <div className="text-sm font-black text-rose-400">{raid.enemy_count} Contact</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-white/5 pt-6">
                        <div className="flex flex-wrap gap-2">
                          {raid.raid_participants.slice(0, 5).map((p) => (
                            <div key={p.id} className="h-8 rounded-xl border border-white/10 bg-slate-900 px-3 flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                              <span className="text-[10px] font-bold text-slate-300 truncate max-w-[80px]">{p.username}</span>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => setSelectedRaid(raid)}
                          className={`h-11 px-6 rounded-xl text-sm font-black transition-all ${inRaid ? "bg-amber-400 text-amber-950" : "bg-white text-slate-950 hover:bg-slate-200"}`}
                        >
                          {inRaid ? "Manage Station" : "Join Operation"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <div className="rounded-[2.5rem] border border-white/5 bg-slate-900/30 p-8 backdrop-blur-xl">
            <h3 className="text-sm font-black uppercase tracking-[0.3em] text-slate-500 mb-6">Tactical Comms</h3>
            <div className="space-y-4">
              <a href="https://discord.gg/hopeggn" target="_blank" className="flex items-center justify-between rounded-2xl border border-white/5 bg-slate-950 p-5 group transition hover:border-indigo-500/40">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-xl">💬</div>
                  <div>
                    <div className="text-sm font-black text-white group-hover:text-indigo-400 transition">Raid Discord</div>
                    <div className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">Live Voice Channels</div>
                  </div>
                </div>
                <div className="text-slate-700 group-hover:translate-x-1 transition-transform">→</div>
              </a>
              <div className="rounded-2xl border border-white/5 bg-slate-950 p-6">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 mb-4">Operational Guidelines</div>
                <ul className="space-y-3">
                  {[
                    "Always mark active when joining raid",
                    "Update enemy counts in real-time",
                    "Keep comms focused during defense",
                    "Log off station when mission ends"
                  ].map((rule) => (
                    <li key={rule} className="flex items-start gap-3 text-xs font-bold text-slate-400">
                      <span className="h-1 w-1 rounded-full bg-cyan-500 mt-1.5 flex-shrink-0" />
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {showCreateModal && (
        <CreateRaidModal
          roles={roles}
          initialRaidType={createMode}
          onClose={() => setShowCreateModal(false)}
          onCreated={(createdRaid) => {
            setShowCreateModal(false);
            if (createdRaid) setRaids((current) => [createdRaid, ...current.filter((r) => r.id !== createdRaid.id)]);
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
    <section className="relative overflow-hidden rounded-[3rem] border border-white/5 bg-slate-900/30 p-10 backdrop-blur-3xl shadow-2xl">
      <div className="absolute -left-[10%] top-[-20%] h-[50%] w-[50%] rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute -right-[10%] bottom-[-20%] h-[50%] w-[50%] rounded-full bg-orange-500/10 blur-[100px] pointer-events-none" />
      
      <div className="relative mb-12 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-3 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300 mb-6">
            Hive Management Protocol
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white leading-none tracking-tight mb-6">
            Establish Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Stronghold</span>.
          </h2>
          <p className="text-lg font-medium text-slate-400 leading-relaxed">
            Hives gain XP when members stay active, defend, and launch raid alerts. Higher level hives unlock exclusive NewHope rewards and automatic store packs.
          </p>
        </div>
        <button 
          onClick={onCreateHive} 
          className="h-16 px-10 rounded-[1.5rem] bg-gradient-to-r from-cyan-500 to-blue-600 text-sm font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-cyan-500/20 transition hover:scale-[1.02] active:scale-[0.98]"
        >
          Initialize Hive
        </button>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-slate-500 font-bold uppercase tracking-widest animate-pulse">Syncing Hive Clusters...</div>
      ) : hives.length === 0 ? (
        <div className="rounded-[2.5rem] border border-white/5 bg-slate-950/50 p-16 text-center">
          <h3 className="text-3xl font-black text-white mb-4">No Hives Established</h3>
          <p className="text-slate-500 font-medium max-w-md mx-auto mb-10">Be the first to plant a flag. Mark your territory on the RaidZone map and start earning XP.</p>
          <button onClick={onCreateHive} className="h-14 px-8 rounded-2xl bg-white text-sm font-black text-slate-950 uppercase tracking-widest">Deploy Hive v1.0</button>
        </div>
      ) : (
        <div className="grid gap-8 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-6">
            <div className="rounded-[2.5rem] border border-white/5 bg-slate-950/70 p-8">
              <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">RaidZone Hive Map</h3>
                  <p className="mt-1 text-xs font-medium text-slate-600 uppercase tracking-tight">Syncing Live Global Coordinates</p>
                </div>
                <div className="flex items-center gap-3">
                   <div className="flex -space-x-2">
                     {hives.slice(0, 3).map((h) => (
                       <div key={h.id} className="h-8 w-8 rounded-full border-2 border-slate-950 bg-cyan-500/20 flex items-center justify-center text-[10px] font-black text-cyan-300 backdrop-blur-sm">
                         {h.name[0]}
                       </div>
                     ))}
                   </div>
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">{hives.length} ACTIVE PINS</span>
                </div>
              </div>
              <InteractiveMap hives={hives} compact className="rounded-[1.5rem] mt-6" />
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2.5rem] border border-amber-500/20 bg-amber-500/5 p-8">
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-amber-500 mb-6">Hive Rankings</h3>
              <div className="space-y-3">
                {hives.slice(0, 3).map((hive, index) => (
                  <div key={hive.id} className="flex items-center gap-4 rounded-2xl bg-slate-950/80 p-4 border border-white/5 group hover:border-amber-500/30 transition">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-sm font-black text-amber-500">#{index + 1}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-black text-white truncate">{hive.name}</div>
                      <div className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">{hive.members.length} Squad · {hive.map_label}</div>
                    </div>
                    <div className="text-xs font-black text-amber-400">LVL {hive.level}</div>
                  </div>
                ))}
              </div>
            </div>

            {featuredHive && (
              <HiveActionCard 
                hive={featuredHive} 
                user={user} 
                isMine={myHives.some((h) => h.id === featuredHive.id)} 
                onActivity={onActivity} 
                onCreateRaid={onCreateRaid} 
                pendingHiveAction={pendingHiveAction} 
              />
            )}
          </div>
        </div>
      )}
    </section>
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
    ? "Recording..."
    : checkinLocked
      ? `Cooldown: ${checkinAvailableAt?.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
      : "Mark Active +15 XP";

  return (
    <div className="rounded-[2.5rem] border border-cyan-500/20 bg-cyan-500/5 p-8 shadow-2xl shadow-cyan-950/20">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 mb-2">{isMine ? "Your Stronghold" : "Selected Target"}</div>
          <h3 className="text-2xl font-black text-white leading-none tracking-tight mb-2 truncate max-w-[180px]">{hive.name}</h3>
          <div className="text-[10px] font-bold text-slate-500 uppercase">Commanded by {hive.owner_username}</div>
        </div>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-xl font-black text-cyan-400 shadow-lg shadow-cyan-500/10">
          {hive.level}
        </div>
      </div>

      <div className="mb-10">
        <div className="flex justify-between items-end mb-3 font-black uppercase tracking-widest">
          <span className="text-[10px] text-slate-500">Evolution Progress</span>
          <span className="text-xs text-white">{hive.xp} <span className="text-slate-600">/ {hive.next_reward_xp}</span></span>
        </div>
        <div className="h-4 rounded-full bg-slate-950 p-1 border border-white/5 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 transition-all duration-500 shadow-[0_0_15px_rgba(34,211,238,0.5)]" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-amber-500">Reward: FREE BETA STORE PACK @ 100%</p>
      </div>

      <div className="grid gap-3">
        <button
          onClick={() => onActivity(hive.id, "checkin")}
          disabled={checkinLocked || checkinPending}
          className="h-14 rounded-2xl bg-emerald-500 text-xs font-black uppercase tracking-[0.2em] text-emerald-950 shadow-xl shadow-emerald-500/20 transition hover:scale-[1.02] disabled:opacity-50 disabled:grayscale disabled:scale-100"
        >
          {checkinLabel}
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => onCreateRaid(hive, "defense")} 
            className="h-14 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-[10px] font-black uppercase tracking-[0.2em] text-rose-400 hover:bg-rose-500/20 transition"
          >
            Defend
          </button>
          <button 
            onClick={() => onCreateRaid(hive, "normal")} 
            className="h-14 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-[10px] font-black uppercase tracking-[0.2em] text-amber-400 hover:bg-amber-500/20 transition"
          >
            Raid
          </button>
        </div>
      </div>
      <p className="mt-6 text-[10px] font-bold text-slate-600 text-center uppercase tracking-tight">Anti-Cheat System Active · Refreshes are logged</p>
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
          <InteractiveMap hives={[]} draft={{ x: form.mapX, y: form.mapY }} onPick={(x, y) => setForm({ ...form, mapX: x, mapY: y })} compact className="rounded-2xl" />
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
