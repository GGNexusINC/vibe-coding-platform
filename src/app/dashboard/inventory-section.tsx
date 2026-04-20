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

function CrateIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none">
      <rect x="4" y="22" width="56" height="34" rx="3" fill="#0f172a" stroke="#14b8a6" strokeWidth="1.5"/>
      <rect x="4" y="14" width="56" height="11" rx="2" fill="#134e4a" stroke="#14b8a6" strokeWidth="1.5"/>
      <line x1="32" y1="22" x2="32" y2="56" stroke="#14b8a6" strokeWidth="1.5" strokeDasharray="4 3" strokeOpacity="0.5"/>
      <line x1="4" y1="39" x2="60" y2="39" stroke="#14b8a6" strokeWidth="1" strokeOpacity="0.3"/>
      <rect x="25" y="33" width="14" height="9" rx="2" fill="#134e4a" stroke="#14b8a6" strokeWidth="1.5"/>
      <rect x="28" y="35" width="8" height="5" rx="1" fill="#14b8a6" fillOpacity="0.3"/>
    </svg>
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
    <div className="relative overflow-hidden rounded-xl border border-teal-500/30 bg-[#0a0f1a] shadow-[0_0_0_1px_rgba(20,184,166,0.08),0_8px_32px_rgba(0,0,0,0.6)]">

      {/* Corner accent lines — top-left */}
      <div className="pointer-events-none absolute left-0 top-0 h-6 w-6">
        <div className="absolute left-0 top-0 h-px w-6 bg-teal-400/60" />
        <div className="absolute left-0 top-0 h-6 w-px bg-teal-400/60" />
      </div>
      {/* Corner accent lines — top-right */}
      <div className="pointer-events-none absolute right-0 top-0 h-6 w-6">
        <div className="absolute right-0 top-0 h-px w-6 bg-teal-400/60" />
        <div className="absolute right-0 top-0 h-6 w-px bg-teal-400/60" />
      </div>
      {/* Corner accent lines — bottom-left */}
      <div className="pointer-events-none absolute bottom-0 left-0 h-6 w-6">
        <div className="absolute bottom-0 left-0 h-px w-6 bg-teal-400/40" />
        <div className="absolute bottom-0 left-0 h-6 w-px bg-teal-400/40" />
      </div>
      {/* Corner accent lines — bottom-right */}
      <div className="pointer-events-none absolute bottom-0 right-0 h-6 w-6">
        <div className="absolute bottom-0 right-0 h-px w-6 bg-teal-400/40" />
        <div className="absolute bottom-0 right-0 h-6 w-px bg-teal-400/40" />
      </div>

      {/* ── Confirm modal ── */}
      {confirmItem && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-xl border border-teal-500/30 bg-[#0d1521] p-6 shadow-2xl">
            <div className="mb-1 text-[11px] font-black uppercase tracking-[0.2em] text-teal-400">Confirm Action</div>
            <p className="mb-5 text-sm text-slate-300">
              {confirmItem.action === "use"
                ? confirmItem.type === "insurance"
                  ? "Use this insurance? Staff will process your claim."
                  : "Use this package now? Staff will be notified to deliver it."
                : "Save this package for the next wipe?"}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmItem(null)}
                className="flex-1 h-10 rounded-lg border border-white/10 bg-white/5 text-sm font-semibold text-slate-400 hover:bg-white/10 transition">
                Cancel
              </button>
              <button onClick={confirmAction}
                className="flex-1 h-10 rounded-lg border border-teal-500/50 bg-teal-500/15 text-sm font-bold text-teal-300 hover:bg-teal-500/25 transition">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-teal-500/20 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded border border-teal-500/30 bg-teal-500/10">
            <CrateIcon className="h-4 w-4" />
          </div>
          <span className="text-xs font-black uppercase tracking-[0.2em] text-teal-300">Inventory</span>
        </div>
        <button
          onClick={() => { setShowHistory(!showHistory); if (!showHistory) fetchLogs(); }}
          className="flex items-center gap-1.5 rounded border border-white/8 bg-white/4 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 transition hover:border-teal-500/30 hover:text-teal-400">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          {showHistory ? "Hide History" : "Show History"}
        </button>
      </div>

      {/* ── Body ── */}
      <div className="p-4 space-y-3">

        {/* Status message */}
        {message && (
          <div className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold ${
            message.toLowerCase().includes("error") || message.toLowerCase().includes("fail")
              ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
              : "border-teal-500/30 bg-teal-500/10 text-teal-300"
          }`}>
            {message}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="py-8 text-center text-xs text-slate-600 animate-pulse">Loading inventory…</div>
        )}

        {/* Empty */}
        {!loading && items.length === 0 && !showHistory && (
          <div className="py-10 text-center">
            <CrateIcon className="mx-auto mb-3 h-10 w-10 opacity-20" />
            <div className="text-xs font-semibold text-slate-600">No packages in inventory</div>
            <div className="mt-1 text-[11px] text-slate-700">Purchase packs from the store to see them here.</div>
          </div>
        )}

        {/* ── Available ── */}
        {availableItems.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-teal-400 shadow-[0_0_4px_rgba(20,184,166,1)]" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-400">
                Available ({availableItems.length})
              </span>
            </div>
            <div className="space-y-2">
              {availableItems.map((item) => (
                <div key={item.id} className="overflow-hidden rounded-lg border border-teal-500/20 bg-[#0d1521]">
                  {/* Item row */}
                  <div className="flex items-center gap-3 p-3">
                    {/* Crate thumbnail */}
                    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded border border-teal-500/20 bg-gradient-to-b from-slate-800/80 to-slate-900/80">
                      <CrateIcon className="h-9 w-9" />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-teal-500/10 to-transparent" />
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                        <span className="text-sm font-bold text-white leading-tight">{item.item_name}</span>
                        {item.metadata?.given_by && (
                          <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-violet-500/15 text-violet-300 border border-violet-500/20">
                            🎁 Admin Gift
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {item.metadata?.given_by ? "Received" : "Purchased"}{" "}
                        {new Date(item.purchase_date).toLocaleDateString()}
                        {item.wipe_cycle && <> · <span className="text-slate-400">{item.wipe_cycle}</span></>}
                      </div>
                      {item.metadata?.reason && (
                        <div className="mt-0.5 text-[11px] text-violet-400/80">Reason: {item.metadata.reason}</div>
                      )}
                      <div className="mt-1 flex items-center gap-1">
                        <svg className="h-3 w-3 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <span className="text-[9px] font-black uppercase tracking-wider text-teal-400">Available</span>
                      </div>
                    </div>
                  </div>
                  {/* Action buttons */}
                  <div className="grid grid-cols-2 border-t border-teal-500/10">
                    <button
                      onClick={() => handleAction(item.id, "use", item.item_type)}
                      disabled={!!actionLoading}
                      className="flex items-center justify-center gap-2 border-r border-teal-500/10 bg-teal-500/5 py-2.5 text-[10px] font-black uppercase tracking-widest text-teal-300 transition hover:bg-teal-500/15 disabled:opacity-40">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"/>
                      </svg>
                      {actionLoading === item.id ? "Processing…" : item.item_type === "insurance" ? "Use Insurance" : "Use Package"}
                    </button>
                    <button
                      onClick={() => handleAction(item.id, "save", item.item_type)}
                      disabled={!!actionLoading}
                      className="flex items-center justify-center gap-2 bg-rose-500/5 py-2.5 text-[10px] font-black uppercase tracking-widest text-rose-400 transition hover:bg-rose-500/12 disabled:opacity-40">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"/>
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
          <div>
            <div className="mb-2 flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-amber-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">
                Saved for Next Wipe ({savedItems.length})
              </span>
            </div>
            <div className="space-y-1.5">
              {savedItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-lg border border-amber-500/15 bg-amber-500/5 px-3 py-2.5">
                  <CrateIcon className="h-6 w-6 shrink-0 opacity-60" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-white truncate">{item.item_name}</div>
                    <div className="text-[10px] text-slate-600">{new Date(item.purchase_date).toLocaleDateString()}</div>
                  </div>
                  <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">Saved</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Used ── */}
        {usedItems.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-slate-600" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
                Used ({usedItems.length})
              </span>
            </div>
            <div className="space-y-1.5 opacity-40">
              {usedItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/3 px-3 py-2.5">
                  <CrateIcon className="h-6 w-6 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-500 line-through truncate">{item.item_name}</div>
                    <div className="text-[10px] text-slate-700">Used {item.used_date ? new Date(item.used_date).toLocaleDateString() : "—"}</div>
                  </div>
                  <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-white/5 text-slate-600 border border-white/8">Used</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── History ── */}
        {showHistory && (
          <div className="rounded-lg border border-white/6 bg-black/30">
            <div className="border-b border-white/6 px-3 py-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-400">Activity History</span>
            </div>
            {logs.length === 0 ? (
              <div className="py-5 text-center text-[11px] text-slate-700">No activity yet.</div>
            ) : (
              <div className="max-h-64 divide-y divide-white/4 overflow-y-auto scrollbar-none">
                {logs.map((log) => {
                  const meta = actionLabels[log.action] || { label: log.action, color: "text-slate-400" };
                  const date = new Date(log.action_at);
                  const showReason = log.details?.reason && !["User initiated","Admin given"].includes(log.details.reason);
                  return (
                    <div key={log.id} className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-white/3 transition">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-baseline gap-1.5">
                          <span className={`text-[9px] font-black uppercase tracking-wider ${meta.color}`}>{meta.label}</span>
                          <span className="text-xs font-medium text-white truncate">{log.item_name}</span>
                        </div>
                        {(showReason || log.action_by_name) && (
                          <div className="mt-0.5 text-[10px] text-slate-600">
                            {log.action_by_name && <span>From {log.action_by_name}{showReason ? " · " : ""}</span>}
                            {showReason && <span>{log.details.reason}</span>}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 text-right text-[9px] text-slate-700">
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
      <div className="flex items-center gap-2.5 border-t border-amber-500/15 bg-amber-500/5 px-4 py-3">
        <svg className="h-4 w-4 shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
        </svg>
        <div>
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400">Important</span>
          <p className="text-[10px] text-slate-500">All packages still require confirmation with an admin before delivery.</p>
        </div>
      </div>
    </div>
  );
}
