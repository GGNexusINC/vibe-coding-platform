"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { InventorySection } from "./inventory-section";

type User = {
  discord_id: string;
  username?: string;
  avatar?: string | null;
};

const quickLinks = [
  { href: "/store",     emoji: "🛒", label: "Wipe Store",    desc: "Buy packs for the current wipe",      color: "border-orange-400/25 bg-orange-400/8 hover:bg-orange-400/12" },
  { href: "/support",   emoji: "🎫", label: "Open Ticket",   desc: "Get help from staff via Discord",      color: "border-blue-400/25 bg-blue-400/8 hover:bg-blue-400/12" },
  { href: "/support?subject=Prize+Claim+%E2%80%93+", emoji: "🏆", label: "Claim Prize",   desc: "Won something? Submit your claim here", color: "border-amber-400/25 bg-amber-400/8 hover:bg-amber-400/12" },
  { href: "/rules",     emoji: "📋", label: "Server Rules",  desc: "Read the Once Human server rules",     color: "border-lime-400/25 bg-lime-400/8 hover:bg-lime-400/12" },
  { href: "/community", emoji: "💬", label: "Community",     desc: "Live Discord feed & voice channels",   color: "border-purple-400/25 bg-purple-400/8 hover:bg-purple-400/12" },
  { href: "/lottery",   emoji: "🎰", label: "Lottery",       desc: "Try your luck on the server lottery",  color: "border-yellow-400/25 bg-yellow-400/8 hover:bg-yellow-400/12" },
  { href: "/minigame",  emoji: "🐹", label: "Whack-a-Mole",  desc: "Play for a chance to win prizes",      color: "border-pink-400/25 bg-pink-400/8 hover:bg-pink-400/12" },
  { href: "/streamers", emoji: "📺", label: "Streamers",     desc: "Watch community members live",         color: "border-rose-400/25 bg-rose-400/8 hover:bg-rose-400/12" },
  { href: "/bans",      emoji: "🔨", label: "Ban List",      desc: "Public moderation record",             color: "border-red-400/25 bg-red-400/8 hover:bg-red-400/12" },
];

const primaryQuickLinks = quickLinks.filter((link) =>
  ["/store", "/support", "/community", "/rules"].includes(link.href)
);

