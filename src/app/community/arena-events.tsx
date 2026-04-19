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
  image_url?: string;
  arena_teams?: { count: number }[];
  metadata?: {
    vc_assignments?: {
      team_id: string;
      vc_channel: string;
      team_name: string;
      leader_username: string;
    }[];
    matches?: {
      team1_id: string;
      team1_name: string;
      team1_vc: string;
      team2_id: string;
      team2_name: string;
      team2_vc: string;
      match_number: number;
    }[];
  };
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

interface VoteOption {
  id: string;
  name: string;
  description?: string;
  icon: string;
  arena_votes?: { count: number }[];
}

interface VoteResult {
  option_id: string;
  option_name: string;
  option_icon: string;
  vote_count: number;
  percentage: number;
}

interface Vote {
  id: string;
  team_id: string;
  option_id: string;
  voted_by_discord_id: string;
  voted_by_username: string;
  team?: { name: string; tag?: string };
  option?: { name: string; icon: string };
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
  const [newTeamLogo, setNewTeamLogo] = useState("");
  const [creating, setCreating] = useState(false);
  const [joiningTeamId, setJoiningTeamId] = useState<string | null>(null);
  const [kickingMemberId, setKickingMemberId] = useState<string | null>(null);
  
  // Voting state
  const [voteOptions, setVoteOptions] = useState<VoteOption[]>([]);
  const [voteResults, setVoteResults] = useState<VoteResult[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [voting, setVoting] = useState<string | null>(null);
  const [showVoting, setShowVoting] = useState(false);

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

  const fetchVotes = useCallback(async (eventId: string) => {
    try {
      const res = await fetch(`/api/arena/votes?eventId=${eventId}`);
      const data = await res.json();
      if (data.ok) {
        setVoteOptions(data.options || []);
        setVoteResults(data.results || []);
        setVotes(data.votes || []);
      }
    } catch (e) {
      console.error("Failed to fetch votes:", e);
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
      if (showVoting) {
        fetchVotes(selectedEvent.id);
      }
    }
  }, [selectedEvent, fetchTeams, showVoting, fetchVotes]);

  // Poll votes when voting section is open
  useEffect(() => {
    if (!selectedEvent || !showVoting) return;
    
    fetchVotes(selectedEvent.id);
    const interval = setInterval(() => {
      fetchVotes(selectedEvent.id);
    }, 5000); // Refresh votes every 5 seconds
    
    return () => clearInterval(interval);
  }, [selectedEvent, showVoting, fetchVotes]);

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
          logo_url: newTeamLogo.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setShowCreateTeam(false);
        setNewTeamName("");
        setNewTeamTag("");
        setNewTeamLogo("");
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

  const handleVote = async (optionId: string) => {
    if (!session?.discord_id) {
      alert("Please sign in with Discord to vote");
      return;
    }
    if (!selectedEvent || !userTeam) return;

    setVoting(optionId);
    try {
      const res = await fetch("/api/arena/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: selectedEvent.id,
          option_id: optionId,
          team_id: userTeam.id,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        fetchVotes(selectedEvent.id);
      } else {
        alert(data.error || "Failed to vote");
      }
    } catch (e) {
      alert("Failed to vote");
    } finally {
      setVoting(null);
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

  const getUserVote = () => {
    if (!userTeam) return null;
    return votes.find(v => v.team_id === userTeam.id);
  };

  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const userVote = getUserVote();
  const totalVotes = voteResults.reduce((sum, r) => sum + r.vote_count, 0);

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
            <div className="flex items-start gap-3 mb-2">
              {event.image_url ? (
                <img src={event.image_url} alt="" className="w-12 h-12 rounded-lg object-cover border border-white/10" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-white/10 flex items-center justify-center text-xl">
                  ⚔️
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-start justify-between">
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
              </div>
            </div>

            {selectedEvent?.id === event.id ? (
              <div className="mt-3 space-y-3">
                {/* Voice Channel Assignment Banner */}
                {userTeam && event.status === "active" && event.metadata?.vc_assignments && (
                  (() => {
                    const assignment = event.metadata.vc_assignments.find((a) => a.team_id === userTeam.id);
                    const match = event.metadata.matches?.find((m: any) => 
                      m.team1_id === userTeam.id || m.team2_id === userTeam.id
                    );
                    const opponent = match ? (match.team1_id === userTeam.id ? match.team2_name : match.team1_name) : null;
                    const opponentVc = match ? (match.team1_id === userTeam.id ? match.team2_vc : match.team1_vc) : null;
                    
                    if (assignment) {
                      return (
                        <div className="rounded-xl border border-violet-500/30 bg-gradient-to-r from-violet-500/20 to-purple-500/10 p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 rounded-xl bg-violet-500/30 flex items-center justify-center text-2xl">
                              🔊
                            </div>
                            <div className="flex-1">
                              <p className="text-xs text-violet-300 font-semibold uppercase tracking-wider">Your Voice Channel</p>
                              <p className="text-xl font-bold text-white">{assignment.vc_channel}</p>
                              <p className="text-xs text-slate-400">Please join this channel now!</p>
                            </div>
                            <a 
                              href="discord://" 
                              className="px-3 py-2 rounded-lg bg-violet-500 text-white text-sm font-bold hover:bg-violet-400 transition"
                            >
                              Join VC
                            </a>
                          </div>
                          
                          {opponent && (
                            <div className="mt-3 p-3 rounded-lg bg-slate-900/50 border border-rose-500/20">
                              <p className="text-xs text-rose-400 font-semibold uppercase tracking-wider mb-1">⚔️ Your Opponent</p>
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-lg font-bold text-white">{opponent}</p>
                                  <p className="text-xs text-slate-400">They are in {opponentVc}</p>
                                </div>
                                <span className="text-2xl">⚔️</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()
                )}

                {/* Teams Section */}
                <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-semibold text-amber-400">Registered Teams</h4>
                      <p className="text-[10px] text-slate-500">{teams.length} / {event.max_teams} teams • {event.team_size} players per team</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {event.registration_open && !userTeam && session?.discord_id && (
                        <button
                          onClick={() => setShowCreateTeam(true)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-amber-500 text-amber-950 font-bold hover:bg-amber-400 transition"
                        >
                          + Create Team
                        </button>
                      )}
                      {event.registration_open && !session?.discord_id && (
                        <a href="/auth/discord" className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-amber-400 font-semibold hover:bg-slate-700 transition">
                          Sign in
                        </a>
                      )}
                      {userTeam && (
                        <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">
                          ✓ You're in [GGN] Admin
                        </span>
                      )}
                    </div>
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
                      <input
                        type="text"
                        placeholder="Team Logo URL (Discord CDN, Imgur)"
                        value={newTeamLogo}
                        onChange={(e) => setNewTeamLogo(e.target.value)}
                        className="w-full mb-2 px-3 py-1.5 rounded bg-slate-800 border border-white/10 text-sm text-white placeholder:text-slate-500"
                      />
                      <p className="text-[10px] text-slate-500 mb-2">Logo will be posted to team-logos channel</p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleCreateTeam}
                          disabled={creating || !newTeamName.trim()}
                          className="flex-1 py-1.5 rounded bg-amber-500/20 text-amber-300 text-sm font-semibold hover:bg-amber-500/30 disabled:opacity-50"
                        >
                          {creating ? "Creating..." : "Create Team"}
                        </button>
                        <button
                          onClick={() => { setShowCreateTeam(false); setNewTeamName(""); setNewTeamTag(""); setNewTeamLogo(""); }}
                          className="px-3 py-1.5 rounded bg-slate-800 text-slate-400 text-sm hover:bg-slate-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* All Teams List */}
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {teams.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-4">No teams yet. Be the first!</p>
                    ) : (
                      teams.map((team) => {
                        const isMyTeam = isTeamMember(team);
                        const isLeader = isTeamLeader(team);
                        const isFull = team.arena_team_members.length >= event.team_size;
                        
                        return (
                          <div 
                            key={team.id} 
                            className={`rounded-lg border overflow-hidden ${
                              isMyTeam 
                                ? "border-amber-500/50 bg-gradient-to-r from-amber-500/10 to-slate-900/50" 
                                : "border-white/5 bg-slate-900/30 hover:bg-slate-900/50"
                            }`}
                          >
                            {/* Team Header */}
                            <div className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {team.logo_url ? (
                                    <img src={team.logo_url} alt="" className="w-10 h-10 rounded-lg border border-white/10 object-cover" />
                                  ) : team.leader_avatar_url ? (
                                    <img src={team.leader_avatar_url} alt="" className="w-8 h-8 rounded-full border border-white/10" />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm">
                                      {team.name[0]}
                                    </div>
                                  )}
                                  <div>
                                    <div className="font-semibold text-white text-sm flex items-center gap-2">
                                      {team.tag && <span className="text-amber-400">[{team.tag}]</span>}
                                      {team.name}
                                      {isMyTeam && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-amber-950 font-bold">YOU</span>}
                                    </div>
                                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                      <span>👑 {team.leader_username}</span>
                                      <span>•</span>
                                      <span>{team.arena_team_members.length}/{event.team_size} members</span>
                                      {isFull && <span className="text-rose-400">(FULL)</span>}
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Action Button */}
                                <div>
                                  {isMyTeam ? (
                                    <button
                                      onClick={() => handleLeaveTeam(team.id)}
                                      className="text-xs px-2 py-1 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition"
                                    >
                                      Leave
                                    </button>
                                  ) : event.registration_open && !userTeam && !isFull && joiningTeamId !== team.id ? (
                                    <button
                                      onClick={() => handleJoinTeam(team.id)}
                                      className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500 text-emerald-950 font-bold hover:bg-emerald-400 transition"
                                    >
                                      Join
                                    </button>
                                  ) : joiningTeamId === team.id ? (
                                    <span className="text-xs text-slate-500">Joining...</span>
                                  ) : isFull ? (
                                    <span className="text-xs text-rose-400 font-medium">Full</span>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                            
                            {/* Team Members Roster */}
                            <div className={`px-3 pb-3 ${isMyTeam ? 'block' : 'hidden'}`}>
                              <div className="flex flex-wrap gap-1.5">
                                {team.arena_team_members.map((member) => (
                                  <div 
                                    key={member.id}
                                    className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${
                                      member.role === "leader" 
                                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" 
                                        : "bg-slate-800 text-slate-300 border border-white/5"
                                    }`}
                                  >
                                    {member.avatar_url ? (
                                      <img src={member.avatar_url} alt="" className="w-4 h-4 rounded-full" />
                                    ) : (
                                      <div className="w-4 h-4 rounded-full bg-slate-600 flex items-center justify-center text-[8px]">
                                        {member.username[0]}
                                      </div>
                                    )}
                                    <span className={member.role === "leader" ? "font-semibold" : ""}>
                                      {member.username}
                                    </span>
                                    {member.role === "leader" && <span>👑</span>}
                                    {isLeader && member.role !== "leader" && (
                                      <button
                                        onClick={() => handleKickMember(team.id, member.id)}
                                        disabled={kickingMemberId === member.id}
                                        className="ml-1 w-4 h-4 flex items-center justify-center rounded-full bg-rose-500/20 text-rose-400 hover:bg-rose-500/30"
                                        title="Kick member"
                                      >
                                        {kickingMemberId === member.id ? "..." : "×"}
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                              
                              {isLeader && (
                                <p className="text-[10px] text-slate-500 mt-2">
                                  Click × to kick a member
                                </p>
                              )}
                            </div>
                            
                            {/* Show member count for other teams */}
                            {!isMyTeam && team.arena_team_members.length > 0 && (
                              <div className="px-3 pb-3">
                                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                  <span>Roster:</span>
                                  {team.arena_team_members.slice(0, 3).map((m) => (
                                    <span key={m.id} className="text-slate-400">{m.username}</span>
                                  ))}
                                  {team.arena_team_members.length > 3 && (
                                    <span className="text-slate-500">+{team.arena_team_members.length - 3} more</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Tournament Pyramid Bracket - Professional View */}
                {event.status === "active" && event.metadata?.matches && event.metadata.matches.length > 0 && (
                  <div className="rounded-xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 via-slate-900/80 to-slate-950/90 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                        <span>🏆</span>
                        <span>Tournament Bracket - Round {event.current_round || 1}</span>
                      </h4>
                      <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 animate-pulse">● Live</span>
                    </div>
                    
                    {/* Pyramid Layout */}
                    <div className="space-y-3">
                      {event.metadata.matches.map((match: any, index: number) => {
                        const isUsersMatch = userTeam && (match.team1_id === userTeam.id || match.team2_id === userTeam.id);
                        return (
                          <div 
                            key={match.match_number}
                            onClick={() => setSelectedMatch(isUsersMatch ? null : match)}
                            className={`relative p-3 rounded-xl border-2 transition-all cursor-pointer hover:scale-[1.02] ${
                              isUsersMatch 
                                ? "border-amber-500 bg-gradient-to-r from-amber-500/20 to-rose-500/10 shadow-lg shadow-amber-500/20" 
                                : "border-white/10 bg-slate-900/60 hover:border-amber-500/50 hover:bg-slate-900/80"
                            }`}
                          >
                            {/* Match Header */}
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-500">#{match.match_number}</span>
                                {isUsersMatch && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-amber-950 font-bold">YOUR MATCH</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="text-[10px] text-emerald-400 font-medium">IN PROGRESS</span>
                              </div>
                            </div>

                            {/* VS Battle Display */}
                            <div className="flex items-stretch gap-2">
                              {/* Team 1 */}
                              <div className={`flex-1 p-2.5 rounded-lg ${
                                isUsersMatch && match.team1_id === userTeam?.id
                                  ? "bg-amber-500/20 border border-amber-500/40" 
                                  : "bg-slate-800/60 border border-white/5"
                              }`}>
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/30 to-purple-500/30 flex items-center justify-center text-sm font-bold">
                                    {match.team1_name[0]}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-bold text-white truncate">{match.team1_name}</p>
                                    <p className="text-[10px] text-violet-400 flex items-center gap-1">
                                      <span>🔊</span>{match.team1_vc}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* VS Center */}
                              <div className="flex flex-col items-center justify-center px-1">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                                  <span className="text-xs font-black text-amber-950">VS</span>
                                </div>
                              </div>

                              {/* Team 2 */}
                              <div className={`flex-1 p-2.5 rounded-lg ${
                                isUsersMatch && match.team2_id === userTeam?.id
                                  ? "bg-amber-500/20 border border-amber-500/40" 
                                  : "bg-slate-800/60 border border-white/5"
                              }`}>
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500/30 to-red-500/30 flex items-center justify-center text-sm font-bold">
                                    {match.team2_name[0]}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-bold text-white truncate">{match.team2_name}</p>
                                    <p className="text-[10px] text-violet-400 flex items-center gap-1">
                                      <span>🔊</span>{match.team2_vc}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Click hint */}
                            <p className="text-[10px] text-center text-slate-500 mt-2">
                              {isUsersMatch ? "⚔️ Click to view match details" : "👆 Click to view match details"}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Pyramid visualization hint */}
                    <div className="mt-4 pt-3 border-t border-white/10">
                      <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500">
                        <span>🏆</span>
                        <span>Winners advance to next round</span>
                        <span>→</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Match Detail Modal */}
                {selectedMatch && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedMatch(null)}>
                    <div className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-2xl shadow-amber-500/10" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-amber-400">Match #{selectedMatch.match_number}</h3>
                        <button onClick={() => setSelectedMatch(null)} className="text-slate-400 hover:text-white text-xl">&times;</button>
                      </div>

                      {/* Battle Display */}
                      <div className="space-y-4">
                        {/* Team 1 */}
                        <div className="p-4 rounded-xl bg-gradient-to-r from-violet-500/20 to-purple-500/10 border border-violet-500/30">
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-14 rounded-xl bg-violet-500/30 flex items-center justify-center text-2xl font-bold">
                              {selectedMatch.team1_name[0]}
                            </div>
                            <div>
                              <p className="text-lg font-bold text-white">{selectedMatch.team1_name}</p>
                              <p className="text-sm text-violet-400 flex items-center gap-1">
                                <span>🔊</span> {selectedMatch.team1_vc}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* VS */}
                        <div className="flex justify-center">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                            <span className="text-xl font-black text-amber-950">VS</span>
                          </div>
                        </div>

                        {/* Team 2 */}
                        <div className="p-4 rounded-xl bg-gradient-to-r from-rose-500/20 to-red-500/10 border border-rose-500/30">
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-14 rounded-xl bg-rose-500/30 flex items-center justify-center text-2xl font-bold">
                              {selectedMatch.team2_name[0]}
                            </div>
                            <div>
                              <p className="text-lg font-bold text-white">{selectedMatch.team2_name}</p>
                              <p className="text-sm text-violet-400 flex items-center gap-1">
                                <span>🔊</span> {selectedMatch.team2_vc}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Join Buttons */}
                      <div className="mt-6 grid grid-cols-2 gap-3">
                        <a 
                          href="discord://" 
                          className="py-3 rounded-xl bg-violet-500 text-white font-bold text-center hover:bg-violet-400 transition"
                        >
                          Join {selectedMatch.team1_vc}
                        </a>
                        <a 
                          href="discord://" 
                          className="py-3 rounded-xl bg-rose-500 text-white font-bold text-center hover:bg-rose-400 transition"
                        >
                          Join {selectedMatch.team2_vc}
                        </a>
                      </div>

                      <p className="mt-4 text-center text-xs text-slate-500">
                        Click to open Discord and join the voice channels
                      </p>
                    </div>
                  </div>
                )}

                {/* Voting Section */}
                {userTeam && isTeamLeader(userTeam) && (
                  <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-violet-400">🗳️ Vote Next Round Loot</h4>
                      <button
                        onClick={() => setShowVoting(!showVoting)}
                        className="text-xs px-2 py-1 rounded bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 transition"
                      >
                        {showVoting ? "Hide" : "Vote"}
                      </button>
                    </div>

                    {showVoting && (
                      <div className="space-y-3">
                        {voteOptions.length === 0 ? (
                          <p className="text-xs text-slate-500 text-center py-2">No voting options yet. Admin will add them soon!</p>
                        ) : (
                          <>
                            {/* Current Results */}
                            <div className="space-y-2">
                              {voteResults.map((result, index) => (
                                <div 
                                  key={result.option_id} 
                                  className={`p-2 rounded-lg border ${
                                    userVote?.option_id === result.option_id 
                                      ? "border-violet-500/50 bg-violet-500/10" 
                                      : "border-white/5 bg-slate-900/30"
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-lg">{result.option_icon}</span>
                                      <span className={`text-sm font-medium ${
                                        index === 0 ? "text-amber-400" : "text-white"
                                      }`}>
                                        {result.option_name}
                                        {index === 0 && <span className="ml-1">👑</span>}
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-xs font-bold text-white">{result.vote_count}</span>
                                      <span className="text-xs text-slate-500 ml-1">({result.percentage}%)</span>
                                    </div>
                                  </div>
                                  
                                  {/* Progress Bar */}
                                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full transition-all duration-500 ${
                                        index === 0 ? "bg-amber-500" : "bg-violet-500"
                                      }`}
                                      style={{ width: `${result.percentage}%` }}
                                    />
                                  </div>

                                  {/* Vote Button */}
                                  {isTeamLeader(userTeam) && (
                                    <button
                                      onClick={() => handleVote(result.option_id)}
                                      disabled={voting === result.option_id || userVote?.option_id === result.option_id}
                                      className={`mt-2 w-full py-1 rounded text-xs font-semibold transition ${
                                        userVote?.option_id === result.option_id
                                          ? "bg-emerald-500/20 text-emerald-300 cursor-default"
                                          : "bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 disabled:opacity-50"
                                      }`}
                                    >
                                      {userVote?.option_id === result.option_id 
                                        ? "✓ Your Team's Vote" 
                                        : voting === result.option_id 
                                          ? "Voting..." 
                                          : "Vote for This"
                                      }
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* Total Votes */}
                            <div className="flex items-center justify-between pt-2 border-t border-white/10">
                              <span className="text-xs text-slate-400">Total Votes Cast</span>
                              <span className="text-sm font-bold text-violet-400">{totalVotes} / {teams.length} teams</span>
                            </div>

                            {/* Vote Log */}
                            {votes.length > 0 && (
                              <div className="mt-3 pt-2 border-t border-white/10">
                                <h5 className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Recent Votes</h5>
                                <div className="space-y-1 max-h-[100px] overflow-y-auto text-xs">
                                  {votes.slice(0, 5).map((vote) => (
                                    <div key={vote.id} className="flex items-center gap-2 text-slate-400">
                                      <span>{vote.option?.icon}</span>
                                      <span className="text-slate-300">{vote.team?.name}</span>
                                      <span className="text-slate-500">voted for</span>
                                      <span className="text-violet-300">{vote.option?.name}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {!showVoting && userVote && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
                        <span className="text-lg">{userVote.option?.icon}</span>
                        <div>
                          <p className="text-xs text-slate-400">Your team voted for:</p>
                          <p className="text-sm font-semibold text-violet-300">{userVote.option?.name}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

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
            <a href="/auth/discord" className="text-amber-400 hover:underline font-semibold">Sign in with Discord</a> to create or join teams
          </p>
        </div>
      )}
    </div>
  );
}
