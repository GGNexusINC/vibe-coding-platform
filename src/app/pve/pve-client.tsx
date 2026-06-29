"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { TicketChat } from "@/app/support/ticket-chat";

type User = {
  discord_id: string;
  username?: string;
  avatar?: string | null;
  isAdmin?: boolean;
};

type TicketItem = {
  id: string;
  subject: string;
  status: string;
  created_at: string;
};

export function PveClient({ 
  user,
  storePackages,
  pveRules 
}: { 
  user: User | null; 
  storePackages?: any[] | null;
  pveRules?: any[] | null;
}) {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab") || "server";
  const [activeTab, setActiveTab] = useState(requestedTab);

  const DEFAULT_PVE_RULES = [
    { id: "01", emoji: "🛣️", title: "Base Placement & Roadways", copy: "Base building must keep public roads, paths, and bridges completely clear. Do not construct bases directly blocking natural resource spawn clusters or dungeons. Maintain a minimum buffer of 100 meters from neighbors." },
    { id: "02", emoji: "🛒", title: "Economy & Vending Etiquette", copy: "Player vendors are strictly limited to designated trade markets or personal territories. Selling quest items or anomalous items at hyper-inflated prices is discouraged. Advertising vendors in general chat is limited to once every 15 minutes." },
    { id: "03", emoji: "⚔️", title: "World Events & Boss Raids", copy: "Triggering Prime Wars should be coordinated with regional chats. Let all waiting players join the raid team before beginning silo dungeons. Griefing or trolling team compositions inside raids will result in a ban." },
    { id: "04", emoji: "🤝", title: "General Interaction & Fair Play", copy: "Safe-zone containers should be left unlocked if empty or containing junk. No exploiting structural base mechanics to block monster pathfinding. Submit bugs and rule breakers directly to staff via the Live Support tab." }
  ];

  const activeRules = pveRules && pveRules.length > 0 ? pveRules : DEFAULT_PVE_RULES;

  // Sync state with URL search param
  useEffect(() => {
    setActiveTab(requestedTab);
  }, [requestedTab]);

  // Wipe Timer States
  const [wipeMs, setWipeMs] = useState<number | null>(null);
  const [wipeLabel, setWipeLabel] = useState("PvE Season Reset");
  const [now, setNow] = useState(Date.now());

  // Dashboard States
  const [uid, setUid] = useState("");
  const [savedUid, setSavedUid] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [userInventory, setUserInventory] = useState<any[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);

  const defaultProducts = [
    { slug: "construction", name: "Construction Package", storeType: "pve" },
    { slug: "defense", name: "Defense Package", storeType: "pve" },
    { slug: "tactical", name: "Tactical Package", storeType: "pvp" },
    { slug: "insurance", name: "Anti Raid Insurance", storeType: "pve" },
  ];

  const pveInventory = userInventory.filter((item: any) => {
    const matchingPack = (storePackages && storePackages.length > 0 ? storePackages : defaultProducts)
      .find((p: any) => p.slug === item.item_slug);
    
    if (matchingPack) {
      return matchingPack.storeType === "pve";
    }

    const nameLower = (item.item_name || "").toLowerCase();
    const slugLower = (item.item_slug || "").toLowerCase();

    // Strict inclusion check: must explicitly mention PvE keywords to avoid PvP items leaking
    const isPve = nameLower.includes("pve") || slugLower.includes("pve") ||
                  nameLower.includes("construction") || slugLower.includes("construction") ||
                  nameLower.includes("defense") || slugLower.includes("defense") ||
                  nameLower.includes("insurance") || slugLower.includes("insurance");

    return isPve;
  });

  // Support States
  const [subject, setSubject] = useState("");
  const [inGameName, setInGameName] = useState("");
  const [message, setMessage] = useState("");
  const [supportStatus, setSupportStatus] = useState("");
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [activeTicket, setActiveTicket] = useState<{ id: string; channelId: string } | null>(null);

  useEffect(() => {
    // Tick wipe timer
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  // Fetch wipe timer
  useEffect(() => {
    fetch("/api/admin/pve-wipe-timer", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.wipeAt) {
          setWipeMs(new Date(d.wipeAt).getTime());
          setWipeLabel(d.label ?? "PvE Season Reset");
        }
      })
      .catch(() => {});
  }, []);

  // Fetch UID on load if user is signed in
  useEffect(() => {
    if (user && activeTab === "dashboard") {
      fetch("/api/user/uid")
        .then((r) => r.json())
        .then((d) => {
          if (d.ok && d.uid) {
            setUid(d.uid);
            setSavedUid(d.uid);
          }
        })
        .catch(() => {});

      // Load inventory
      setLoadingInventory(true);
      fetch("/api/inventory")
        .then((r) => r.json())
        .then((d) => {
          if (d.ok && Array.isArray(d.items)) {
            setUserInventory(d.items);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingInventory(false));
    }
  }, [user, activeTab]);

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

  const submitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingTicket) return;
    setSubmittingTicket(true);
    setSupportStatus("");

    try {
      const res = await fetch("/api/support/ticket", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subject, message, inGameName, isBrawlEvent: false, isPveRelated: true }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSupportStatus(data?.error ?? "Could not submit ticket.");
        setSubmittingTicket(false);
        return;
      }

      setSubject("");
      setInGameName("");
      setMessage("");
      setSupportStatus(data?.message || "Ticket submitted!");

      if (data?.ticketId && data?.channelId) {
        setActiveTicket({ id: data.ticketId, channelId: data.channelId });
      }
    } catch (err) {
      setSupportStatus("Network error submitting ticket.");
    } finally {
      setSubmittingTicket(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden text-slate-200 pb-20 pt-8">
      {/* Background aesthetics matching forest theme */}
      <div className="pointer-events-none absolute inset-0 rz-bg opacity-20 rz-drift" />
      <div className="pointer-events-none absolute inset-0 rz-grid opacity-10" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#061e14]/50 via-[#030a08]/90 to-slate-950" />
      <div className="pointer-events-none absolute -left-40 top-10 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute right-[-6rem] top-36 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl" />

      <section className="relative mx-auto w-full max-w-5xl px-4 pt-16">
        {/* Banner header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="rz-chip border-emerald-500/30 bg-emerald-500/10 text-emerald-300 before:bg-emerald-400">PvE Operations Portal</div>
          <h1 className="mt-6 font-[family:var(--font-brand-display)] text-4xl font-black uppercase tracking-[0.06em] text-white sm:text-5xl">
            Once Human <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">PvE Realm</span>
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            Welcome to the dedicated space for the Nexus Vitalis PvE community. Link your profile, open tickets, and view realm guidelines here.
          </p>
        </div>

        {/* Dynamic sub-tab switcher */}
        <div className="flex gap-2 justify-center mb-10 border-b border-emerald-950/40 pb-4 overflow-x-auto scrollbar-none">
          {[
            { id: "server", label: "Server Info", icon: "🌐" },
            { id: "dashboard", label: "PvE Dashboard", icon: "⚡" },
            { id: "support", label: "Live Support", icon: "🎫" },
            { id: "rules", label: "Realm Rules", icon: "📋" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all uppercase tracking-wider ${
                activeTab === tab.id
                  ? "bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/15"
                  : "bg-slate-900/40 text-slate-400 border border-white/5 hover:border-emerald-500/20 hover:text-white"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab 1: Server Info */}
        {activeTab === "server" && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-3 duration-500">
            {/* Wipe Countdown Timer Banner */}
            {wipeMs ? (() => {
              const ms = wipeMs - now;
              const past = ms <= 0;
              const abs = Math.abs(ms);
              const d = Math.floor(abs / 86400000);
              const h = Math.floor((abs % 86400000) / 3600000);
              const m = Math.floor((abs % 3600000) / 60000);
              const s = Math.floor((abs % 60000) / 1000);
              const pad = (n: number) => String(n).padStart(2, "0");
              const display = `${pad(d)}d : ${pad(h)}h : ${pad(m)}m : ${pad(s)}s`;
              return (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 backdrop-blur-xl shadow-[0_0_50px_-10px_rgba(16,185,129,0.15)] flex flex-col md:flex-row items-center justify-between gap-6 max-w-4xl mx-auto">
                  <div className="flex items-center gap-4 text-left">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-2xl">⏳</div>
                    <div>
                      <div className="text-lg font-black tracking-tight text-emerald-100 uppercase">{wipeLabel}</div>
                      <div className="text-sm text-slate-400 font-medium">Secure your wipe packs and build plans before the next seasonal shift.</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center md:items-end gap-1">
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">Season starts in</div>
                    <div className="font-mono text-3xl font-black text-emerald-300 tabular-nums drop-shadow-[0_0_15px_rgba(52,211,153,0.4)]">{past ? "00d : 00h : 00m : 00s" : display}</div>
                  </div>
                </div>
              );
            })() : (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 backdrop-blur-xl shadow-[0_0_30px_-10px_rgba(16,185,129,0.08)] flex flex-col md:flex-row items-center justify-between gap-6 max-w-4xl mx-auto">
                <div className="flex items-center gap-4 text-left">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-2xl">🛡️</div>
                  <div>
                    <div className="text-lg font-black tracking-tight text-emerald-100 uppercase">Season Status: Stable & Active</div>
                    <div className="text-sm text-slate-400 font-medium">No Wipe Scheduled. The PvE server wipe cycle will only happen when announced by Admins.</div>
                  </div>
                </div>
                <div className="flex flex-col items-center md:items-end gap-1">
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">Next Season Reset</div>
                  <div className="font-mono text-lg font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-4 py-1.5 rounded-lg border border-emerald-500/20">Pending Admin Call</div>
                </div>
              </div>
            )}

            {/* Server specifications grid */}
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { title: "EXP Rate", value: "2x Boost", desc: "Enjoy a speedier level progression to dive straight into endgame dungeons.", emoji: "⚡" },
                { title: "Gathering Yield", value: "2x Yield", desc: "Spend less time grinding resources. Stone, wood, and iron gathering speeds are doubled.", emoji: "🪵" },
                { title: "World Difficulty", value: "Hard Mode", desc: "Dungeons, bosses, and Prime Wars feature increased difficulty for maximum cooperative challenge.", emoji: "💀" }
              ].map((spec) => (
                <div key={spec.title} className="rounded-2xl border border-white/5 bg-slate-900/40 p-6 text-left hover:border-emerald-500/20 transition duration-300 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 opacity-10 bg-emerald-500 rounded-full blur-2xl group-hover:opacity-20 transition" />
                  <span className="text-3xl">{spec.emoji}</span>
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mt-4">{spec.title}</h3>
                  <div className="text-2xl font-black text-white mt-1 uppercase tracking-tight">{spec.value}</div>
                  <p className="text-xs text-slate-400 mt-2 font-medium leading-relaxed">{spec.desc}</p>
                </div>
              ))}
            </div>

            {/* Connection / specs card layout */}
            <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
              {/* Guidelines summary */}
              <div className="rounded-2xl border border-white/10 bg-slate-900/30 p-8 text-left">
                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">PvE Server Specs</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-6">
                  Nexus Vitalis [PvE] is geared toward cooperative PvE base protection, deviant farming, and guild collaboration.
                </p>
                <div className="space-y-4">
                  {[
                    { t: "Co-op Raid Buffs", d: "Increased rewards and mod drop rates inside Prime Wars and dungeon silos." },
                    { t: "Build Territories", d: "Expanded building territories (additional structure modules unlocked per base)." },
                    { t: "Stable Trading Zones", d: "Dedicated server economy zones at teleport towers with zero taxes." }
                  ].map((x, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="text-emerald-400 text-sm">✓</span>
                      <div>
                        <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider">{x.t}</h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">{x.d}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Connection Details */}
              <div className="rounded-2xl border border-white/10 bg-slate-900/30 p-8 text-left">
                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-4">How to Connect</h3>
                <div className="space-y-3 bg-black/40 p-5 rounded-xl border border-white/5 font-mono text-xs mb-6">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-500 uppercase">Realm:</span>
                    <span className="text-emerald-400 font-bold">Nexus Vitalis [PvE]</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-slate-500 uppercase">Region:</span>
                    <span className="text-slate-300">North America (NA)</span>
                  </div>
                  <div className="flex justify-between pb-1">
                    <span className="text-slate-500 uppercase">Status:</span>
                    <span className="text-emerald-400 font-bold animate-pulse">Online</span>
                  </div>
                </div>
                <Link
                  href="/store?tab=pve"
                  className="flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-xs font-black text-white hover:scale-[1.02] shadow-[0_0_20px_rgba(16,185,129,0.2)] transition uppercase tracking-wider"
                >
                  🛒 Get PvE Wipe Packs
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Dashboard */}
        {activeTab === "dashboard" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500 text-left">
            {user ? (
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Profile Details Card */}
                  <div className="relative rounded-2xl p-6 border border-emerald-500/15 bg-slate-900/40 backdrop-blur-xl">
                    <div className="flex items-center gap-4 mb-6">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt=""
                          className="h-14 w-14 rounded-xl ring-2 ring-emerald-500/20 object-cover"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 text-lg font-black uppercase">
                          {user.username?.[0] ?? "?"}
                        </div>
                      )}
                      <div>
                        <div className="text-lg font-black text-white">{user.username ?? "Survivor"}</div>
                        <div className="text-xs font-bold text-slate-500">Once Human PvE Account</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5 text-xs">
                        <span className="text-slate-400 font-semibold">Account Type</span>
                        <span className={`font-black uppercase tracking-wider ${user.isAdmin ? "text-rose-400" : "text-emerald-400"}`}>
                          {user.isAdmin ? "Administrator" : "PvE Player"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5 text-xs">
                        <span className="text-slate-400 font-semibold">Portal Sync</span>
                        <span className="text-emerald-400 font-bold">Discord Connected</span>
                      </div>
                    </div>

                    <form action="/auth/sign-out?next=/pve" method="POST" className="mt-6 text-right">
                      <button type="submit" className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-rose-400 transition">
                        Sign Out Account →
                      </button>
                    </form>
                  </div>

                  {/* Account Link Form */}
                  <div className="relative rounded-2xl p-6 border border-emerald-500/15 bg-slate-900/40 backdrop-blur-xl">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="h-14 w-14 rounded-xl bg-emerald-500/10 flex items-center justify-center text-2xl">🆔</div>
                      <div>
                        <h3 className="text-base font-black text-white">In-Game Link</h3>
                        <p className="text-xs text-slate-500">Provide UID to receive wipe delivery</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <input
                        className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-xs text-white outline-none placeholder:text-slate-700 focus:border-emerald-400/40 transition-all font-mono"
                        placeholder="Paste Once Human UID (10 digits)"
                        value={uid}
                        onChange={(e) => setUid(e.target.value)}
                        disabled={saving}
                      />
                      <button
                        onClick={handleSaveUid}
                        disabled={saving || !uid.trim()}
                        className={`h-11 w-full rounded-xl text-xs font-black transition-all uppercase tracking-wider ${
                          uid.trim() 
                            ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-md shadow-emerald-500/10" 
                            : "bg-slate-800 text-slate-600 cursor-not-allowed"
                        }`}
                      >
                        {saving ? "Linking..." : "Link Profile ID"}
                      </button>
                    </div>

                    {saveStatus && (
                      <p className={`mt-3 text-center text-xs font-bold ${saveStatus.startsWith("✓") ? "text-emerald-400" : "text-rose-400"}`}>
                        {saveStatus}
                      </p>
                    )}
                  </div>
                </div>

                {/* Inventory Logs Card */}
                <div className="rounded-2xl border border-white/10 bg-slate-900/20 p-6">
                  <h3 className="text-xs font-black uppercase tracking-[0.25em] text-slate-500 mb-4">PvE Rewards Inventory</h3>
                  
                  {loadingInventory ? (
                    <div className="text-xs text-emerald-400 animate-pulse py-6 text-center font-mono">LOADING PVE STAGE INVENTORY...</div>
                  ) : pveInventory.length > 0 ? (
                    <div className="grid gap-3">
                      {pveInventory.map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-black/20 p-4 text-left">
                          <div>
                            <div className="font-black text-white text-xs uppercase tracking-wide">{item.item_name || "Purchased Reward"}</div>
                            <div className="text-[10px] text-slate-500 mt-1">Slug: <span className="font-mono">{item.item_slug}</span> | Date: {item.purchase_date ? new Date(item.purchase_date).toLocaleDateString() : "Classified"}</div>
                          </div>
                          <span className={`shrink-0 rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-wider ${
                            item.status === "used" 
                              ? "border-emerald-400/20 bg-emerald-400/15 text-emerald-300"
                              : item.status === "saved"
                                ? "border-cyan-400/20 bg-cyan-400/15 text-cyan-300"
                                : item.status === "expired"
                                  ? "border-rose-400/20 bg-rose-400/15 text-rose-300"
                                  : "border-amber-400/20 bg-amber-400/15 text-amber-300"
                          }`}>
                            {item.status || "available"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 py-6 text-center">
                      No active PvE packages found. Link your UID and buy items in the Store to see them here.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 max-w-md mx-auto text-center">
                <div className="text-4xl mb-4">🛡️</div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight">Access Account Panel</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Sign in with your Discord account to link your Once Human UID, verify your transaction status, and check rewards.
                </p>
                <Link
                  href="/auth/discord/start?next=/pve?tab=dashboard"
                  className="mt-6 flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-xs font-black text-slate-950 uppercase tracking-wider"
                >
                  Connect with Discord
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Support */}
        {activeTab === "support" && (
          <div className="grid gap-6 md:grid-cols-[0.8fr_1.2fr] animate-in fade-in slide-in-from-bottom-3 duration-500 text-left">
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">🎫</span>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">PvE Live Chat</h4>
                    <p className="text-[10px] text-emerald-400">Direct sync to Discord</p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Submit a ticket to immediately establish a private Discord connection channel. Staff replies synchronize directly to this website in real-time.
                </p>
              </div>

              <div className="rounded-2xl border border-white/5 bg-slate-900/30 p-5">
                <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider mb-2">Helpful Reminders</h4>
                <ul className="space-y-1.5 text-[10px] text-slate-500">
                  <li>• Ensure Once Human UID is linked to account.</li>
                  <li>• Provide transaction code if reporting purchase issue.</li>
                  <li>• Reports are logged in auditing webhooks.</li>
                </ul>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/30 p-6">
              {activeTicket ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Ticket Active</span>
                    <button 
                      onClick={() => setActiveTicket(null)}
                      className="text-[10px] text-slate-500 hover:text-white uppercase font-bold"
                    >
                      ✕ Close Chat
                    </button>
                  </div>
                  <TicketChat 
                    ticketId={activeTicket.id} 
                    channelId={activeTicket.channelId}
                    presenceSide="user"
                  />
                </div>
              ) : (
                <form onSubmit={submitTicket} className="space-y-4">
                  <div className="flex items-center gap-3 mb-2 border-b border-white/5 pb-3">
                    <span className="text-2xl">📝</span>
                    <div>
                      <h4 className="text-sm font-black text-white uppercase">Submit support ticket</h4>
                      <p className="text-[10px] text-slate-500">Pre-categorized under PvE server issues</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Subject</label>
                    <input
                      type="text"
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. Wipe pack missing, base collision query"
                      className="h-10 rounded-lg border border-white/10 bg-black/50 px-3 text-xs text-white placeholder:text-slate-700 outline-none focus:border-emerald-500/50"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Character Name</label>
                    <input
                      type="text"
                      required
                      value={inGameName}
                      onChange={(e) => setInGameName(e.target.value)}
                      placeholder="Enter Once Human character name"
                      className="h-10 rounded-lg border border-white/10 bg-black/50 px-3 text-xs text-white placeholder:text-slate-700 outline-none focus:border-emerald-500/50"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Detailed Message</label>
                    <textarea
                      required
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Please clarify details about your concern. Staff will reply directly."
                      className="rounded-lg border border-white/10 bg-black/50 p-3 text-xs text-white placeholder:text-slate-700 outline-none focus:border-emerald-500/50 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingTicket}
                    className="h-11 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-xs font-black text-slate-950 hover:scale-[1.02] shadow-md shadow-emerald-500/10 transition uppercase tracking-wider"
                  >
                    {submittingTicket ? "Submitting..." : "Submit & Open Chat"}
                  </button>

                  {supportStatus && (
                    <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-300">
                      {supportStatus}
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Realm Rules */}
        {activeTab === "rules" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500 text-left">
            <div className="rounded-2xl border border-white/10 bg-slate-900/30 p-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300 mb-6">
                Realm Rules & Guidelines
              </div>
              <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-4">Complete PvE Code of Conduct</h2>
              <p className="text-xs leading-relaxed text-slate-400 mb-8 max-w-2xl">
                The Once Human PvE realm is built on trust, cooperation, and community. Please review the detailed guidelines to keep the realm positive for all survivors.
              </p>

              <div className="grid gap-6 md:grid-cols-2">
                {activeRules.map((rule: any) => (
                  <div 
                    key={rule.id} 
                    className={`relative rounded-[2rem] border p-6 md:p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${
                      rule.highlight 
                        ? "border-rose-500/30 bg-rose-500/5 shadow-[0_0_50px_-10px_rgba(244,63,94,0.15)]" 
                        : "border-emerald-500/10 bg-slate-900/40 hover:border-emerald-500/30"
                    }`}
                  >
                    {rule.highlight && (
                      <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-rose-500 to-red-500 px-4 py-1 text-[9px] font-black uppercase tracking-widest text-white shadow-lg shadow-rose-500/30">
                        Critical Directive
                      </div>
                    )}
                    <div className="flex items-start gap-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl ${
                        rule.highlight ? "bg-rose-500/20" : "bg-emerald-500/10 text-emerald-400"
                      }`}>
                        {rule.emoji || "📋"}
                      </div>
                      <div>
                        <h3 className="text-lg font-black tracking-tight text-white uppercase">{rule.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-400 font-medium">{rule.copy}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
