"use client";

import { useEffect, useState, useCallback } from "react";

interface ArenaEvent {
  id: string;
  name: string;
  description?: string;
  game_mode: string;
  max_teams: number;
  team_size: number;
  status: string;
  registration_open: boolean;
  start_time?: string;
  current_round: number;
  created_at: string;
  arena_teams?: { count: number }[];
}

interface ArenaTeam {
  id: string;
  event_id: string;
  name: string;
  tag?: string;
  logo_url?: string;
  leader_discord_id: string;
  leader_username: string;
  leader_avatar_url?: string;
  status: string;
  arena_team_members: TeamMember[];
}

interface TeamMember {
  id: string;
  discord_id: string;
  username: string;
  avatar_url?: string;
  role: "leader" | "member" | "substitute";
  joined_at: string;
}

interface UserSession {
  discord_id?: string;
  username?: string;
  avatar_url?: string;
}

export function ArenaEventsWidget({ session }: { session: UserSession | null }) {
  const [events, setEvents] = useState<ArenaEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<ArenaEvent | null>(null);
  const [teams, setTeams] = useState<ArenaTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamTag, setNewTeamTag] = useState("");
  const [creating, setCreating] = useState(false);
  const [joiningTeamId, setJoiningTeamId] = useState<string | null>(null);
  const [kickingMemberId, setKickingMemberId] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/arena/events");
      const data = await res.json();
      if (data.ok) {
        setEvents(data.events || []);
      }
    } catch (e) {
      console.error("Failed to fetch events:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTeams = useCallback(async (eventId: string) => {
    try {
      const res = await fetch(`/api/arena/teams?eventId=${eventId}`);
      const data = await res.json();
      if (data.ok) {
        setTeams(data.teams || []);
      }
    } catch (e) {
      console.error("Failed to fetch teams:", e);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchEvents]);

  useEffect(() => {
    if (selectedEvent) {
      fetchTeams(selectedEvent.id);
    }
  }, [selectedEvent, fetchTeams]);

  const handleCreateTeam = async () => {
    if (!session?.discord_id) {
      alert("Please sign in with Discord to create a team");
      return;
    }
    if (!newTeamName.trim() || !selectedEvent) return;

    setCreating(true);
    try {
      const res = await fetch("/api/arena/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: selectedEvent.id,
          name: newTeamName.trim(),
          tag: newTeamTag.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setShowCreateTeam(false);
        setNewTeamName("");
        setNewTeamTag("");
        fetchTeams(selectedEvent.id);
      } else {
        alert(data.error || "Failed to create team");
      }
    } catch (e) {
      alert("Failed to create team");
    } finally {
      setCreating(false);
    }
  };

  const handleJoinTeam = async (teamId: string) => {
    if (!session?.discord_id) {
      alert("Please sign in with Discord to join a team");
      return;
    }
    if (!selectedEvent) return;

    setJoiningTeamId(teamId);
    try {
      const res = await fetch("/api/arena/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_id: teamId,
          event_id: selectedEvent.id,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        fetchTeams(selectedEvent.id);
      } else {
        alert(data.error || "Failed to join team");
      }
    } catch (e) {
      alert("Failed to join team");
    } finally {
      setJoiningTeamId(null);
    }
  };

  const handleLeaveTeam = async (teamId: string) => {
    if (!confirm("Leave this team?")) return;
    if (!selectedEvent) return;

    try {
      const res = await fetch(`/api/arena/members?teamId=${teamId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.ok) {
        fetchTeams(selectedEvent.id);
      } else {
        alert(data.error || "Failed to leave team");
      }
    } catch (e) {
      alert("Failed to leave team");
    }
  };

  const handleKickMember = async (teamId: string, memberId: string) => {
    if (!confirm("Kick this member from the team?")) return;
    if (!selectedEvent) return;

    setKickingMemberId(memberId);
    try {
      const res = await fetch(`/api/arena/members?teamId=${teamId}&memberId=${memberId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.ok) {
        fetchTeams(selectedEvent.id);
      } else {
        alert(data.error || "Failed to kick member");
      }
    } catch (e) {
      alert("Failed to kick member");
    } finally {
      setKickingMemberId(null);
    }
  };

  const getUserTeam = () => {
    if (!session?.discord_id) return null;
    return teams.find(team => 
      team.arena_team_members.some(m => m.discord_id === session.discord_id)
    );
  };

  const isTeamLeader = (team: ArenaTeam) => {
    return team.leader_discord_id === session?.discord_id;
  };

  const isTeamMember = (team: ArenaTeam) => {
    if (!session?.discord_id) return false;
    return team.arena_team_members.some(m => m.discord_id === session.discord_id);
  };

  const userTeam = getUserTeam();

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-4">
        <div className="flex items-center gap-2 text-amber-400">
          <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm font-semibold">Loading Arena...</span>
        </div>
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-4">
        <div className="flex items-center gap-2 text-amber-400 mb-2">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="font-bold">Arena Events</span>
        </div>
        <p className="text-sm text-slate-400">No active events. Check back later!</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950/90 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
        <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span className="font-bold text-white">Arena Events</span>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
          {events.length} Active
        </span>
      </div>

      {/* Events List */}
      <div className="divide-y divide-white/5">
        {events.map((event) => (
          <div key={event.id} className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-white">{event.name}</h3>
                <p className="text-xs text-slate-400">{event.game_mode} • {event.arena_teams?.[0]?.count || 0}/{event.max_teams} Teams</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                event.registration_open 
                  ? "bg-emerald-500/20 text-emerald-300" 
                  : "bg-rose-500/20 text-rose-300"
              }`}>
                {event.registration_open ? "Open" : "Closed"}
              </span>
            </div>

            {selectedEvent?.id === event.id ? (
              <div className="mt-3 space-y-3">
                {/* Teams Section */}
                <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-amber-400">Registered Teams</h4>
                    {event.registration_open && !userTeam && session?.discord_id && (
                      <button
                        onClick={() => setShowCreateTeam(true)}
                        className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition"
                      >
                        + Create Team
                      </button>
                    )}
                  </div>

                  {showCreateTeam && (
                    <div className="mb-3 p-3 rounded-lg bg-slate-900/50 border border-amber-500/20">
                      <input
                        type="text"
                        placeholder="Team Name"
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        className="w-full mb-2 px-3 py-1.5 rounded bg-slate-800 border border-white/10 text-sm text-white placeholder:text-slate-500"
                      />
                      <input
                        type="text"
                        placeholder="Team Tag [TAG] (optional)"
                        value={newTeamTag}
                        onChange={(e) => setNewTeamTag(e.target.value)}
                        className="w-full mb-2 px-3 py-1.5 rounded bg-slate-800 border border-white/10 text-sm text-white placeholder:text-slate-500"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleCreateTeam}
                          disabled={creating || !newTeamName.trim()}
                          className="flex-1 py-1.5 rounded bg-amber-500/20 text-amber-300 text-sm font-semibold hover:bg-amber-500/30 disabled:opacity-50"
                        >
                          {creating ? "Creating..." : "Create Team"}
                        </button>
                        <button
                          onClick={() => { setShowCreateTeam(false); setNewTeamName(""); setNewTeamTag(""); }}
                          className="px-3 py-1.5 rounded bg-slate-800 text-slate-400 text-sm hover:bg-slate-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Teams Grid */}
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {teams.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-4">No teams yet. Be the first!</p>
                    ) : (
                      teams.map((team) => (
                        <div 
                          key={team.id} 
                          className={`p-3 rounded-lg border ${
                            isTeamMember(team) 
                              ? "border-amber-500/30 bg-amber-500/10" 
                              : "border-white/5 bg-slate-900/30"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              {team.leader_avatar_url ? (
                                <img src={team.leader_avatar_url} alt="" className="w-8 h-8 rounded-full border border-white/10" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
                                  {team.name[0]}
                                </div>
                              )}
                              <div>
                                <div className="font-semibold text-white text-sm">
                                  {team.tag && <span className="text-amber-400 mr-1">[{team.tag}]</span>}
                                  {team.name}
                                </div>
                                <div className="text-xs text-slate-400">
                                  Leader: {team.leader_username}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-slate-500">{team.arena_team_members.length}/{event.team_size}</span>
                              {isTeamMember(team) ? (
                                <button
                                  onClick={() => handleLeaveTeam(team.id)}
                                  className="text-xs px-2 py-1 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition"
                                >
                                  Leave
                                </button>
                              ) : event.registration_open && !userTeam && joiningTeamId !== team.id ? (
                                <button
                                  onClick={() => handleJoinTeam(team.id)}
                                  className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition"
                                >
                                  Join
                                </button>
                              ) : joiningTeamId === team.id ? (
                                <span className="text-xs text-slate-500">Joining...</span>
                              ) : null}
                            </div>
                          </div>

                          {/* Team Members */}
                          <div className="mt-2 flex flex-wrap gap-1">
                            {team.arena_team_members.map((member) => (
                              <div 
                                key={member.id}
                                className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-800 text-xs"
                              >
                                {member.avatar_url ? (
                                  <img src={member.avatar_url} alt="" className="w-4 h-4 rounded-full" />
                                ) : (
                                  <div className="w-4 h-4 rounded-full bg-slate-600 flex items-center justify-center text-[8px]">
                                    {member.username[0]}
                                  </div>
                                )}
                                <span className={member.role === "leader" ? "text-amber-400" : "text-slate-300"}>
                                  {member.username}
                                </span>
                                {member.role === "leader" && <span className="text-amber-400">👑</span>}
                                {isTeamLeader(team) && member.role !== "leader" && (
                                  <button
                                    onClick={() => handleKickMember(team.id, member.id)}
                                    disabled={kickingMemberId === member.id}
                                    className="ml-1 text-rose-400 hover:text-rose-300"
                                  >
                                    {kickingMemberId === member.id ? "..." : "×"}
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedEvent(null)}
                  className="w-full py-2 rounded-lg bg-slate-800 text-slate-400 text-sm hover:bg-slate-700 transition"
                >
                  Close
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSelectedEvent(event)}
                className="mt-2 w-full py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm font-semibold hover:bg-amber-500/20 transition"
              >
                {userTeam && userTeam.event_id === event.id ? "View My Team" : "View Teams & Register"}
              </button>
            )}
          </div>
        ))}
      </div>

      {!session?.discord_id && (
        <div className="px-4 py-3 border-t border-white/10 bg-slate-950/50">
          <p className="text-xs text-center text-slate-400">
            <a href="/auth/discord" className="text-amber-400 hover:underline">Sign in with Discord</a> to join teams
          </p>
        </div>
      )}
    </div>
  );
}
