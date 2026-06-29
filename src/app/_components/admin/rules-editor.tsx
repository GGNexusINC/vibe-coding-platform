"use client";

import { useState, useEffect } from "react";

export type Rule = {
  id: string;
  emoji: string;
  title: string;
  copy: string;
  highlight?: boolean;
};

const DEFAULT_RULES: Rule[] = [
  {
    id: "01",
    emoji: "🤝",
    title: "Respect Everyone",
    copy: "No toxicity, hate speech, or harassment toward other survivors. Keep it clean, keep it classy — we're all here to enjoy Once Human.",
  },
  {
    id: "02",
    emoji: "🚫",
    title: "No Spam or Ads",
    copy: "No flooding channels, posting random links, or self-promoting without staff approval.",
  },
  {
    id: "03",
    emoji: "📋",
    title: "Use Channels Properly",
    copy: "Stay on topic. #guides is for guides, #memes is for memes. Each channel has a purpose — use it right.",
  },
  {
    id: "04",
    emoji: "🛡️",
    title: "Keep It Safe",
    copy: "No NSFW content. This is a mixed-age community, so keep everything appropriate.",
  },
  {
    id: "05",
    emoji: "☮️",
    title: "No Drama",
    copy: "Healthy discussions are welcome. Starting fights, spreading rumors, or stirring conflict is not.",
  },
  {
    id: "06",
    emoji: "⚔️",
    title: "Fair Play Only",
    copy: "No cheating, hacking, exploiting game bugs, or using any unfair advantages in Once Human. Play clean.",
  },
  {
    id: "07",
    emoji: "🚛",
    title: "No Meteor Truck",
    copy: "Do NOT use the Meteor Truck. This is a server rule — using it ruins the experience for the entire server. Violations will result in immediate action.",
    highlight: true,
  },
  {
    id: "08",
    emoji: "👮",
    title: "Respect Staff Decisions",
    copy: "Moderators and admins have the final say on all enforcement. Arguing against staff rulings publicly is not allowed — use a support ticket instead.",
  },
  {
    id: "09",
    emoji: "🌟",
    title: "Positive Vibes Only",
    copy: "Help new players, share knowledge, and bring good energy. We're building a community — not just a server.",
  },
  {
    id: "10",
    emoji: "🏰",
    title: "Alliance Restrictions",
    copy: "No alliances are permitted under any circumstances. This includes raiding, defending, or territory management. Every hive/player must operate independently.",
  },
];

const DEFAULT_PVE_RULES: Rule[] = [
  {
    id: "01",
    emoji: "🛣️",
    title: "Base Placement & Roadways",
    copy: "Base building must keep public roads, paths, and bridges completely clear. Do not construct bases directly blocking natural resource spawn clusters or dungeons. Maintain a minimum buffer of 100 meters from neighbors.",
  },
  {
    id: "02",
    emoji: "🛒",
    title: "Economy & Vending Etiquette",
    copy: "Player vendors are strictly limited to designated trade markets or personal territories. Selling quest items or anomalous items at hyper-inflated prices is discouraged. Advertising vendors in general chat is limited to once every 15 minutes.",
  },
  {
    id: "03",
    emoji: "⚔️",
    title: "World Events & Boss Raids",
    copy: "Triggering Prime Wars should be coordinated with regional chats. Let all waiting players join the raid team before beginning silo dungeons. Griefing or trolling team compositions inside raids will result in a ban.",
  },
  {
    id: "04",
    emoji: "🤝",
    title: "General Interaction & Fair Play",
    copy: "Safe-zone containers should be left unlocked if empty or containing junk. No exploiting structural base mechanics to block monster pathfinding. Submit bugs and rule breakers directly to staff via the Live Support tab.",
  },
];

