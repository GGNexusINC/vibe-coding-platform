"use client";

import { useState, useEffect } from "react";

type InventoryItem = {
  id: string;
  item_type: string;
  item_slug: string;
  item_name: string;
  status: "available" | "used" | "saved" | "expired";
  purchase_date: string;
  used_date?: string;
  wipe_cycle?: string;
  metadata?: any;
};

type PackageLog = {
  id: string;
  item_name: string;
  item_type: string;
  action: string;
  action_at: string;
  action_by_name?: string;
  details?: any;
};

const actionLabels: Record<string, { label: string; color: string }> = {
  admin_given:    { label: "Received",  color: "text-teal-400" },
  user_used:      { label: "Used",      color: "text-amber-400" },
  user_saved:     { label: "Saved",     color: "text-cyan-400" },
  admin_revoked:  { label: "Revoked",   color: "text-rose-400" },
  admin_restored: { label: "Restored",  color: "text-violet-400" },
};

/* ── Crate SVG icon matching reference ── */
function CrateIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="20" width="52" height="36" rx="3" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="2"/>
      <rect x="6" y="14" width="52" height="10" rx="2" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2"/>
      <line x1="32" y1="20" x2="32" y2="56" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3"/>
      <line x1="6" y1="38" x2="58" y2="38" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4"/>
      <rect x="26" y="32" width="12" height="8" rx="2" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}

function FeatureIcon({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-teal-500/30 bg-teal-500/10 text-teal-400">
      {children}
    </div>
  );
}

