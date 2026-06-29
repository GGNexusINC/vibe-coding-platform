"use client";

import { useState, useEffect } from "react";

export type StorePackage = {
  slug: string;
  badge: string;
  name: string;
  price: number;
  originalPrice?: number;
  summary: string;
  bullets: string[];
  addons?: string[];
  extra?: string;
  featured: boolean;
  themeColor: "cyan" | "fuchsia" | "rose" | "emerald" | "amber" | "indigo" | "slate";
  customBgUrl?: string;
  storeType?: "pve" | "pvp";
  limit?: number;
  cooldown?: string;
  pointsOverride?: number;
};

const DEFAULT_PACKAGES: StorePackage[] = [
  {
    slug: "construction",
    badge: "Builder Favorite",
    name: "Construction Package",
    price: 5,
    summary: "A fast-start builder bundle for serious base progression.",
    bullets: ["5000 Stone", "7000 Wood", "5000 Steel", "5000 Tungsten"],
    addons: ["Advanced tables (Supplies and Armament)", "Box set (Storage boxes, Weapon box, Armor box)", "3 V3 tickets", "350 Gasoline"],
    extra: "300 chips or deviant selector (your choice)",
    featured: false,
    themeColor: "amber",
    storeType: "pve",
  },
  {
    slug: "defense",
    badge: "Stronghold Loadout",
    name: "Defense Package",
    price: 5,
    summary: "Everything needed to harden a position and hold pressure.",
    bullets: ["10 Rifle Turrets (2000 bullets)", "4 Shotgun Turrets (400 bullets) or 4 Stun Traps (full bullets)", "6 Pulse Traps", "20 High Tungsten Walls", "2 High Tungsten Doors", "2 Large Biomass Generators"],
    extra: "300 chips or special meals (your choice)",
    featured: false,
    themeColor: "slate",
    storeType: "pve",
  },
  {
    slug: "tactical",
    badge: "Most Wanted",
    name: "Tactical Package",
    price: 5,
    summary: "The premium combat kit for players who want immediate battlefield value.",
    bullets: ["MK14 (full mods + 200 bullets) or KVD (full mods + 200 bullets)", "P90 (full mods + 200 bullets) or KV-SBR (full mods + 200 bullets)", "Stormweaver Set + Gas Mask or Refugee Set + Gas Mask", "20 Corn Soups", "20 Emergency Supplies", "2 Universal Repair Kits", "60 Gasoline"],
    extra: "300 chips or Masamune Katana",
    featured: true,
    themeColor: "rose",
    storeType: "pvp",
  },
  {
    slug: "insurance",
    badge: "Security Pick",
    name: "Anti Raid Insurance",
    price: 5,
    summary: "Protect your base and save farming time (Single Use per wipe).",
    bullets: ["Base blueprint resources are returned", "Single use per wipe", "Staff-verified fulfillment after purchase confirmation"],
    extra: "VIP role during the corresponding wipe",
    featured: false,
    themeColor: "indigo",
    storeType: "pve",
  },
];

const THEME_COLORS = [
  { id: "cyan", hex: "#06b6d4" },
  { id: "fuchsia", hex: "#d946ef" },
  { id: "rose", hex: "#f43f5e" },
  { id: "emerald", hex: "#10b981" },
  { id: "amber", hex: "#f59e0b" },
  { id: "indigo", hex: "#6366f1" },
  { id: "slate", hex: "#64748b" },
];

const PRESET_ITEMS = [
  { label: "-- Quick Presets --", value: "" },
  { label: "📦 5000 Stone", value: "5000 Stone" },
  { label: "📦 7000 Wood", value: "7000 Wood" },
  { label: "📦 5000 Steel", value: "5000 Steel" },
  { label: "📦 5000 Tungsten", value: "5000 Tungsten" },
  { label: "🔋 2 Large Biomass Generators", value: "2 Large Biomass Generators" },
  { label: "🔫 10 Rifle Turrets (2000 bullets)", value: "10 Rifle Turrets (2000 bullets)" },
  { label: "🩹 20 Emergency Supplies", value: "20 Emergency Supplies" },
  { label: "⛽ 350 Gasoline", value: "350 Gasoline" },
  { label: "🎫 3 V3 tickets", value: "3 V3 tickets" },
  { label: "⚔️ Masamune Katana", value: "Masamune Katana" },
  { label: "🥗 20 Corn Soups", value: "20 Corn Soups" }
];

