"use client";

import { useState, useEffect, useCallback } from "react";

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

interface RaidParticipant {
  id: string;
  discord_id: string;
  username: string;
  avatar_url: string | null;
  role: string;
  status: string;
}

interface RaidRole {
  id: string;
  label: string;
  emoji: string;
  description: string;
  color: string;
}

interface RaidDashboardProps {
  user: any;
}

const raidTypeLabels: Record<string, { label: string; emoji: string; color: string }> = {
  normal: { label: 'Raid', emoji: '🚨', color: 'text-amber-400' },
  counter: { label: 'Counter Raid', emoji: '🛡️', color: 'text-blue-400' },
  defense: { label: 'Defense', emoji: '⚔️', color: 'text-red-400' },
};

export function RaidDashboard({ user }: RaidDashboardProps) {
  const [raids, setRaids] = useState<Raid[]>([]);
  const [roles, setRoles] = useState<RaidRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRaid, setSelectedRaid] = useState<Raid | null>(null);

  const fetchRaids = useCallback(async () => {
    try {
      const res = await fetch("/api/raids");
      const data = await res.json();
      if (data.ok) {
        setRaids(data.raids || []);
        setRoles(data.roles || []);
      }
    } catch (e) {
      console.error("Failed to fetch raids:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRaids();
    const interval = setInterval(fetchRaids, 10000);
    return () => clearInterval(interval);
  }, [fetchRaids]);

  const isInRaid = (raid: Raid) => {
    return raid.raid_participants.some(p => 
      p.discord_id === user?.discord_id && 
      (p.status === 'joined' || p.status === 'confirmed')
    );
  };

  const getMyRole = (raid: Raid) => {
    const me = raid.raid_participants.find(p => p.discord_id === user?.discord_id);
    return me?.role || 'member';
  };

  const getRoleLabel = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    return role ? `${role.emoji} ${role.label}` : roleId;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Raid Switch</h2>
          <p className="text-slate-400">Alert your team and coordinate raids with role assignments</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-orange-600 text-white font-bold hover:opacity-90 transition"
        >
          <span>🚨</span>
          Trigger Raid Alert
        </button>
      </div>

      {/* Active Raids */}
      {raids.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center">
          <div className="text-4xl mb-4">🛡️</div>
          <h3 className="text-lg font-bold text-white mb-2">No Active Raids</h3>
          <p className="text-slate-400 mb-6">All clear! No raids are currently active.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-700 transition"
          >
            Create First Raid
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {raids.map((raid) => {
            const inRaid = isInRaid(raid);
            const participantCount = raid.raid_participants.filter(
              p => p.status === 'joined' || p.status === 'confirmed'
            ).length;
            const isCreator = raid.created_by === user?.discord_id;
            const typeInfo = raidTypeLabels[raid.raid_type] || raidTypeLabels.normal;

            return (
              <div
                key={raid.id}
                className={`rounded-2xl border p-5 transition cursor-pointer ${
                  inRaid 
                    ? 'border-amber-500/30 bg-amber-950/20' 
                    : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                }`}
                onClick={() => setSelectedRaid(raid)}
              >
                <div className="flex items-start gap-4">
                  {/* Type Icon */}
                  <div className="w-14 h-14 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                    <span className="text-2xl">{typeInfo.emoji}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold uppercase ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(raid.created_at).toLocaleTimeString()}
                      </span>
                      {inRaid && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold">
                          JOINED
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-white truncate">
                      {raid.target_location}
                    </h3>
                    {raid.description && (
                      <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                        {raid.description}
                      </p>
                    )}

                    {/* Team Info */}
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <span className="text-slate-400">
                        <span className="text-white font-bold">{participantCount}</span> / {raid.team_size} members
                      </span>
                      {raid.enemy_count && (
                        <span className="text-red-400">
                          ⚠️ {raid.enemy_count} enemies spotted
                        </span>
                      )}
                    </div>

                    {/* Participants Preview */}
                    {raid.raid_participants.length > 0 && (
                      <div className="flex items-center gap-1 mt-3">
                        <div className="flex -space-x-2">
                          {raid.raid_participants.slice(0, 5).map((p, i) => (
                            <div
                              key={p.id}
                              className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-900 flex items-center justify-center text-xs font-bold text-white"
                              style={{ zIndex: 5 - i }}
                              title={`${p.username} (${p.role})`}
                            >
                              {p.avatar_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={p.avatar_url} alt="" className="w-full h-full rounded-full" />
                              ) : (
                                p.username[0]?.toUpperCase()
                              )}
                            </div>
                          ))}
                        </div>
                        {raid.raid_participants.length > 5 && (
                          <span className="text-xs text-slate-500 ml-2">
                            +{raid.raid_participants.length - 5} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action */}
                  <div className="shrink-0">
                    {inRaid ? (
                      <div className="text-center">
                        <div className="text-sm font-bold text-amber-400">
                          {getRoleLabel(getMyRole(raid))}
                        </div>
                        <span className="text-xs text-slate-500">Your Role</span>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Quick join with member role
                          fetch(`/api/raids/${raid.id}/join`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ role: 'member' }),
                          }).then(() => fetchRaids());
                        }}
                        className="px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-sm font-bold hover:bg-cyan-500/30 transition"
                      >
                        Join
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Raid Modal */}
      {showCreateModal && (
        <CreateRaidModal
          roles={roles}
          user={user}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchRaids();
          }}
        />
      )}

      {/* Raid Detail Modal */}
      {selectedRaid && (
        <RaidDetailModal
          raid={selectedRaid}
          roles={roles}
          user={user}
          isInRaid={isInRaid(selectedRaid)}
          myRole={getMyRole(selectedRaid)}
          getRoleLabel={getRoleLabel}
          onClose={() => setSelectedRaid(null)}
          onUpdate={fetchRaids}
        />
      )}
    </div>
  );
}

// Create Raid Modal Component
function CreateRaidModal({ roles, user, onClose, onCreated }: {
  roles: RaidRole[];
  user: any;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    targetLocation: '',
    raidType: 'normal',
    enemyCount: '',
    description: '',
    teamSize: '4',
    myRole: 'leader',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/raids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetLocation: form.targetLocation,
          raidType: form.raidType,
          enemyCount: form.enemyCount ? parseInt(form.enemyCount) : undefined,
          description: form.description,
          teamSize: parseInt(form.teamSize),
        }),
      });

      const data = await res.json();
      if (data.ok) {
        onCreated();
      } else {
        setError(data.error || 'Failed to create raid');
      }
    } catch (e) {
      setError('Failed to create raid');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">🚨 Trigger Raid Alert</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Target Location *</label>
            <input
              type="text"
              value={form.targetLocation}
              onChange={(e) => setForm({ ...form, targetLocation: e.target.value })}
              placeholder="e.g., Sector B4, Enemy Base, etc."
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 focus:border-red-500/50 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Raid Type</label>
              <select
                value={form.raidType}
                onChange={(e) => setForm({ ...form, raidType: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-white focus:border-red-500/50 focus:outline-none"
              >
                <option value="normal">🚨 Raid</option>
                <option value="counter">🛡️ Counter Raid</option>
                <option value="defense">⚔️ Defense</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Enemy Count</label>
              <input
                type="number"
                value={form.enemyCount}
                onChange={(e) => setForm({ ...form, enemyCount: e.target.value })}
                placeholder="Optional"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 focus:border-red-500/50 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Your Role</label>
            <select
              value={form.myRole}
              onChange={(e) => setForm({ ...form, myRole: e.target.value })}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-white focus:border-red-500/50 focus:outline-none"
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.emoji} {role.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              {roles.find(r => r.id === form.myRole)?.description}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Team Size</label>
            <select
              value={form.teamSize}
              onChange={(e) => setForm({ ...form, teamSize: e.target.value })}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-white focus:border-red-500/50 focus:outline-none"
            >
              <option value="2">2 members</option>
              <option value="3">3 members</option>
              <option value="4">4 members</option>
              <option value="5">5 members</option>
              <option value="6">6 members</option>
              <option value="8">8 members</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Details</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Additional intel about the raid..."
              rows={3}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 focus:border-red-500/50 focus:outline-none resize-none"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-medium hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !form.targetLocation.trim()}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-orange-600 text-white font-bold hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : '🚨 Alert Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Raid Detail Modal Component
function RaidDetailModal({ 
  raid, 
  roles, 
  user, 
  isInRaid, 
  myRole, 
  getRoleLabel,
  onClose, 
  onUpdate 
}: {
  raid: Raid;
  roles: RaidRole[];
  user: any;
  isInRaid: boolean;
  myRole: string;
  getRoleLabel: (roleId: string) => string;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [selectedRole, setSelectedRole] = useState(myRole || 'member');
  const [loading, setLoading] = useState<string | null>(null);
  const isCreator = raid.created_by === user?.discord_id;

  const handleJoin = async () => {
    setLoading('join');
    try {
      const res = await fetch(`/api/raids/${raid.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedRole }),
      });
      if (res.ok) onUpdate();
    } finally {
      setLoading(null);
    }
  };

  const handleLeave = async () => {
    setLoading('leave');
    try {
      const res = await fetch(`/api/raids/${raid.id}/leave`, { method: 'POST' });
      if (res.ok) onUpdate();
    } finally {
      setLoading(null);
    }
  };

  const handleStatusChange = async (status: string) => {
    setLoading(status);
    try {
      const res = await fetch(`/api/raids/${raid.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) onUpdate();
    } finally {
      setLoading(null);
    }
  };

  const handleRoleChange = async (targetId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/raids/${raid.id}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole, targetDiscordId: targetId !== user?.discord_id ? targetId : undefined }),
      });
      if (res.ok) onUpdate();
    } catch (e) {
      console.error('Failed to update role:', e);
    }
  };

  const activeParticipants = raid.raid_participants.filter(
    p => p.status === 'joined' || p.status === 'confirmed'
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase">
                {raid.raid_type}
              </span>
              <span className="text-xs text-slate-500">
                {new Date(raid.created_at).toLocaleString()}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-white">{raid.target_location}</h3>
            {raid.description && (
              <p className="text-slate-400 mt-2">{raid.description}</p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl border border-slate-800 bg-slate-800/50 p-4 text-center">
            <div className="text-2xl font-bold text-white">{activeParticipants.length}</div>
            <div className="text-xs text-slate-500 uppercase">Members</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-800/50 p-4 text-center">
            <div className="text-2xl font-bold text-white">{raid.team_size}</div>
            <div className="text-xs text-slate-500 uppercase">Max Size</div>
          </div>
          {raid.enemy_count && (
            <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-center">
              <div className="text-2xl font-bold text-red-400">{raid.enemy_count}</div>
              <div className="text-xs text-red-500 uppercase">Enemies</div>
            </div>
          )}
        </div>

        {/* Team Members */}
        <div className="mb-6">
          <h4 className="text-sm font-bold text-slate-400 uppercase mb-3">Team Composition</h4>
          <div className="space-y-2">
            {activeParticipants.map((p) => {
              const role = roles.find(r => r.id === p.role);
              const isMe = p.discord_id === user?.discord_id;
              
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${
                    isMe ? 'border-amber-500/30 bg-amber-950/10' : 'border-slate-800 bg-slate-800/30'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold">
                    {p.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.avatar_url} alt="" className="w-full h-full rounded-full" />
                    ) : (
                      p.username[0]?.toUpperCase()
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-white">
                      {p.username}
                      {isMe && <span className="text-amber-400 ml-2">(You)</span>}
                    </div>
                    <div className="text-xs text-slate-500">
                      {role?.emoji} {role?.label}
                    </div>
                  </div>
                  
                  {/* Role Selector (for self or if leader) */}
                  {(isMe || isCreator) && (
                    <select
                      value={p.role}
                      onChange={(e) => handleRoleChange(p.discord_id, e.target.value)}
                      className="text-sm rounded-lg border border-slate-700 bg-slate-800 text-white px-2 py-1"
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.emoji} {r.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Available Roles Info */}
        <div className="mb-6">
          <h4 className="text-sm font-bold text-slate-400 uppercase mb-3">Available Roles</h4>
          <div className="grid grid-cols-2 gap-2">
            {roles.map((role) => (
              <div key={role.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50 text-sm">
                <span>{role.emoji}</span>
                <span className="text-white">{role.label}</span>
                <span className="text-slate-500 text-xs">• {role.description}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-800">
          {!isInRaid ? (
            <>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-white"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.emoji} Join as {r.label}
                  </option>
                ))}
              </select>
              <button
                onClick={handleJoin}
                disabled={loading === 'join'}
                className="flex-1 min-w-[120px] py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold hover:opacity-90 transition disabled:opacity-50"
              >
                {loading === 'join' ? 'Joining...' : 'Join Raid'}
              </button>
            </>
          ) : (
            <button
              onClick={handleLeave}
              disabled={loading === 'leave'}
              className="flex-1 py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 font-bold hover:bg-red-500/20 transition disabled:opacity-50"
            >
              {loading === 'leave' ? 'Leaving...' : 'Leave Raid'}
            </button>
          )}

          {isCreator && (
            <>
              <button
                onClick={() => handleStatusChange('active')}
                disabled={loading === 'active' || raid.status === 'active'}
                className="px-4 py-2.5 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 font-bold hover:bg-green-500/30 transition disabled:opacity-50"
              >
                Start Raid
              </button>
              <button
                onClick={() => handleStatusChange('completed')}
                disabled={loading === 'completed'}
                className="px-4 py-2.5 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 font-bold hover:bg-blue-500/30 transition disabled:opacity-50"
              >
                Complete
              </button>
              <button
                onClick={() => handleStatusChange('cancelled')}
                disabled={loading === 'cancelled'}
                className="px-4 py-2.5 rounded-xl bg-slate-700 text-slate-400 font-bold hover:bg-slate-600 transition disabled:opacity-50"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
