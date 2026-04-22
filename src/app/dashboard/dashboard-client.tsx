"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { InventorySection } from "./inventory-section";
import { BotSection } from "./bot-section";

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
  msg,
  isAdmin = false 
}: { 
  user: User | null; 
  msg?: string;
  isAdmin?: boolean;
}) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "bot" && isAdmin ? "bot" : "player";
  const [activeTab, setActiveTab] = useState<"player" | "bot">(initialTab);
  
  const [uid, setUid] = useState("");
  const [savedUid, setSavedUid] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");

  // Load existing UID on mount
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

  async function handleSaveUid() {
    if (!uid.trim()) {
      setSaveStatus("Please enter a UID");
      return;
    }
    setSaving(true);
    setSaveStatus("");
    
    const res = await fetch("/api/user/uid", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ uid: uid.trim() }),
    });
    
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    
    if (res.ok) {
      setSavedUid(uid.trim());
      setSaveStatus("✓ UID saved!");
      setTimeout(() => setSaveStatus(""), 3000);
    } else {
      setSaveStatus(data?.error || "Failed to save UID");
    }
  }

  return (
    <div className="relative mx-auto w-full max-w-6xl px-4 py-10">
      {/* Futuristic HUD background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(249,115,22,0.10),transparent_42%),radial-gradient(circle_at_80%_80%,rgba(132,204,22,0.07),transparent_40%)]" />
      <div className="pointer-events-none absolute inset-0 rz-grid opacity-20" />
      <div className="pointer-events-none absolute inset-0" style={{backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.08) 2px,rgba(0,0,0,0.08) 4px)",backgroundSize:"100% 4px"}} />
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/60 to-transparent" />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-lime-500/40 to-transparent" />

      <div className="relative">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
          <div>
            <div className={`rz-chip mb-4 ${activeTab === 'bot' ? 'border-[#5865F2]/30 text-indigo-300' : 'border-orange-400/30 text-orange-300'}`}>
              ⚡ {activeTab === "player" ? "Player" : "Bot"} Dashboard
            </div>
            <h1 className="text-3xl font-black text-white leading-tight">
              {user ? (
                <>Welcome back, <span className="text-orange-400">{user.username ?? "Survivor"}</span></>
              ) : (
                <>NewHopeGGN <span className="text-orange-400">Dashboard</span></>
              )}
            </h1>
            <p className="mt-1 text-stone-400 text-sm">
              {activeTab === "player" 
                ? "Manage your account, UID, and server access." 
                : "Configure your translation bot and monitor status."}
            </p>
          </div>

          {/* Tab Selectors */}
          <div className="flex bg-slate-900/40 p-1.5 rounded-2xl border border-white/5 gap-1.5">
            <button
              onClick={() => setActiveTab("player")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all ${
                activeTab === "player" ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span>🎮</span> Once Human
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab("bot")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all ${
                  activeTab === "bot" ? "bg-[#5865F2] text-white shadow-lg shadow-[#5865F2]/20" : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span>🤖</span> Bot Control
              </button>
            )}
          </div>
        </div>

        {msg && (
          <div className="mb-6 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {msg}
          </div>
        )}

        {/* ── Tab Content ── */}
        {activeTab === "player" ? (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* ── Account + UID ── */}
            <div className="grid gap-4 lg:grid-cols-2 mb-8">
              {/* Account card */}
              <div className="relative rz-surface rounded-2xl p-6 border border-orange-500/20 shadow-[0_0_30px_rgba(249,115,22,0.06)] overflow-hidden">
                <div className="pointer-events-none absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-orange-400/50 rounded-tl-2xl" />
                <div className="pointer-events-none absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-orange-400/50 rounded-tr-2xl" />
                <div className="pointer-events-none absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-orange-400/50 rounded-bl-2xl" />
                <div className="pointer-events-none absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-orange-400/50 rounded-br-2xl" />

                <div className="flex items-center gap-3 mb-4">
                  {user?.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatar} alt="" className="h-10 w-10 rounded-full ring-2 ring-orange-400/40 object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-orange-400/20 ring-2 ring-orange-400/40 flex items-center justify-center text-orange-300 font-bold">
                      {user?.username?.[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-bold text-white">{user?.username ?? "Guest"}</div>
                    <div className="text-xs text-stone-500">{user ? "Discord connected" : "Not signed in"}</div>
                  </div>
                  {user && (
                    <div className="ml-auto rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                      Active
                    </div>
                  )}
                </div>

                <div className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-stone-500 mb-3">▶ PLAYER::INFO</div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400">Discord ID</span>
                    <span className="font-mono text-stone-300">{user?.discord_id ? user.discord_id.slice(0, 8) + "..." : "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400">Status</span>
                    <span className={user ? "text-emerald-400" : "text-amber-400"}>{user ? "Verified" : "Guest"}</span>
                  </div>
                </div>

                {user && (
                  <div className="mt-4 flex items-center justify-between">
                    <form action="/auth/sign-out?next=/" method="POST">
                      <button
                        type="submit"
                        className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition"
                      >
                        Sign out →
                      </button>
                    </form>
                  </div>
                )}
              </div>

              {/* UID card */}
              <div className="relative rz-surface rounded-2xl p-6 border border-lime-500/20 shadow-[0_0_30px_rgba(132,204,22,0.05)] overflow-hidden">
                <div className="pointer-events-none absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-lime-400/50 rounded-tl-2xl" />
                <div className="pointer-events-none absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-lime-400/50 rounded-tr-2xl" />
                <div className="pointer-events-none absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-lime-400/50 rounded-bl-2xl" />
                <div className="pointer-events-none absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-lime-400/50 rounded-br-2xl" />

                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-orange-400/20 flex items-center justify-center text-lg">🆔</div>
                  <div>
                    <div className="text-sm font-bold text-white">In-Game UID</div>
                    <div className="text-xs text-stone-500">Required before purchasing any pack</div>
                  </div>
                  <div className="ml-auto rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide bg-amber-500/15 text-amber-400 border border-amber-500/25">
                    {savedUid ? "Saved" : "Required"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    className="h-9 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-stone-600 focus:border-orange-400/40 transition"
                    placeholder="Enter your Once Human UID"
                    value={uid}
                    onChange={(e) => setUid(e.target.value)}
                    disabled={!user || saving}
                  />
                  <button
                    onClick={handleSaveUid}
                    disabled={!user || saving || !uid.trim()}
                    className={`h-9 shrink-0 rounded-xl px-4 text-sm font-bold transition ${
                      user && uid.trim() 
                        ? "bg-orange-500 text-stone-950 hover:bg-orange-400" 
                        : "bg-stone-700 text-stone-500 cursor-not-allowed"
                    }`}
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
                {saveStatus && (
                  <p className={`mt-2 text-xs ${saveStatus.startsWith("✓") ? "text-emerald-400" : "text-rose-400"}`}>
                    {saveStatus}
                  </p>
                )}
                {!user && <p className="mt-2 text-xs text-stone-600">Sign in first to save your UID.</p>}
              </div>
            </div>

            {/* ── Inventory ── */}
            {user ? (
              <div className="mb-8">
                <InventorySection />
              </div>
            ) : (
              <div className="mb-8 rounded-[2rem] border border-teal-500/20 bg-slate-950/60 overflow-hidden relative">
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(20,184,166,0.04),transparent_60%)]" />
                <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-7 pt-6 pb-4 border-b border-teal-500/10">
                  <div>
                    <div className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-stone-500 mb-1">▶ PLAYER::INVENTORY</div>
                    <div className="text-sm font-bold text-white">Member Inventory</div>
                    <p className="mt-1 text-xs text-slate-500 max-w-sm">Your packs, VIP perks, and wipe items — tracked per season.</p>
                  </div>
                  <a
                    href="/auth/discord/start?next=/dashboard"
                    className="shrink-0 inline-flex h-10 items-center gap-2 rounded-full bg-[linear-gradient(135deg,#f97316,#fbbf24)] px-5 text-sm font-bold text-stone-950 transition hover:scale-[1.02] shadow-[0_0_20px_rgba(249,115,22,0.35)]"
                  >
                    Sign in with Discord
                  </a>
                </div>
                <div className="relative px-7 py-5">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 blur-[3px] opacity-40 pointer-events-none select-none">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <div key={i} className="h-16 rounded-xl border border-white/5 bg-slate-800/40" />
                    ))}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/90 px-8 py-5 backdrop-blur-sm text-center">
                      <div className="text-2xl">🔐</div>
                      <div className="text-sm font-bold text-white">Inventory Locked</div>
                      <Link href="/auth/discord/start?next=/dashboard" className="mt-2 text-xs font-bold text-teal-400 hover:underline">Sign in to unlock →</Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Quick access ── */}
            <div className="relative rz-surface rounded-2xl p-6 border border-white/8 overflow-hidden">
              <div className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />
              <div className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-stone-500 mb-4">▶ SYS::QUICK_ACCESS</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {primaryQuickLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group rounded-xl border p-4 transition-all ${item.color}`}
                  >
                    <div className="text-2xl mb-2">{item.emoji}</div>
                    <div className="text-sm font-bold text-white group-hover:text-orange-100 transition">{item.label}</div>
                    <div className="text-xs text-stone-500 mt-0.5 leading-relaxed">{item.desc}</div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <BotSection />
        )}
      </div>
    </div>
  );
}
