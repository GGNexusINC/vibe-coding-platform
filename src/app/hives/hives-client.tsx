"use client";

import { useState, useCallback, useMemo } from "react";
import type { HiveRecord } from "@/lib/hive-store";
import { HiveMap } from "./hive-map";
import { useRouter } from "next/navigation";

type HivesClientProps = {
  user: {
    discord_id: string;
    username?: string;
    global_name?: string;
    avatar_url?: string | null;
  } | null;
  initialHives: HiveRecord[];
};

function getUserHiveId(hives: HiveRecord[], userId?: string): string | null {
  if (!userId) return null;
  const h = hives.find((h) => h.members.some((m) => m.discord_id === userId));
  return h?.id ?? null;
}

export function HivesClient({ user, initialHives }: HivesClientProps) {
  const router = useRouter();
  const [hives, setHives] = useState<HiveRecord[]>(initialHives);
  const [selectedHiveId, setSelectedHiveId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loadingAction, setLoadingAction] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [createForm, setCreateForm] = useState({ name: "", description: "", mapLabel: "Marked Territory", mapX: 50, mapY: 50 });
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);

  const userHiveId = getUserHiveId(hives, user?.discord_id);
  const totalMembers = hives.reduce((acc, h) => acc + h.members.length, 0);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const refreshHives = useCallback(async () => {
    try {
      const res = await fetch("/api/hives");
      const data = await res.json();
      if (data.ok) setHives(data.hives);
    } catch (e) {}
  }, []);

  const handleAction = async (hiveId: string, action: string) => {
    if (!user) {
      window.location.href = "/auth/discord/start?next=/hives";
      return;
    }
    setLoadingAction((p) => ({ ...p, [hiveId]: true }));
    try {
      const res = await fetch(`/api/hives/${hiveId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(action === "support" ? "Joined Hive!" : "Action logged!");
        await refreshHives();
      } else {
        showToast(data.error || "Action failed", "error");
      }
    } catch (e) {
      showToast("Network error", "error");
    }
    setLoadingAction((p) => ({ ...p, [hiveId]: false }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/hives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (data.ok) {
        showToast("Hive created!");
        setShowCreateModal(false);
        await refreshHives();
      } else {
        showToast(data.error || "Failed to create hive", "error");
      }
    } catch (e) {
      showToast("Network error", "error");
    }
    setCreating(false);
  };

  const handleImageUpload = async (hiveId: string, file: File) => {
    setUploadingImage(hiveId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/hives/${hiveId}/image`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.ok) {
        showToast("Image uploaded!");
        await refreshHives();
      } else {
        showToast(data.error || "Upload failed", "error");
      }
    } catch (e) {
      showToast("Network error", "error");
    }
    setUploadingImage(null);
  };

  // Sort user's hive first
  const sortedHives = useMemo(() => {
    if (!userHiveId) return hives;
    return [...hives].sort((a, b) => {
      if (a.id === userHiveId) return -1;
      if (b.id === userHiveId) return 1;
      return 0;
    });
  }, [hives, userHiveId]);

  return (
    <div className="min-h-screen bg-[#0a0d06] text-white pb-24 pt-24">
      {/* Toast */}
      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4">
          <div className={`px-4 py-2 rounded-full text-sm font-bold shadow-xl ${toast.type === "success" ? "bg-emerald-500 text-emerald-950" : "bg-rose-500 text-rose-950"}`}>
            {toast.message}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        
        {/* HERO */}
        <div className="mb-12 text-center md:text-left md:flex justify-between items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 mb-4">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">Intelligence Network</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight leading-none mb-2">
              Hive<br/>
              <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
                Command Center
              </span>
            </h1>
            <p className="text-slate-400 max-w-lg mt-4">
              Coordinate with your hive, claim territories, and dominate the map. Hive members earn bonus points on store purchases!
            </p>
          </div>

          <div className="flex gap-4 mt-8 md:mt-0">
            <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 backdrop-blur-xl text-center">
              <div className="text-2xl font-black text-white">{hives.length}</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Total Hives</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 backdrop-blur-xl text-center">
              <div className="text-2xl font-black text-cyan-400">{totalMembers}</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Active Members</div>
            </div>
            {!userHiveId && user && (
              <button 
                onClick={() => setShowCreateModal(true)}
                className="rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-6 font-black text-white hover:scale-105 transition shadow-[0_0_20px_rgba(6,182,212,0.3)]"
              >
                Create Hive
              </button>
            )}
          </div>
        </div>

        {/* MAP SECTION */}
        <div className="mb-16">
          <HiveMap 
            hives={hives} 
            onHiveClick={(id) => {
              setSelectedHiveId(id);
              document.getElementById(`hive-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            selectedHiveId={selectedHiveId}
            userHiveId={userHiveId}
          />
        </div>

        {/* HIVE GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedHives.map((hive) => {
            const isUserHive = userHiveId === hive.id;
            return (
              <div 
                id={`hive-${hive.id}`}
                key={hive.id}
                className={`relative flex flex-col rounded-[2.5rem] border bg-slate-900/40 backdrop-blur-xl shadow-2xl transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] p-6 overflow-hidden ${
                  isUserHive ? "border-amber-500/50" : "border-white/10"
                } ${selectedHiveId === hive.id ? "ring-2 ring-cyan-500 ring-offset-2 ring-offset-black" : ""}`}
              >
                {/* Header & Image */}
                <div className="relative h-32 -mx-6 -mt-6 mb-4 overflow-hidden rounded-t-[2.5rem] bg-black/40">
                  {hive.image_url ? (
                    <img src={hive.image_url} alt={hive.name} className="w-full h-full object-cover opacity-60" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-900 to-black opacity-80" />
                  )}
                  
                  <div className="absolute bottom-4 left-6 right-6 flex justify-between items-end">
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tight text-white drop-shadow-md">{hive.name}</h3>
                      <div className="text-sm text-slate-300 drop-shadow-md">{hive.map_label}</div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-black uppercase text-cyan-400 tracking-widest drop-shadow-md">Level {hive.level}</span>
                      <span className={`text-[9px] font-bold uppercase tracking-widest mt-1 drop-shadow-md ${
                        hive.status === 'active' ? 'text-emerald-400' : hive.status === 'under_attack' ? 'text-rose-400 animate-pulse' : 'text-amber-400'
                      }`}>
                        {hive.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                  
                  {isUserHive && (hive.owner_id === user?.discord_id) && (
                    <label className="absolute top-4 right-4 cursor-pointer rounded-lg bg-black/50 p-2 hover:bg-black/80 transition backdrop-blur-md">
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleImageUpload(hive.id, e.target.files[0]); }} />
                      <span className="text-xs font-bold text-white">{uploadingImage === hive.id ? "..." : "📷"}</span>
                    </label>
                  )}
                </div>

                {/* XP Bar */}
                <div className="mb-6">
                  <div className="h-1.5 w-full rounded-full bg-black/50 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400" style={{ width: `${(hive.xp / hive.next_reward_xp) * 100}%` }} />
                  </div>
                  <div className="text-right text-[10px] text-slate-500 mt-1">{hive.xp} / {hive.next_reward_xp} XP</div>
                </div>

                {/* Leader & Members */}
                <div className="mb-6 flex-1">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sm">👑</div>
                    <div className="text-sm font-bold text-white">{hive.owner_username}</div>
                  </div>
                  <div className="flex -space-x-2">
                    {hive.members.slice(0, 5).map((m) => (
                      <div key={m.discord_id} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[10px] text-white" title={m.username}>
                        {m.username.substring(0, 2).toUpperCase()}
                      </div>
                    ))}
                    {hive.members.length > 5 && (
                      <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[10px] text-slate-400">
                        +{hive.members.length - 5}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-white/10">
                  {isUserHive ? (
                    <button 
                      disabled={loadingAction[hive.id]}
                      onClick={() => handleAction(hive.id, "checkin")}
                      className="w-full rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 py-2.5 text-xs font-black uppercase tracking-widest hover:bg-cyan-500/20 transition disabled:opacity-50"
                    >
                      {loadingAction[hive.id] ? "..." : "Check In (+15 XP)"}
                    </button>
                  ) : !userHiveId && user ? (
                    <button 
                      disabled={loadingAction[hive.id]}
                      onClick={() => handleAction(hive.id, "support")}
                      className="w-full rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 py-2.5 text-xs font-black uppercase tracking-widest hover:bg-emerald-500/20 transition disabled:opacity-50"
                    >
                      {loadingAction[hive.id] ? "..." : "Join Hive"}
                    </button>
                  ) : !user ? (
                    <a href="/auth/discord/start?next=/hives" className="block text-center w-full rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 py-2.5 text-xs font-black uppercase tracking-widest hover:bg-indigo-500/20 transition">
                      Sign in to Join
                    </a>
                  ) : (
                    <button disabled className="w-full rounded-xl bg-white/5 text-slate-500 py-2.5 text-xs font-black uppercase tracking-widest opacity-50">
                      Already in a Hive
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2.5rem] border border-white/10 bg-slate-900 p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-6">Found a New Hive</h2>
            <form onSubmit={handleCreate}>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Hive Name</label>
                  <input required value={createForm.name} onChange={e=>setCreateForm({...createForm, name: e.target.value})} className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none" placeholder="e.g. Shadow Syndicate" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Territory Label</label>
                  <input value={createForm.mapLabel} onChange={e=>setCreateForm({...createForm, mapLabel: e.target.value})} className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white focus:border-cyan-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Map Position X ({createForm.mapX}%)</label>
                  <input type="range" min="0" max="100" value={createForm.mapX} onChange={e=>setCreateForm({...createForm, mapX: parseInt(e.target.value)})} className="w-full" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Map Position Y ({createForm.mapY}%)</label>
                  <input type="range" min="0" max="100" value={createForm.mapY} onChange={e=>setCreateForm({...createForm, mapY: parseInt(e.target.value)})} className="w-full" />
                </div>
              </div>
              <div className="mt-8 flex gap-3">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 rounded-xl bg-white/5 py-3 text-sm font-bold text-slate-300 hover:bg-white/10 transition">Cancel</button>
                <button type="submit" disabled={creating} className="flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 py-3 text-sm font-black text-white hover:scale-105 transition disabled:opacity-50">
                  {creating ? "Creating..." : "Create Hive"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