export function RulesEditor({ mayhemMode }: { mayhemMode: boolean }) {
  const [rulesType, setRulesType] = useState<"pvp" | "pve">("pvp");
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    fetchRules(rulesType);
  }, []);

  async function fetchRules(type: "pvp" | "pve") {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/rules?type=${type}`);
      const data = await res.json();
      if (data.ok) {
        const defaultSet = type === "pve" ? DEFAULT_PVE_RULES : DEFAULT_RULES;
        setRules(data.rules.length > 0 ? data.rules : defaultSet);
      } else {
        setError(data.error || "Failed to fetch rules");
        setRules(type === "pve" ? DEFAULT_PVE_RULES : DEFAULT_RULES);
      }
    } catch (e) {
      setError("Network error fetching rules");
      setRules(type === "pve" ? DEFAULT_PVE_RULES : DEFAULT_RULES);
    } finally {
      setLoading(false);
    }
  }

  async function saveRules() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/admin/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules, type: rulesType })
      });
      const data = await res.json();
      if (data.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(data.error || "Failed to save rules");
      }
    } catch (e) {
      setError("Network error saving rules");
    } finally {
      setSaving(false);
    }
  }

  function addRule() {
    const newId = String(rules.length + 1).padStart(2, '0');
    setRules([...rules, { id: newId, emoji: "📝", title: "New Rule", copy: "Description here", highlight: false }]);
  }

  function updateRule(index: number, field: keyof Rule, value: any) {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], [field]: value };
    setRules(newRules);
  }

  function deleteRule(index: number) {
    const newRules = [...rules];
    newRules.splice(index, 1);
    // Re-index
    newRules.forEach((r, i) => {
      r.id = String(i + 1).padStart(2, '0');
    });
    setRules(newRules);
  }

  function moveRule(index: number, dir: -1 | 1) {
    if (index + dir < 0 || index + dir >= rules.length) return;
    const newRules = [...rules];
    const temp = newRules[index];
    newRules[index] = newRules[index + dir];
    newRules[index + dir] = temp;
    // Re-index
    newRules.forEach((r, i) => {
      r.id = String(i + 1).padStart(2, '0');
    });
    setRules(newRules);
  }

  if (loading) {
    return <div className="flex justify-center p-12 text-cyan-400 animate-pulse font-mono tracking-widest">LOADING RULES MATRIX...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400 uppercase tracking-widest">
            Rules Matrix
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Configure the public server rules. Updates here immediately sync to the live website.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => {
                setRulesType("pvp");
                fetchRules("pvp");
              }}
              className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
                rulesType === "pvp"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                  : "bg-slate-900/40 text-slate-400 border border-white/5 hover:text-white"
              }`}
            >
              PvP Server Rules
            </button>
            <button
              onClick={() => {
                setRulesType("pve");
                fetchRules("pve");
              }}
              className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
                rulesType === "pve"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                  : "bg-slate-900/40 text-slate-400 border border-white/5 hover:text-white"
              }`}
            >
              PvE Server Rules
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={addRule}
            className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-300 hover:bg-cyan-500/20 transition-all shadow-[0_0_15px_rgba(34,211,238,0.1)]"
          >
            + ADD PROTOCOL
          </button>
          <button
            onClick={saveRules}
            disabled={saving}
            className="rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-600 px-6 py-2 text-sm font-black text-white hover:opacity-90 active:scale-95 transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] disabled:opacity-50"
          >
            {saving ? "SYNCING..." : "DEPLOY CHANGES"}
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg bg-rose-500/20 border border-rose-500/50 p-4 text-rose-200 text-sm">{error}</div>}
      {success && <div className="rounded-lg bg-emerald-500/20 border border-emerald-500/50 p-4 text-emerald-200 text-sm">Rules successfully deployed to the public matrix!</div>}

      <div className="space-y-4">
        {rules.map((rule, i) => (
          <div key={rule.id} className={`group relative rounded-xl border p-5 transition-all duration-300 ${
            rule.highlight 
              ? "border-rose-500/40 bg-rose-950/20 shadow-[inset_0_0_20px_rgba(244,63,94,0.05)]" 
              : `border-white/10 bg-slate-950/40 ${rulesType === "pve" ? "hover:border-emerald-500/30" : "hover:border-cyan-500/30"}`
          }`}>
            
            <div className="absolute right-4 top-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => moveRule(i, -1)} disabled={i === 0} className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
              </button>
              <button onClick={() => moveRule(i, 1)} disabled={i === rules.length - 1} className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </button>
              <div className="w-px h-4 bg-white/10 mx-1"></div>
              <button onClick={() => deleteRule(i)} className="p-1.5 text-rose-400 hover:text-rose-300">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
              </button>
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">ID</label>
                  <div className={`text-sm font-black ${rule.highlight ? "text-rose-400" : rulesType === "pve" ? "text-emerald-400" : "text-cyan-400"} flex h-10 items-center justify-center rounded-lg border border-white/5 bg-black/50 px-3 w-14`}>
                    {rule.id}
                  </div>
                </div>
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Icon</label>
                  <input 
                    type="text" 
                    value={rule.emoji} 
                    onChange={(e) => updateRule(i, "emoji", e.target.value)}
                    className={`h-10 w-14 rounded-lg border border-white/10 bg-black/50 text-center text-xl text-white outline-none focus:ring-1 ${rulesType === "pve" ? "focus:border-emerald-500/50 focus:ring-emerald-500/50" : "focus:border-cyan-500/50 focus:ring-cyan-500/50"}`}
                  />
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-3">
                <div className="flex flex-col">
                  <div className="flex justify-between items-end mb-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Protocol Title</label>
                    <label className="flex items-center gap-2 cursor-pointer group/toggle">
                      <input 
                        type="checkbox" 
                        checked={rule.highlight} 
                        onChange={(e) => updateRule(i, "highlight", e.target.checked)}
                        className="sr-only"
                      />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Highlight Danger</span>
                      <div className={`w-8 h-4 rounded-full transition-colors relative ${rule.highlight ? "bg-rose-500" : "bg-white/10"}`}>
                        <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${rule.highlight ? "translate-x-4" : ""}`} />
                      </div>
                    </label>
                  </div>
                  <input 
                    type="text" 
                    value={rule.title} 
                    onChange={(e) => updateRule(i, "title", e.target.value)}
                    className={`h-10 rounded-lg border border-white/10 bg-black/50 px-3 text-sm font-bold text-white outline-none focus:ring-1 ${
                      rule.highlight 
                        ? 'focus:border-rose-500/50 focus:ring-rose-500/50' 
                        : rulesType === "pve" 
                          ? 'focus:border-emerald-500/50 focus:ring-emerald-500/50' 
                          : 'focus:border-cyan-500/50 focus:ring-cyan-500/50'
                    }`}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Directives</label>
                  <textarea 
                    value={rule.copy} 
                    onChange={(e) => updateRule(i, "copy", e.target.value)}
                    rows={3}
                    className={`rounded-lg border border-white/10 bg-black/50 p-3 text-sm text-slate-300 outline-none focus:ring-1 resize-none ${rulesType === "pve" ? "focus:border-emerald-500/50 focus:ring-emerald-500/50" : "focus:border-cyan-500/50 focus:ring-cyan-500/50"}`}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}

        {rules.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 border border-dashed border-white/10 rounded-xl bg-slate-950/30">
            <div className="text-4xl mb-4 opacity-50">📋</div>
            <p className="text-slate-400 text-sm font-semibold tracking-wide">NO PROTOCOLS DEFINED</p>
            <button onClick={addRule} className={`mt-4 text-sm font-bold underline underline-offset-4 ${rulesType === "pve" ? "text-emerald-400 hover:text-emerald-300 decoration-emerald-500/30" : "text-cyan-400 hover:text-cyan-300 decoration-cyan-500/30"}`}>
              Add the first rule
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
