"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { InventorySection } from "./inventory-section";
import { BetaSection } from "./beta-section";

type User = {
  discord_id: string;
  username?: string;
  avatar?: string | null;
};

const quickLinks = [
  { href: "/store",     emoji: "🛒", label: "Wipe Store",    desc: "Buy packs for the current wipe",      color: "border-indigo-400/25 bg-indigo-400/8 hover:bg-indigo-400/12" },
  { href: "/support",   emoji: "🎫", label: "Open Ticket",   desc: "Get help from staff via Discord",      color: "border-cyan-400/25 bg-cyan-400/8 hover:bg-cyan-400/12" },
  { href: "/support?subject=Prize+Claim+%E2%80%93+", emoji: "🏆", label: "Claim Prize",   desc: "Won something? Submit your claim here", color: "border-emerald-400/25 bg-emerald-400/8 hover:bg-emerald-400/12" },
  { href: "/rules",     emoji: "📋", label: "Server Rules",  desc: "Read the Once Human server rules",     color: "border-indigo-400/25 bg-indigo-400/8 hover:bg-indigo-400/12" },
  { href: "/community", emoji: "💬", label: "Community",     desc: "Live Discord feed & voice channels",   color: "border-cyan-400/25 bg-cyan-400/8 hover:bg-cyan-400/12" },
  { href: "/lottery",   emoji: "🎰", label: "Lottery",       desc: "Try your luck on the server lottery",  color: "border-emerald-400/25 bg-emerald-400/8 hover:bg-emerald-400/12" },
  { href: "/minigame",  emoji: "🐹", label: "Whack-a-Mole",  desc: "Play for a chance to win prizes",      color: "border-indigo-400/25 bg-indigo-400/8 hover:bg-indigo-400/12" },
  { href: "/streamers", emoji: "📺", label: "Streamers",     desc: "Watch community members live",         color: "border-cyan-400/25 bg-cyan-400/8 hover:bg-cyan-400/12" },
  { href: "/bans",      emoji: "🔨", label: "Ban List",      desc: "Public moderation record",             color: "border-rose-400/25 bg-rose-400/8 hover:bg-rose-400/12" },
];

const primaryQuickLinks = quickLinks.filter((link) =>
  ["/store", "/support", "/community", "/rules"].includes(link.href)
);

const inventoryPreviewRewards = [
  { name: "Defense Pack", tag: "Saved reward", detail: "Ready for next wipe delivery" },
  { name: "Wack-a-Mole Weapon Drop", tag: "48 hour timer", detail: "Claim, save, or open support" },
  { name: "Lottery Prize", tag: "Staff verified", detail: "Admin review before delivery" },
];