export function PackagesEditor({ mayhemMode }: { mayhemMode: boolean }) {
  const [packages, setPackages] = useState<StorePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [activePkgIndex, setActivePkgIndex] = useState<number>(0);
  const [editorTab, setEditorTab] = useState<"details" | "items" | "styling">("details");

  useEffect(() => {
    fetchPackages();
  }, []);

  async function fetchPackages() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/packages");
      const data = await res.json();
      if (data.ok) {
        setPackages(data.packages.length > 0 ? data.packages : DEFAULT_PACKAGES);
        setActivePkgIndex(0);
      } else {
        setError(data.error || "Failed to fetch packages");
        setPackages(DEFAULT_PACKAGES);
      }
    } catch (e) {
      setError("Network error fetching packages");
      setPackages(DEFAULT_PACKAGES);
    } finally {
      setLoading(false);
    }
  }

  async function savePackages() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/admin/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packages })
      });
      const data = await res.json();
      if (data.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(data.error || "Failed to save packages");
      }
    } catch (e) {
      setError("Network error saving packages");
    } finally {
      setSaving(false);
    }
  }

  function addPackage() {
    const newSlug = "pack_" + Date.now() + "_" + Math.random().toString(36).substring(7);
    const newPack: StorePackage = { 
      slug: newSlug, badge: "New Pack", name: "Custom Package", price: 5, 
      summary: "Short description of the pack", bullets: ["Item 1", "Item 2"], 
      addons: [], featured: false, themeColor: "cyan", storeType: "pve"
    };
    setPackages([newPack, ...packages]);
    setActivePkgIndex(0);
  }

  function updateActivePackage(field: keyof StorePackage, value: any) {
    if (activePkgIndex < 0 || activePkgIndex >= packages.length) return;
    const newPacks = [...packages];
    newPacks[activePkgIndex] = { ...newPacks[activePkgIndex], [field]: value };
    setPackages(newPacks);
  }

  function deletePackage(index: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this package?")) return;
    const newPacks = [...packages];
    newPacks.splice(index, 1);
    setPackages(newPacks);
    if (activePkgIndex >= newPacks.length) {
      setActivePkgIndex(Math.max(0, newPacks.length - 1));
    }
  }

  function movePackage(index: number, dir: -1 | 1, e: React.MouseEvent) {
    e.stopPropagation();
    if (index + dir < 0 || index + dir >= packages.length) return;
    const newPacks = [...packages];
    const temp = newPacks[index];
    newPacks[index] = newPacks[index + dir];
    newPacks[index + dir] = temp;
    setPackages(newPacks);
    setActivePkgIndex(index + dir);
  }

  function handlePresetSelect(presetVal: string) {
    if (!presetVal) return;
    const currentPkg = packages[activePkgIndex];
    if (!currentPkg) return;
    const newBullets = [...(currentPkg.bullets || [])];
    if (!newBullets.includes(presetVal)) {
      newBullets.push(presetVal);
      updateActivePackage("bullets", newBullets);
    }
  }

  if (loading) {
    return <div className="flex justify-center p-12 text-cyan-400 animate-pulse font-mono tracking-widest">LOADING PACKAGES MATRIX...</div>;
  }

  const activePkg = packages[activePkgIndex];

  return (
    <div className="space-y-6">
      {/* Upper header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400 uppercase tracking-widest">
            Store Package Configurator
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Build and publish packages to your live server shop. Items sync to your database table on Deploy.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={addPackage}
            className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-300 hover:bg-cyan-500/20 transition-all shadow-[0_0_15px_rgba(34,211,238,0.1)]"
          >
            + ADD PACKAGE
          </button>
          <button
            onClick={savePackages}
            disabled={saving}
            className="rounded-xl bg-gradient-to-r from-fuchsia-600 to-cyan-600 px-6 py-2 text-sm font-black text-white hover:opacity-90 active:scale-95 transition-all shadow-[0_0_20px_rgba(217,70,239,0.3)] disabled:opacity-50"
          >
            {saving ? "PUBLISHING..." : "PUBLISH TO SITE"}
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl bg-rose-500/20 border border-rose-500/50 p-4 text-rose-200 text-sm font-medium">{error}</div>}
      {success && <div className="rounded-xl bg-emerald-500/20 border border-emerald-500/50 p-4 text-emerald-200 text-sm font-medium">Packages successfully pushed to the live database!</div>}

      <div className="grid gap-8 lg:grid-cols-[2fr_3fr_2fr]">
        
        {/* Left Column: Sidebar package switcher */}
        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 space-y-3 h-[75vh] overflow-y-auto">
          <div className="text-xs font-black text-slate-500 uppercase tracking-wider px-2">Store Items ({packages.length})</div>
          <div className="space-y-2">
            {packages.map((pkg, idx) => {
              const isActive = activePkgIndex === idx;
              const themeColorHex = THEME_COLORS.find(c => c.id === pkg.themeColor)?.hex || "#6366f1";
              return (
                <div
                  key={pkg.slug}
                  onClick={() => setActivePkgIndex(idx)}
                  className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all duration-200 select-none text-left relative overflow-hidden ${
                    isActive 
                      ? "border-cyan-500/60 bg-cyan-500/5 shadow-[0_0_15px_rgba(6,182,212,0.15)]" 
                      : "border-white/5 bg-slate-900/20 hover:border-white/15"
                  }`}
                >
                  <div className="absolute top-0 right-0 w-2 h-full opacity-70" style={{ backgroundColor: themeColorHex }} />
                  <div className="flex justify-between items-start pr-4">
                    <span className="text-xs font-black text-white uppercase truncate">{pkg.name || "Unnamed"}</span>
                    <span className="text-xs font-black font-mono text-cyan-400">${pkg.price}</span>
                  </div>
                  <div className="flex gap-2 items-center mt-2">
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                      pkg.storeType === "pvp" 
                        ? "text-rose-400 bg-rose-500/10 border-rose-500/20" 
                        : "text-cyan-400 bg-cyan-500/10 border-cyan-500/20"
                    }`}>
                      {pkg.storeType || "pve"}
                    </span>
                    <span className="text-[10px] text-slate-500 truncate">{pkg.badge || "No badge"}</span>
                  </div>

                  {/* Move & Delete controls on hover */}
                  <div className="flex justify-end gap-1.5 mt-3 pt-2 border-t border-white/5">
                    <button 
                      onClick={(e) => movePackage(idx, -1, e)} 
                      disabled={idx === 0} 
                      className="p-1 text-slate-500 hover:text-white disabled:opacity-20"
                    >
                      ▲
                    </button>
                    <button 
                      onClick={(e) => movePackage(idx, 1, e)} 
                      disabled={idx === packages.length - 1} 
                      className="p-1 text-slate-500 hover:text-white disabled:opacity-20"
                    >
                      ▼
                    </button>
                    <button 
                      onClick={(e) => deletePackage(idx, e)} 
                      className="p-1 text-rose-500 hover:text-rose-400 ml-2"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center Column: Form Editor */}
        {activePkg ? (
          <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 flex flex-col h-[75vh] justify-between relative">
            
            {/* Header / Tabs */}
            <div>
              <div className="flex border-b border-white/10 pb-3 gap-2">
                {[
                  { id: "details", label: "📝 Details" },
                  { id: "items", label: "🎒 Items List" },
                  { id: "styling", label: "🎨 Style" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setEditorTab(tab.id as any)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition ${
                      editorTab === tab.id 
                        ? "bg-white/10 text-white" 
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab: Details */}
              {editorTab === "details" && (
                <div className="space-y-4 mt-4 overflow-y-auto max-h-[50vh] pr-2 scrollbar-none">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col text-left">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Package Name</label>
                      <input 
                        type="text" 
                        value={activePkg.name} 
                        onChange={(e) => updateActivePackage("name", e.target.value)}
                        className="h-10 rounded-lg border border-white/10 bg-black/50 px-3 text-sm font-semibold text-white outline-none focus:border-cyan-500/50"
                      />
                    </div>
                    <div className="flex flex-col text-left">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Unique ID / Slug</label>
                      <input 
                        type="text" 
                        value={activePkg.slug} 
                        onChange={(e) => updateActivePackage("slug", e.target.value)}
                        className="h-10 rounded-lg border border-white/10 bg-black/50 px-3 text-sm font-mono text-slate-400 outline-none focus:border-cyan-500/50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex flex-col text-left">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Store Price ($)</label>
                      <input 
                        type="number" 
                        value={activePkg.price} 
                        onChange={(e) => updateActivePackage("price", Number(e.target.value))}
                        className="h-10 rounded-lg border border-white/10 bg-black/50 px-3 text-sm font-bold text-white outline-none focus:border-cyan-500/50"
                      />
                    </div>
                    <div className="flex flex-col text-left">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Original Price (Sale)</label>
                      <input 
                        type="number" 
                        value={activePkg.originalPrice || ""} 
                        onChange={(e) => updateActivePackage("originalPrice", e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="Strike-through"
                        className="h-10 rounded-lg border border-white/10 bg-black/50 px-3 text-sm font-semibold text-slate-400 outline-none focus:border-cyan-500/50"
                      />
                    </div>
                    <div className="flex flex-col text-left">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Store Placement</label>
                      <select 
                        value={activePkg.storeType || "pve"} 
                        onChange={(e) => updateActivePackage("storeType", e.target.value)}
                        className="h-10 rounded-lg border border-white/10 bg-black/50 px-3 text-xs font-bold text-cyan-300 outline-none"
                      >
                        <option value="pve">PvE Store</option>
                        <option value="pvp">PvP Store</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col text-left">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Badge Ribbon</label>
                      <input 
                        type="text" 
                        value={activePkg.badge} 
                        onChange={(e) => updateActivePackage("badge", e.target.value)}
                        placeholder="e.g. Best Value"
                        className="h-10 rounded-lg border border-white/10 bg-black/50 px-3 text-xs text-slate-300 outline-none focus:border-cyan-500/50"
                      />
                    </div>
                    <div className="flex flex-col text-left">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Points Override</label>
                      <input 
                        type="number" 
                        value={activePkg.pointsOverride || ""} 
                        onChange={(e) => updateActivePackage("pointsOverride", e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="Default price * 100"
                        className="h-10 rounded-lg border border-white/10 bg-black/50 px-3 text-sm text-slate-400 outline-none focus:border-cyan-500/50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col text-left">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Purchase Cooldown</label>
                      <input 
                        type="text" 
                        value={activePkg.cooldown || ""} 
                        onChange={(e) => updateActivePackage("cooldown", e.target.value)}
                        placeholder="e.g. Once per wipe"
                        className="h-10 rounded-lg border border-white/10 bg-black/50 px-3 text-xs text-slate-300 outline-none focus:border-cyan-500/50"
                      />
                    </div>
                    <div className="flex flex-col text-left">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Stock Limit per User</label>
                      <input 
                        type="number" 
                        value={activePkg.limit || ""} 
                        onChange={(e) => updateActivePackage("limit", e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="No limit"
                        className="h-10 rounded-lg border border-white/10 bg-black/50 px-3 text-sm text-slate-400 outline-none focus:border-cyan-500/50"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col text-left">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Summary Description</label>
                    <textarea 
                      value={activePkg.summary} 
                      onChange={(e) => updateActivePackage("summary", e.target.value)}
                      rows={3}
                      className="rounded-lg border border-white/10 bg-black/50 p-3 text-sm text-slate-300 outline-none focus:border-cyan-500/50 resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Tab: Items */}
              {editorTab === "items" && (
                <div className="space-y-4 mt-4 overflow-y-auto max-h-[50vh] pr-2 scrollbar-none">
                  {/* Preset Injector */}
                  <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Item Preset Quick Insert</span>
                    <select
                      onChange={(e) => { handlePresetSelect(e.target.value); e.target.value = ""; }}
                      className="rounded-lg border border-white/10 bg-black px-3 py-1 text-xs text-cyan-300 focus:outline-none"
                    >
                      {PRESET_ITEMS.map((it) => (
                        <option key={it.value} value={it.value}>{it.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col text-left">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Bullet Items (One per line)</label>
                    <textarea 
                      value={activePkg.bullets.join("\n")} 
                      onChange={(e) => updateActivePackage("bullets", e.target.value.split("\n").filter(x => x.trim()))}
                      className="min-h-[160px] rounded-lg border border-white/10 bg-black/50 p-3 text-xs text-slate-300 outline-none focus:border-cyan-500/50 font-mono resize-y"
                    />
                  </div>

                  <div className="flex flex-col text-left">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Addons / Supplemental Hardware (One per line)</label>
                    <textarea 
                      value={(activePkg.addons || []).join("\n")} 
                      onChange={(e) => updateActivePackage("addons", e.target.value.split("\n").filter(x => x.trim()))}
                      className="min-h-[100px] rounded-lg border border-white/10 bg-black/50 p-3 text-xs text-slate-400 outline-none focus:border-cyan-500/50 font-mono resize-y"
                    />
                  </div>

                  <div className="flex flex-col text-left">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Extra Banner Offer text</label>
                    <input 
                      type="text" 
                      value={activePkg.extra || ""} 
                      onChange={(e) => updateActivePackage("extra", e.target.value)}
                      placeholder="e.g. 300 chips or deviant selector"
                      className="h-10 rounded-lg border border-white/10 bg-black/50 px-3 text-xs text-slate-300 outline-none focus:border-cyan-500/50"
                    />
                  </div>
                </div>
              )}

              {/* Tab: Styling */}
              {editorTab === "styling" && (
                <div className="space-y-5 mt-4 overflow-y-auto max-h-[50vh] pr-2 scrollbar-none">
                  {/* Theme Selectors */}
                  <div className="flex flex-col text-left">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Theme Accent Glow</label>
                    <div className="flex items-center gap-3">
                      {THEME_COLORS.map(c => (
                        <button
                          key={c.id}
                          onClick={() => updateActivePackage("themeColor", c.id)}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${activePkg.themeColor === c.id ? 'scale-110 shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                          style={{ backgroundColor: c.hex, borderColor: activePkg.themeColor === c.id ? 'white' : 'transparent', boxShadow: activePkg.themeColor === c.id ? `0 0 10px ${c.hex}` : 'none' }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Background URL */}
                  <div className="flex flex-col text-left">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Custom Background Image URL</label>
                    <input 
                      type="text" 
                      placeholder="https://example.com/background.jpg"
                      value={activePkg.customBgUrl || ""} 
                      onChange={(e) => updateActivePackage("customBgUrl", e.target.value)}
                      className="h-10 rounded-lg border border-white/10 bg-black/50 px-3 text-xs font-mono text-slate-300 outline-none focus:border-cyan-500/50"
                    />
                  </div>

                  {/* Featured */}
                  <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5">
                    <div className="text-left">
                      <span className="text-xs font-black text-white uppercase tracking-wider block">Featured Package Card</span>
                      <span className="text-[10px] text-slate-500 mt-1">Highlights the package with a border animation.</span>
                    </div>
                    <button
                      onClick={() => updateActivePackage("featured", !activePkg.featured)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        activePkg.featured ? "bg-cyan-500" : "bg-slate-800"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          activePkg.featured ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Indicator of changes */}
            <div className="border-t border-white/10 pt-4 flex justify-between items-center text-xs text-slate-500">
              <span>Selected Pack: <b className="text-slate-300">{activePkg.slug}</b></span>
              <span>Changes stage in local memory. Publish when ready.</span>
            </div>

          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 flex items-center justify-center h-[75vh] text-slate-500">
            No package selected. Click a package on the left to edit.
          </div>
        )}

        {/* Right Column: Real-time Live Preview */}
        <div className="space-y-4">
          <div className="text-xs font-black text-slate-500 uppercase tracking-wider text-left">Live Storefront Card Preview</div>
          {activePkg ? (
            <div 
              className={`relative overflow-hidden rounded-[2.5rem] border bg-slate-900/40 p-6 shadow-2xl backdrop-blur-xl transition-all duration-300 group text-left`}
              style={{
                borderColor: activePkg.themeColor ? `${THEME_COLORS.find(c => c.id === activePkg.themeColor)?.hex}40` : 'rgba(255,255,255,0.1)',
              }}
            >
              {activePkg.customBgUrl && (
                 <div className="absolute inset-0 -z-20 opacity-20" style={{ backgroundImage: `url(${activePkg.customBgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(4px) grayscale(50%)' }} />
              )}
              <div className="absolute inset-0 -z-10 bg-slate-500/5" />
              {activePkg.themeColor && (
                 <div 
                   className="absolute top-0 right-0 w-[200px] h-[200px] opacity-25 pointer-events-none blur-[70px] rounded-full" 
                   style={{ backgroundColor: THEME_COLORS.find(c => c.id === activePkg.themeColor)?.hex }} 
                 />
              )}
              
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-cyan-300">
                    {activePkg.badge || "DEPLOY READY"}
                  </div>
                  <div className="flex items-center gap-2">
                    {activePkg.originalPrice && activePkg.originalPrice > activePkg.price && (
                      <span className="text-xs line-through text-slate-500 font-mono">${activePkg.originalPrice}</span>
                    )}
                    <div className="text-2xl font-black text-white tracking-tighter">
                      ${activePkg.price}
                    </div>
                  </div>
                </div>

                <h2 className="mt-5 text-xl font-black leading-tight text-white tracking-tight uppercase">{activePkg.name || "Custom Package"}</h2>
                <p className="mt-2 text-xs font-medium leading-relaxed text-slate-400 truncate-2-lines">{activePkg.summary || "Short description summary..."}</p>

                <div className="mt-5 space-y-2">
                  {(activePkg.bullets || []).slice(0, 3).map((item) => (
                    <div key={item} className="flex items-center gap-3 rounded-xl border border-white/5 bg-slate-900/40 p-3">
                       <span className="flex h-1.5 w-1.5 rounded-full shrink-0 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                       <span className="text-[10px] font-black tracking-tight uppercase truncate">{item}</span>
                    </div>
                  ))}
                  {activePkg.bullets && activePkg.bullets.length > 3 && (
                    <div className="text-[10px] font-bold text-cyan-500 pl-4">+ {activePkg.bullets.length - 3} more items...</div>
                  )}
                </div>

                {activePkg.limit !== undefined && (
                  <div className="mt-3 text-[10px] text-amber-500 font-bold bg-amber-500/5 px-3 py-1 rounded-lg border border-amber-500/10 inline-block uppercase tracking-wider">
                    ⚠️ Limit: {activePkg.limit} per account
                  </div>
                )}

                <div className="mt-6 flex items-center justify-between gap-4 pt-4 border-t border-white/10">
                   <div className="flex flex-col">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Points</span>
                      <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">
                        ✨ {activePkg.pointsOverride || Math.floor(activePkg.price * 100)} Pts
                      </span>
                   </div>
                   <button className="rounded-xl bg-white/10 px-5 py-2 text-[10px] font-black text-white hover:bg-white/20 uppercase tracking-[0.1em]">
                     Select
                   </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-8 h-48 flex items-center justify-center text-slate-500">
              No preview available.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