export default function DashboardClient({ 
  user, 
  msg 
}: { 
  user: User | null; 
  msg?: string;
}) {
  const [uid, setUid] = useState("");
  const [savedUid, setSavedUid] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");

  useEffect(() => {
    if (user) {
      fetch("/api/user/uid")
        .then(r => r.json())
        .then(d => {
          if (d.ok && d.uid) {
            setUid(d.uid);
            setSavedUid(d.uid);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const handleSaveUid = async () => {
    if (!uid.trim()) return;
    setSaving(true);
    setSaveStatus("");
    try {
      const res = await fetch("/api/user/uid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: uid.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setSavedUid(uid.trim());
        setSaveStatus("✓ UID saved successfully");
      } else {
        setSaveStatus("❌ Error: " + (data.error || "Unknown error"));
      }
    } catch {
      setSaveStatus("❌ Network error saving UID");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 pt-24 sm:pt-32">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-10">
          <div className="rz-chip mb-4 border-orange-400/30 text-orange-300 inline-block px-3 py-1 rounded-full border bg-orange-400/5 text-xs font-black uppercase tracking-wider">
            ⚡ Player Dashboard
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight sm:text-5xl">
            {user ? (
              <>Welcome back, <span className="text-orange-400">{user.username ?? "Survivor"}</span></>
            ) : (
              <>NewHopeGGN <span className="text-orange-400">Dashboard</span></>
            )}
          </h1>
          <p className="mt-4 text-stone-400 text-lg max-w-2xl">
            Manage your Once Human account, link your UID, and access server quick links.
          </p>
        </div>

        {msg && (
          <div className="mb-8 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-300 backdrop-blur-md">
            {msg}
          </div>
        )}

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
          {/* Account + UID section */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Account card */}
            <div className="relative rounded-[2rem] p-8 border border-orange-500/15 bg-slate-900/40 backdrop-blur-xl shadow-2xl overflow-hidden group">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl group-hover:bg-orange-500/20 transition-all duration-700" />
              
              <div className="flex items-center gap-5 mb-8">
                {user?.avatar ? (
                  <img src={user.avatar} alt="" className="h-16 w-16 rounded-2xl ring-4 ring-orange-500/20 object-cover" />
                ) : (
                  <div className="h-16 w-16 rounded-2xl bg-orange-400/15 ring-4 ring-orange-500/20 flex items-center justify-center text-orange-400 text-2xl font-black">
                    {user?.username?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <div>
                  <div className="text-xl font-black text-white">{user?.username ?? "Guest"}</div>
                  <div className="text-sm font-bold text-stone-500">{user ? "Discord Connected" : "Not Signed In"}</div>
                </div>
                {user && (
                   <div className="ml-auto rounded-full px-3 py-1 text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Live
                  </div>
                )}
              </div>

              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-stone-600 mb-4 flex items-center gap-2">
                <span className="w-4 h-px bg-stone-700" /> Player Profile
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-black/20 border border-white/5">
                  <span className="text-stone-400 text-sm font-bold">Discord ID</span>
                  <span className="font-mono text-stone-200 text-sm">{user?.discord_id || "—"}</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-black/20 border border-white/5">
                  <span className="text-stone-400 text-sm font-bold">Account Level</span>
                  <span className="text-orange-400 text-sm font-black">{user ? "Standard Member" : "Guest"}</span>
                </div>
              </div>

              {user && (
                <form action="/auth/sign-out?next=/" method="POST" className="mt-8 pt-4 border-t border-white/5 text-right">
                  <button type="submit" className="text-xs font-black uppercase tracking-widest text-stone-500 hover:text-rose-400 transition">
                    Sign Out →
                  </button>
                </form>
              )}
            </div>

            {/* UID Card */}
            <div className="relative rounded-[2rem] p-8 border border-lime-500/15 bg-slate-900/40 backdrop-blur-xl shadow-2xl overflow-hidden group">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-lime-500/10 rounded-full blur-3xl group-hover:bg-lime-500/20 transition-all duration-700" />
              
              <div className="flex items-center gap-5 mb-8">
                <div className="h-16 w-16 rounded-2xl bg-lime-400/15 ring-4 ring-lime-500/20 flex items-center justify-center text-3xl">🆔</div>
                <div>
                  <div className="text-xl font-black text-white">In-Game Link</div>
                  <div className="text-sm font-bold text-stone-500">Essential for store purchases</div>
                </div>
              </div>

              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-stone-600 mb-4 flex items-center gap-2">
                <span className="w-4 h-px bg-stone-700" /> Global UID
              </div>
              
              <div className="flex flex-col gap-3">
                <input
                  className="h-12 w-full rounded-2xl border border-white/10 bg-black/40 px-5 text-sm text-white outline-none placeholder:text-stone-700 focus:border-lime-400/40 transition-all shadow-inner"
                  placeholder="Paste your 10-digit Once Human UID"
                  value={uid}
                  onChange={(e) => setUid(e.target.value)}
                  disabled={!user || saving}
                />
                <button
                  onClick={handleSaveUid}
                  disabled={!user || saving || !uid.trim()}
                  className={`h-12 w-full rounded-2xl text-sm font-black transition-all shadow-lg ${
                    user && uid.trim() 
                      ? "bg-lime-500 text-stone-950 hover:bg-lime-400 shadow-lime-500/20 active:scale-95" 
                      : "bg-stone-800 text-stone-600 cursor-not-allowed"
                  }`}
                >
                  {saving ? "Processing..." : "Link Account"}
                </button>
              </div>
              
              {saveStatus && (
                <p className={`mt-3 text-center text-xs font-bold ${saveStatus.startsWith("✓") ? "text-emerald-400" : "text-rose-400"}`}>
                  {saveStatus}
                </p>
              )}
              {!user && <p className="mt-4 text-center text-xs font-bold text-stone-600">Please sign in with Discord to link your game UID.</p>}
            </div>
          </div>

          {/* Inventory Section */}
          <div>
            {user ? (
              <InventorySection />
            ) : (
              <div className="relative rounded-[2.5rem] border border-teal-500/15 bg-slate-900/30 overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent pointer-events-none" />
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-10 py-10 border-b border-white/5">
                  <div className="text-center sm:text-left">
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-teal-400 mb-2">Member Assets</div>
                    <h2 className="text-2xl font-black text-white">Item Inventory</h2>
                    <p className="mt-2 text-stone-500 text-sm max-w-sm font-medium">Access your purchased packs, VIP bonuses, and seasonal rewards in one unified interface.</p>
                  </div>
                  <a
                    href="/auth/discord/start?next=/dashboard"
                    className="shrink-0 flex items-center justify-center px-8 py-3.5 rounded-2xl bg-white text-stone-950 text-sm font-black hover:bg-stone-200 transition-all shadow-2xl active:scale-95"
                  >
                    Login to Unlock
                  </a>
                </div>
                <div className="relative px-10 py-10">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 opacity-20 grayscale blur-[4px] pointer-events-none select-none">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <div key={i} className="h-24 rounded-3xl border border-white/5 bg-white/5" />
                    ))}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-slate-950/90 border border-white/10 rounded-[2rem] px-10 py-8 text-center backdrop-blur-xl shadow-3xl">
                      <div className="text-4xl mb-4">🔐</div>
                      <div className="text-lg font-black text-white italic">Authorization Required</div>
                      <p className="mt-2 text-stone-400 text-sm max-w-[200px] mx-auto font-medium">Connect your Discord account to synchronize your game inventory.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Access */}
          <div className="relative rounded-[2.5rem] p-10 border border-white/5 bg-slate-900/20">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-600 mb-8 flex items-center gap-2">
              <span className="w-8 h-px bg-stone-800" /> System Portals
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {primaryQuickLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative rounded-3xl border p-6 transition-all duration-300 hover:-translate-y-1 ${item.color}`}
                >
                  <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">{item.emoji}</div>
                  <div className="text-base font-black text-white group-hover:text-orange-100">{item.label}</div>
                  <div className="text-xs text-stone-500 mt-2 font-medium leading-relaxed group-hover:text-stone-400 transition-colors">{item.desc}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