export function InventorySection() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [logs, setLogs] = useState<PackageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [confirmItem, setConfirmItem] = useState<{ id: string; action: "use" | "save"; type: string } | null>(null);

  useEffect(() => { fetchInventory(); fetchLogs(); }, []);

  async function fetchInventory() {
    try {
      const res = await fetch("/api/inventory");
      const data = await res.json();
      if (data.ok) setItems(data.items);
    } catch { /* silent */ } finally { setLoading(false); }
  }

  async function fetchLogs() {
    try {
      const res = await fetch("/api/inventory/logs?limit=20");
      const data = await res.json();
      if (data.ok) setLogs(data.logs || []);
    } catch { /* silent */ }
  }

  async function handleAction(itemId: string, action: "use" | "save", itemType: string) {
    setConfirmItem({ id: itemId, action, type: itemType });
  }

  async function confirmAction() {
    if (!confirmItem) return;
    const { id: itemId, action, type: itemType } = confirmItem;
    setConfirmItem(null);
    setActionLoading(itemId);
    setMessage("");
    try {
      const res = await fetch("/api/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId, action }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage(action === "use" ? "Package claimed! Staff have been notified." : "Package saved for next wipe!");
        fetchInventory(); fetchLogs();
      } else {
        setMessage(data.error || "Failed to process item");
      }
    } catch { setMessage("Network error"); }
    finally { setActionLoading(null); }
  }

  const availableItems = items.filter(i => i.status === "available");
  const savedItems    = items.filter(i => i.status === "saved");
  const usedItems     = items.filter(i => i.status === "used");

  return (
    <div className="relative overflow-hidden rounded-2xl border border-teal-500/20 bg-gradient-to-b from-slate-900 to-slate-950 shadow-[0_0_40px_rgba(20,184,166,0.08)]">

      {/* ── Confirm modal ── */}
      {confirmItem && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm rounded-2xl">
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-teal-500/30 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-1 text-sm font-bold uppercase tracking-widest text-teal-400">Confirm Action</div>
            <p className="mb-5 text-sm text-slate-300">
              {confirmItem.action === "use"
                ? confirmItem.type === "insurance"
                  ? "Use this insurance? Staff will process your claim."
                  : "Use this package now? Staff will be notified to deliver it."
                : "Save this package for the next wipe?"}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmItem(null)}
                className="flex-1 h-10 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold text-slate-400 hover:bg-white/10 transition">
                Cancel
              </button>
              <button onClick={confirmAction}
                className="flex-1 h-10 rounded-xl border border-teal-500/40 bg-teal-500/20 text-sm font-bold text-teal-300 hover:bg-teal-500/30 transition">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header banner ── */}
      <div className="relative overflow-hidden border-b border-teal-500/20 bg-gradient-to-r from-slate-900 via-teal-950/40 to-slate-900 px-6 pt-6 pb-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(20,184,166,0.15),transparent_70%)]" />
        <div className="relative">
          <div className="mb-0.5 text-[11px] font-bold uppercase tracking-[0.25em] text-teal-400/70">Inventory System</div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-white">
            YOUR <span className="text-teal-400">PACKAGES</span>
          </h2>
          <p className="mt-1 text-sm text-slate-400">Manage your packages directly from the website.</p>
        </div>
      </div>

      {/* ── Feature highlights ── */}
      <div className="grid grid-cols-2 gap-px border-b border-teal-500/10 sm:grid-cols-4">
        {[
          { icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          ), title: "SAVE FOR NEXT WIPE", desc: "Save your packages for the next wipe." },
          { icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          ), title: "USE INSTANTLY", desc: "Use your packages immediately." },
          { icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
            </svg>
          ), title: "VIEW HISTORY", desc: "Check your package history." },
          { icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ), title: "FAST DELIVERY", desc: "Quick delivery after staff confirmation." },
        ].map((f) => (
          <div key={f.title} className="flex flex-col items-center gap-2 bg-slate-950/40 px-4 py-4 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-teal-500/25 bg-teal-500/10 text-teal-400">
              {f.icon}
            </div>
            <div className="text-[9px] font-black uppercase tracking-widest text-teal-400">{f.title}</div>
            <div className="text-[10px] leading-tight text-slate-500">{f.desc}</div>
          </div>
        ))}
      </div>

      {/* ── Main inventory panel ── */}
      <div className="p-5">

        {/* Panel header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CrateIcon className="h-5 w-5 text-teal-400" />
            <span className="text-xs font-black uppercase tracking-widest text-teal-400">Inventory</span>
          </div>
          <button onClick={() => { setShowHistory(!showHistory); if (!showHistory) fetchLogs(); }}
            className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-teal-400 transition">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
            </svg>
            {showHistory ? "Hide History" : "Show History"}
          </button>
        </div>

        {/* Status message */}
        {message && (
          <div className={`mb-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${
            message.toLowerCase().includes("error") || message.toLowerCase().includes("fail")
              ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
              : "border-teal-500/30 bg-teal-500/10 text-teal-300"
          }`}>
            {message.toLowerCase().includes("error") || message.toLowerCase().includes("fail")
              ? <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg>
              : <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            }
            {message}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="py-8 text-center text-sm text-slate-500 animate-pulse">Loading inventory…</div>
        )}

        {/* Empty state */}
        {!loading && items.length === 0 && !showHistory && (
          <div className="rounded-xl border border-white/5 bg-slate-950/50 py-10 text-center">
            <CrateIcon className="mx-auto mb-3 h-12 w-12 text-slate-700" />
            <div className="text-sm font-semibold text-slate-500">No packages in inventory</div>
            <div className="mt-1 text-xs text-slate-600">Purchase packs from the store to see them here.</div>
          </div>
        )}

        {/* ── Available ── */}
        {availableItems.length > 0 && (
          <div className="mb-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-400 shadow-[0_0_6px_rgba(20,184,166,0.8)]" />
              <span className="text-[11px] font-black uppercase tracking-widest text-teal-400">
                Available ({availableItems.length})
              </span>
            </div>
            <div className="space-y-3">
              {availableItems.map((item) => (
                <div key={item.id}
                  className="overflow-hidden rounded-xl border border-teal-500/25 bg-gradient-to-r from-slate-900 to-slate-950 shadow-[inset_0_1px_0_rgba(20,184,166,0.08)]">
                  <div className="flex items-start gap-4 p-4">
                    {/* Crate visual */}
                    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-teal-500/20 bg-gradient-to-b from-slate-800 to-slate-900 shadow-inner">
                      <CrateIcon className="h-10 w-10 text-teal-500" />
                      <div className="absolute inset-0 rounded-lg bg-gradient-to-t from-teal-500/5 to-transparent" />
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-bold text-white">{item.item_name}</span>
                        {item.metadata?.given_by && (
                          <span className="flex items-center gap-1 rounded-full border border-violet-400/25 bg-violet-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-violet-300">
                            🎁 Admin Gift
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {item.metadata?.given_by ? "Received" : "Purchased"}{" "}
                        {new Date(item.purchase_date).toLocaleDateString()}
                        {item.wipe_cycle && <> · <span className="text-slate-400">{item.wipe_cycle}</span></>}
                      </div>
                      {item.metadata?.reason && (
                        <div className="mt-1 text-xs text-violet-400">Reason: {item.metadata.reason}</div>
                      )}
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <svg className="h-3.5 w-3.5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">Available</span>
                      </div>
                    </div>
                  </div>
                  {/* Action buttons */}
                  <div className="grid grid-cols-2 gap-px border-t border-teal-500/10">
                    <button
                      onClick={() => handleAction(item.id, "use", item.item_type)}
                      disabled={!!actionLoading}
                      className="flex items-center justify-center gap-2 bg-slate-950/60 py-3 text-xs font-black uppercase tracking-widest text-slate-300 transition hover:bg-teal-500/10 hover:text-teal-300 disabled:opacity-40 border-r border-teal-500/10">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"/>
                      </svg>
                      {actionLoading === item.id ? "Processing…" : item.item_type === "insurance" ? "Use Insurance" : "Use Package"}
                    </button>
                    <button
                      onClick={() => handleAction(item.id, "save", item.item_type)}
                      disabled={!!actionLoading}
                      className="flex items-center justify-center gap-2 bg-slate-950/60 py-3 text-xs font-black uppercase tracking-widest text-rose-400 transition hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-40">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m9 4.125L12 15m0 0l-2.25-2.25M12 15V9"/>
                      </svg>
                      Save for Next Wipe
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Saved ── */}
        {savedItems.length > 0 && (
          <div className="mb-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              <span className="text-[11px] font-black uppercase tracking-widest text-amber-400">
                Saved for Next Wipe ({savedItems.length})
              </span>
            </div>
            <div className="space-y-2">
              {savedItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                  <CrateIcon className="h-7 w-7 shrink-0 text-amber-400/70" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{item.item_name}</div>
                    <div className="text-xs text-slate-500">Received {new Date(item.purchase_date).toLocaleDateString()}</div>
                  </div>
                  <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-300">Saved</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Used ── */}
        {usedItems.length > 0 && (
          <div className="mb-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                Used ({usedItems.length})
              </span>
            </div>
            <div className="space-y-2 opacity-50">
              {usedItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/3 px-4 py-3">
                  <CrateIcon className="h-7 w-7 shrink-0 text-slate-600" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-400 line-through truncate">{item.item_name}</div>
                    <div className="text-xs text-slate-600">
                      Used {item.used_date ? new Date(item.used_date).toLocaleDateString() : "N/A"}
                    </div>
                  </div>
                  <span className="rounded-full border border-white/8 bg-white/5 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-500">Used</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── History ── */}
        {showHistory && (
          <div className="mt-2 rounded-xl border border-white/6 bg-slate-950/60">
            <div className="flex items-center gap-2 border-b border-white/6 px-4 py-3">
              <svg className="h-4 w-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span className="text-[11px] font-black uppercase tracking-widest text-teal-400">Activity History</span>
            </div>
            {logs.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-600">No activity yet.</div>
            ) : (
              <div className="max-h-72 divide-y divide-white/4 overflow-y-auto scrollbar-none">
                {logs.map((log) => {
                  const meta = actionLabels[log.action] || { label: log.action, color: "text-slate-400" };
                  const date = new Date(log.action_at);
                  const showReason = log.details?.reason && !["User initiated","Admin given"].includes(log.details.reason);
                  return (
                    <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-white/3 transition">
                      <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current" style={{ color: "inherit" }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className={`text-[10px] font-black uppercase tracking-wider ${meta.color}`}>{meta.label}</span>
                          <span className="text-sm font-medium text-white truncate">{log.item_name}</span>
                        </div>
                        {(showReason || log.action_by_name) && (
                          <div className="mt-0.5 text-xs text-slate-500">
                            {log.action_by_name && <span>From {log.action_by_name}{showReason ? " · " : ""}</span>}
                            {showReason && <span>{log.details.reason}</span>}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 text-right text-[10px] text-slate-600">
                        <div>{date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
                        <div>{date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Warning footer ── */}
      <div className="flex items-start gap-3 border-t border-amber-500/15 bg-amber-500/5 px-5 py-4">
        <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
        </svg>
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Important</span>
          <p className="mt-0.5 text-xs text-slate-400">All packages still require confirmation with an admin before delivery.</p>
        </div>
      </div>
    </div>
  );
}