export default function DashboardClient({ 
  user, 
  msg 
}: { 
  user: User | null; 
  msg?: string;
}) {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(requestedTab === "bot" ? "overview" : requestedTab || "overview");
  const [uid, setUid] = useState("");
  const [savedUid, setSavedUid] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const isAdmin = Boolean(user && (user as any).isAdmin);

  useEffect(() => {
    if (user) {
      // Load UID
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

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [activeTab]);

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

  const tabs = [
    { id: "overview", label: "Overview", icon: "▣" },
    { id: "inventory", label: "Items & Store", icon: "🎒" },
    { id: "beta", label: "Beta Program", icon: "🧪" },
    ...(isAdmin ? [{ id: "admin", label: "Admin Panel", icon: "🛡️" }] : []),
  ];

  return (
    <div className="min-h-screen pb-20 pt-24 sm:pt-32">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-10">
          <div className="rz-chip mb-4 border-indigo-400/30 text-indigo-300 inline-block px-3 py-1 rounded-full border bg-indigo-400/5 text-xs font-black uppercase tracking-wider">
            ⚡ {activeTab === 'bot' ? "Bot Management" : "Player Dashboard"}
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight sm:text-5xl">
            {user ? (
              <>Welcome back, <span className="text-indigo-400">{user.username ?? "Survivor"}</span></>
            ) : (
              <>NewHope<span className="text-lime-400">GGN</span> <span className="text-orange-400">Dashboard</span></>
            )}
          </h1>
          <p className="mt-4 text-stone-400 text-lg max-w-2xl">
            {activeTab === 'bot' 
              ? "Manage server plugins, logging, and translation for your Discord communities."
              : "Manage your Once Human account, link your UID, and access server quick links."}
          </p>
        </div>

        {/* Tab Navigation or Login CTA */}
        {user ? (
          tabs.length > 1 && (
            <div className="flex gap-2 mb-10 overflow-x-auto pb-4 scrollbar-none">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`shrink-0 flex items-center gap-2.5 px-6 py-3 rounded-2xl text-sm font-black transition-all ${
                    activeTab === tab.id
                      ? "bg-white text-stone-950 shadow-xl shadow-white/10 italic"
                      : "bg-slate-900/40 text-stone-500 border border-white/5 hover:border-white/10 hover:text-stone-300"
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span className={activeTab === tab.id ? "block" : "hidden sm:block"}>
                    {tab.label}
                  </span>
                </button>
              ))}
            </div>
          )
        ) : (
          <div className="mb-6 p-6 sm:p-8 rounded-[2rem] border border-[#5865F2]/20 bg-[#5865F2]/5 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="h-16 w-16 rounded-2xl bg-[#5865F2]/20 flex items-center justify-center text-3xl">🛡️</div>
              <div>
                <h3 className="text-xl font-black text-white">Join NewHope<span className="text-lime-400">GGN</span></h3>
                <p className="text-sm text-stone-400">Connect with Discord to access your account features.</p>
              </div>
            </div>
            <a 
              href="/auth/discord/start" 
              className="w-full md:w-auto px-8 py-4 rounded-2xl bg-[#5865F2] hover:bg-[#4752c4] text-white font-black text-sm flex items-center justify-center gap-3 transition-all shadow-xl shadow-[#5865F2]/20 active:scale-95"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.419-2.157 2.419z"/></svg>
              Login with Discord
            </a>
          </div>
        )}

        {!user && (
          <div className="mb-10 overflow-hidden rounded-[2rem] border border-amber-400/20 bg-gradient-to-br from-amber-950/20 via-slate-950/70 to-slate-950/80">
            <div className="grid gap-0 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="border-b border-white/8 p-6 lg:border-b-0 lg:border-r">
                <div className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-300">Inventory Preview</div>
                <h2 className="mt-3 text-2xl font-black text-white">Your rewards land here after sign-in</h2>
                <p className="mt-3 text-sm leading-6 text-stone-400">
                  See saved packs, prize timers, and claim status before staff delivery.
                </p>
              </div>
              <div className="grid gap-3 p-4 sm:p-6">
                {inventoryPreviewRewards.map((reward) => (
                  <div key={reward.name} className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-black/30 p-4">
                    <div className="min-w-0">
                      <div className="truncate font-black text-white">{reward.name}</div>
                      <div className="mt-1 text-xs text-stone-500">{reward.detail}</div>
                    </div>
                    <span className="shrink-0 rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase text-amber-200">
                      {reward.tag}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {msg && (
          <div className="mb-8 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-300 backdrop-blur-md">
            {msg}
          </div>
        )}

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          {activeTab === "overview" && (
            <div className="space-y-8">
              {/* Account + UID section */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Account card */}
                <div className="relative rounded-[2rem] p-8 border border-indigo-500/15 bg-slate-900/40 backdrop-blur-xl shadow-2xl overflow-hidden group">
                  <div className="absolute -right-8 -top-8 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-700" />
                  
                  <div className="flex items-center gap-5 mb-8">
                    {user?.avatar ? (
                      <img src={user.avatar} alt="" className="h-16 w-16 rounded-2xl ring-4 ring-indigo-500/20 object-cover" />
                    ) : (
                      <div className="h-16 w-16 rounded-2xl bg-indigo-400/15 ring-4 ring-indigo-500/20 flex items-center justify-center text-indigo-400 text-2xl font-black">
                        {user?.username?.[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}
                    <div>
                      <div className="text-xl font-black text-white">{user?.username ?? "Guest"}</div>
                      <div className="text-sm font-bold text-stone-500">{user ? "Discord Connected" : "Not Signed In"}</div>
                    </div>
                  </div>

                  <div className="text-[10px] font-black uppercase tracking-[0.25em] text-stone-600 mb-4 flex items-center gap-2">
                    <span className="w-4 h-px bg-stone-700" /> Player Profile
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-black/20 border border-white/5">
                      <span className="text-stone-400 text-sm font-bold">Inventory</span>
                      <span className="text-indigo-300 text-sm font-black">{user ? "Unlocked" : "Sign in required"}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-black/20 border border-white/5">
                      <span className="text-stone-400 text-sm font-bold">Account Level</span>
                      <span className={`${(user as any)?.isAdmin ? "text-rose-400" : "text-indigo-400"} text-sm font-black`}>
                        {(user as any)?.isAdmin ? "Administrator" : user ? "Standard Member" : "Guest"}
                      </span>
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
                <div className="relative rounded-[2rem] p-8 border border-cyan-500/15 bg-slate-900/40 backdrop-blur-xl shadow-2xl overflow-hidden group">
                  <div className="absolute -right-8 -top-8 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl group-hover:bg-cyan-500/20 transition-all duration-700" />
                  
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
                      className="h-12 w-full rounded-2xl border border-white/10 bg-black/40 px-5 text-sm text-white outline-none placeholder:text-stone-700 focus:border-cyan-400/40 transition-all shadow-inner"
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
                          ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-500/20 active:scale-95" 
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
                </div>
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
          )}

          {activeTab === "beta" && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
               <BetaSection />
            </div>
          )}

          {activeTab === "inventory" && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
               <InventorySection />
            </div>
          )}

          {activeTab === "admin" && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
               <div className="rounded-[2.5rem] border border-rose-500/20 bg-rose-500/5 p-12 text-center">
                 <div className="text-5xl mb-6">🛡️</div>
                 <h2 className="text-3xl font-black text-white mb-4">Staff Operations Control</h2>
                 <p className="text-slate-400 max-w-md mx-auto mb-8">
                   Access the global platform management suite. This area is for authorized GGN staff only.
                 </p>
                 <Link 
                   href="/admin" 
                   className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-rose-500 text-white font-black hover:bg-rose-400 transition transform active:scale-95 shadow-xl shadow-rose-500/20"
                 >
                   Enter Admin Suite
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                 </Link>
               </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
