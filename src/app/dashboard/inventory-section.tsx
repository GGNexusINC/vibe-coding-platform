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

export function InventorySection() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [logs, setLogs] = useState<PackageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchInventory();
    fetchLogs();
  }, []);

  async function fetchInventory() {
    try {
      const res = await fetch("/api/inventory");
      const data = await res.json();
      if (data.ok) {
        setItems(data.items);
      }
    } catch (e) {
      console.error("Failed to fetch inventory:", e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchLogs() {
    try {
      const res = await fetch("/api/inventory/logs?limit=20");
      const data = await res.json();
      if (data.ok) setLogs(data.logs || []);
    } catch (e) {
      console.error("Failed to fetch logs:", e);
    }
  }

  async function handleAction(itemId: string, action: "use" | "save", itemType: string) {
    const confirmMsg = action === "use" 
      ? (itemType === "insurance" 
          ? "Use this insurance? This will notify staff to process your claim."
          : "Use this package now? Staff will be notified to deliver it.")
      : "Save this item for next wipe? You can use it later.";
    
    if (!confirm(confirmMsg)) return;

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
        setMessage(action === "use" ? "✅ Package claimed! Staff have been notified." : "✅ Package saved for next wipe!");
        fetchInventory();
        fetchLogs();
      } else {
        setMessage(`❌ ${data.error || "Failed to process item"}`);
      }
    } catch (e) {
      setMessage("❌ Network error");
    } finally {
      setActionLoading(null);
    }
  }

  const availableItems = items.filter(i => i.status === "available");
  const savedItems = items.filter(i => i.status === "saved");
  const usedItems = items.filter(i => i.status === "used");

  const actionLabels: Record<string, { label: string; icon: string; color: string }> = {
    admin_given: { label: "Received", icon: "🎁", color: "text-emerald-400" },
    user_used: { label: "Used", icon: "✅", color: "text-amber-400" },
    user_saved: { label: "Saved", icon: "💾", color: "text-cyan-400" },
    admin_revoked: { label: "Revoked", icon: "🗑️", color: "text-rose-400" },
    admin_restored: { label: "Restored", icon: "♻️", color: "text-violet-400" },
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-6">
        <div className="text-sm text-stone-400">Loading inventory...</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-stone-500">▶ INVENTORY</div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="text-xs text-cyan-400 hover:text-cyan-300"
        >
          {showHistory ? "Hide History" : "📜 Show History"}
        </button>
      </div>

      {message && (
        <div className={`mb-4 rounded-xl px-4 py-3 text-sm ${message.startsWith("✅") ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" : "bg-rose-500/15 text-rose-400 border border-rose-500/25"}`}>
          {message}
        </div>
      )}

      {items.length === 0 && !showHistory && (
        <div className="text-sm text-stone-400">No items in inventory. Purchase packs from the store!</div>
      )}

      {/* Available Items */}
      {availableItems.length > 0 && (
        <div className="mb-6">
          <div className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Available ({availableItems.length})
          </div>
          <div className="space-y-3">
            {availableItems.map((item) => (
              <div key={item.id} className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-semibold text-white flex items-center gap-2">
                      {item.item_name}
                      {item.metadata?.given_by && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300">
                          🎁 Admin Gift
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-stone-400">
                      {item.metadata?.given_by ? "Received" : "Purchased"} {new Date(item.purchase_date).toLocaleDateString()}
                      {item.wipe_cycle && ` • ${item.wipe_cycle}`}
                    </div>
                    {item.metadata?.reason && (
                      <div className="text-xs text-violet-300 mt-1">Reason: {item.metadata.reason}</div>
                    )}
                  </div>
                  <span className="rounded-full px-2 py-1 text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Available
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction(item.id, "use", item.item_type)}
                    disabled={actionLoading === item.id}
                    className="flex-1 h-9 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-400 text-sm font-semibold hover:bg-rose-500/30 transition disabled:opacity-50"
                  >
                    {actionLoading === item.id ? "Processing..." : 
                      item.item_type === "insurance" ? "🛡️ Use Insurance" : "📦 Use Package"}
                  </button>
                  <button
                    onClick={() => handleAction(item.id, "save", item.item_type)}
                    disabled={actionLoading === item.id}
                    className="flex-1 h-9 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-semibold hover:bg-amber-500/30 transition disabled:opacity-50"
                  >
                    💾 Save for Next Wipe
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Saved Items */}
      {savedItems.length > 0 && (
        <div className="mb-6">
          <div className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Saved for Next Wipe ({savedItems.length})
          </div>
          <div className="space-y-2">
            {savedItems.map((item) => (
              <div key={item.id} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white text-sm">{item.item_name}</div>
                    <div className="text-xs text-stone-400">
                      Purchased {new Date(item.purchase_date).toLocaleDateString()}
                    </div>
                  </div>
                  <span className="rounded-full px-2 py-1 text-[10px] font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    Saved
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Used Items */}
      {usedItems.length > 0 && (
        <div className="mb-6">
          <div className="text-sm font-semibold text-stone-400 mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-stone-400" />
            Used ({usedItems.length})
          </div>
          <div className="space-y-2 opacity-60">
            {usedItems.map((item) => (
              <div key={item.id} className="rounded-xl border border-stone-500/20 bg-stone-500/5 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white text-sm line-through">{item.item_name}</div>
                    <div className="text-xs text-stone-500">
                      Used {item.used_date ? new Date(item.used_date).toLocaleDateString() : "N/A"}
                    </div>
                  </div>
                  <span className="rounded-full px-2 py-1 text-[10px] font-bold uppercase bg-stone-500/20 text-stone-400 border border-stone-500/30">
                    Used
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {showHistory && (
        <div className="pt-4 border-t border-white/10">
          <div className="text-sm font-semibold text-cyan-400 mb-3">📜 Activity History</div>
          {logs.length === 0 ? (
            <div className="text-sm text-stone-500">No activity yet.</div>
          ) : (
            <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
              {logs.map((log) => {
                const meta = actionLabels[log.action] || { label: log.action, icon: "📝", color: "text-slate-400" };
                const date = new Date(log.action_at);
                const dateStr = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
                const timeStr = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
                const showReason = log.details?.reason &&
                  log.details.reason !== "User initiated" &&
                  log.details.reason !== "Admin given";

                return (
                  <div key={log.id} className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-white/3 transition">
                    <span className="text-base mt-0.5">{meta.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className={`text-xs font-bold uppercase tracking-wide ${meta.color}`}>{meta.label}</span>
                        <span className="text-sm text-white font-medium truncate">{log.item_name}</span>
                      </div>
                      {(showReason || (log.action === "admin_given" && log.action_by_name)) && (
                        <div className="text-xs text-stone-500 mt-0.5">
                          {log.action === "admin_given" && log.action_by_name && (
                            <span>From {log.action_by_name}{showReason ? " · " : ""}</span>
                          )}
                          {showReason && <span>{log.details.reason}</span>}
                        </div>
                      )}
                    </div>
                    <div className="text-right text-[11px] text-stone-600 shrink-0">
                      <div>{dateStr}</div>
                      <div>{timeStr}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
