"use client";

import { useState, useEffect } from "react";

export type StorePackage = {
  slug: string;
  badge: string;
  name: string;
  price: number;
  summary: string;
  bullets: string[];
  addons?: string[];
  extra?: string;
  featured: boolean;
  themeColor: "cyan" | "fuchsia" | "rose" | "emerald" | "amber" | "indigo" | "slate";
  customBgUrl?: string;
  storeType?: "pve" | "pvp";
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

export function PackagesEditor({ mayhemMode }: { mayhemMode: boolean }) {
  const [packages, setPackages] = useState<StorePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updatePackage(index: number, field: keyof StorePackage, value: any) {
    const newPacks = [...packages];
    newPacks[index] = { ...newPacks[index], [field]: value };
    setPackages(newPacks);
  }

  function deletePackage(index: number) {
    const newPacks = [...packages];
    newPacks.splice(index, 1);
    setPackages(newPacks);
  }

  function movePackage(index: number, dir: -1 | 1) {
    if (index + dir < 0 || index + dir >= packages.length) return;
    const newPacks = [...packages];
    const temp = newPacks[index];
    newPacks[index] = newPacks[index + dir];
    newPacks[index + dir] = temp;
    setPackages(newPacks);
  }

  if (loading) {
    return <div className="flex justify-center p-12 text-cyan-400 animate-pulse font-mono tracking-widest">LOADING PACKAGES MATRIX...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400 uppercase tracking-widest">
            Store Packages
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Configure the public store packages. Updates here immediately sync to the live website checkout.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={addPackage}
            className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-300 hover:bg-cyan-500/20 transition-all shadow-[0_0_15px_rgba(34,211,238,0.1)]"
          >
            + ADD PACKAGE
          </button>
          <button
            onClick={savePackages}
            disabled={saving}
            className="rounded-lg bg-gradient-to-r from-fuchsia-600 to-cyan-600 px-6 py-2 text-sm font-black text-white hover:opacity-90 active:scale-95 transition-all shadow-[0_0_20px_rgba(217,70,239,0.3)] disabled:opacity-50"
          >
            {saving ? "SYNCING..." : "DEPLOY CHANGES"}
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg bg-rose-500/20 border border-rose-500/50 p-4 text-rose-200 text-sm">{error}</div>}
      {success && <div className="rounded-lg bg-emerald-500/20 border border-emerald-500/50 p-4 text-emerald-200 text-sm">Packages successfully deployed to the public store!</div>}

      <div className="space-y-6">
        {packages.map((pkg, i) => (
          <div key={pkg.slug} className={`group relative rounded-3xl border p-6 transition-all duration-300 border-white/10 bg-slate-950/40 hover:border-white/20 overflow-hidden`}>
            
            {/* Background preview */}
            {pkg.customBgUrl && (
               <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: `url(${pkg.customBgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(2px) grayscale(100%)' }} />
            )}
            
            {/* Theme Glow */}
            <div 
              className="absolute top-0 right-0 w-64 h-64 opacity-20 pointer-events-none blur-3xl rounded-full" 
              style={{ backgroundColor: THEME_COLORS.find(c => c.id === pkg.themeColor)?.hex }} 
            />

            <div className="absolute right-4 top-4 flex items-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity z-10">
              <button type="button" onClick={() => movePackage(i, -1)} disabled={i === 0} className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 bg-black/50 rounded border border-white/10">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
              </button>
              <button type="button" onClick={() => movePackage(i, 1)} disabled={i === packages.length - 1} className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 bg-black/50 rounded border border-white/10">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </button>
              <div className="w-px h-4 bg-white/10 mx-1"></div>
              <button type="button" onClick={() => deletePackage(i)} className="p-1.5 text-rose-400 hover:text-rose-300 bg-black/50 rounded border border-white/10">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
              </button>
            </div>

            <div className="relative z-10 grid gap-6 md:grid-cols-[1fr_1fr] lg:grid-cols-[1.5fr_1fr]">
               {/* Left Column */}
               <div className="flex flex-col gap-4">
                  <div className="flex gap-4">
                     <div className="flex flex-col flex-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Package Name</label>
                        <input 
                           type="text" 
                           value={pkg.name} 
                           onChange={(e) => updatePackage(i, "name", e.target.value)}
                           className="h-10 rounded-lg border border-white/10 bg-black/50 px-3 text-sm font-bold text-white outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
                        />
                     </div>
                     <div className="flex flex-col w-24">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Price ($)</label>
                        <input 
                           type="number" 
                           value={pkg.price} 
                           onChange={(e) => updatePackage(i, "price", Number(e.target.value))}
                           className="h-10 rounded-lg border border-white/10 bg-black/50 px-3 text-sm font-bold text-white outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
                        />
                     </div>
                  </div>

                  <div className="flex gap-4">
                     <div className="flex flex-col w-1/4">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Badge</label>
                        <input 
                           type="text" 
                           value={pkg.badge} 
                           onChange={(e) => updatePackage(i, "badge", e.target.value)}
                           className="h-10 rounded-lg border border-white/10 bg-black/50 px-3 text-xs font-bold text-cyan-300 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 uppercase tracking-widest"
                        />
                     </div>
                     <div className="flex flex-col w-1/4">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Store Type</label>
                        <select 
                           value={pkg.storeType || "pve"} 
                           onChange={(e) => updatePackage(i, "storeType", e.target.value)}
                           className="h-10 rounded-lg border border-white/10 bg-black/50 px-3 text-xs font-bold text-cyan-300 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
                        >
                           <option value="pve" className="bg-slate-950 text-slate-200">PvE Store</option>
                           <option value="pvp" className="bg-slate-950 text-slate-200">PvP Store</option>
                        </select>
                     </div>
                     <div className="flex flex-col flex-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Unique Slug (ID)</label>
                        <input 
                           type="text" 
                           value={pkg.slug} 
                           onChange={(e) => updatePackage(i, "slug", e.target.value)}
                           className="h-10 rounded-lg border border-white/10 bg-black/50 px-3 text-xs font-mono text-slate-400 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
                        />
                     </div>
                  </div>

                  <div className="flex flex-col">
                     <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Summary</label>
                     <textarea 
                        value={pkg.summary} 
                        onChange={(e) => updatePackage(i, "summary", e.target.value)}
                        rows={2}
                        className="rounded-lg border border-white/10 bg-black/50 p-3 text-sm text-slate-300 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 resize-none"
                     />
                  </div>

                  {/* Themes */}
                  <div className="flex flex-col bg-white/5 p-4 rounded-xl border border-white/5 mt-2">
                     <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Aesthetics & Background</label>
                     
                     <div className="flex items-center gap-3 mb-4">
                        <span className="text-xs text-slate-500 mr-2">Theme:</span>
                        {THEME_COLORS.map(c => (
                           <button
                              key={c.id}
                              onClick={() => updatePackage(i, "themeColor", c.id)}
                              className={`w-6 h-6 rounded-full border-2 transition-transform ${pkg.themeColor === c.id ? 'scale-125 shadow-lg' : 'scale-100 opacity-50 hover:opacity-100'}`}
                              style={{ backgroundColor: c.hex, borderColor: pkg.themeColor === c.id ? 'white' : 'transparent', boxShadow: pkg.themeColor === c.id ? `0 0 10px ${c.hex}` : 'none' }}
                           />
                        ))}
                     </div>

                     <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Custom Background Image URL (Optional)</label>
                        <input 
                           type="text" 
                           placeholder="https://example.com/image.jpg"
                           value={pkg.customBgUrl || ""} 
                           onChange={(e) => updatePackage(i, "customBgUrl", e.target.value)}
                           className="h-10 rounded-lg border border-white/10 bg-black/50 px-3 text-xs font-mono text-slate-400 outline-none focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/50"
                        />
                     </div>
                  </div>
               </div>

               {/* Right Column */}
               <div className="flex flex-col gap-4">
                  <div className="flex flex-col flex-1">
                     <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex justify-between">
                        <span>Items / Bullets (One per line)</span>
                     </label>
                     <textarea 
                        value={pkg.bullets.join("\n")} 
                        onChange={(e) => updatePackage(i, "bullets", e.target.value.split("\n").filter(x => x.trim()))}
                        className="flex-1 min-h-[120px] rounded-lg border border-white/10 bg-black/50 p-3 text-sm text-slate-300 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 resize-none font-mono"
                     />
                  </div>
                  
                  <div className="flex flex-col h-32">
                     <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Addons / Supplemental (Optional)</label>
                     <textarea 
                        value={(pkg.addons || []).join("\n")} 
                        onChange={(e) => updatePackage(i, "addons", e.target.value.split("\n").filter(x => x.trim()))}
                        className="flex-1 rounded-lg border border-white/10 bg-black/50 p-3 text-xs text-slate-400 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 resize-none font-mono"
                     />
                  </div>

                  <div className="flex flex-col">
                     <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Extra Banner (Optional)</label>
                     <input 
                        type="text" 
                        value={pkg.extra || ""} 
                        onChange={(e) => updatePackage(i, "extra", e.target.value)}
                        className="h-10 rounded-lg border border-white/10 bg-black/50 px-3 text-xs font-medium text-slate-300 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
                     />
                  </div>
               </div>
            </div>
          </div>
        ))}

        {packages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 border border-dashed border-white/10 rounded-xl bg-slate-950/30">
            <div className="text-4xl mb-4 opacity-50">🛍️</div>
            <p className="text-slate-400 text-sm font-semibold tracking-wide">NO PACKAGES DEFINED</p>
            <button onClick={addPackage} className="mt-4 text-cyan-400 text-sm font-bold hover:text-cyan-300 underline underline-offset-4 decoration-cyan-500/30">
              Create the first package
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
