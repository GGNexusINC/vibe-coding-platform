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
};

export function InventorySection() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchInventory();
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

  async function handleUseItem(itemId: string) {
    if (!confirm("Use this insurance? This will notify staff to process your claim.")) return;
    
    setActionLoading(itemId);
    setMessage("");

    try {
      const res = await fetch("/api/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId, action: "use" }),
      });

      const data = await res.json();
      
      if (data.ok) {
        setMessage("✅ Insurance claimed! Staff have been notified.");
        fetchInventory(); // Refresh
      } else {
        setMessage(`❌ ${data.error || "Failed to use item"}`);
      }
    } catch (e) {
      setMessage("❌ Network error");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSaveItem(itemId: string) {
    if (!confirm("Save this insurance for next wipe? You can use it later.")) return;
    
    setActionLoading(itemId);
    setMessage("");

    try {
      const res = await fetch("/api/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId, action: "save" }),
      });

      const data = await res.json();
      
      if (data.ok) {
        setMessage("✅ Insurance saved for next wipe!");
        fetchInventory(); // Refresh
      } else {
        setMessage(`❌ ${data.error || "Failed to save item"}`);
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

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-6">
        <div className="text-sm text-stone-400">Loading inventory...</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-6">
        <div className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-stone-500 mb-3">▶ INVENTORY</div>
        <div className="text-sm text-stone-400">No items in inventory. Purchase packs from the store!</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-6">
      <div className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-stone-500 mb-4">▶ INVENTORY</div>
      
      {message && (
        <div className={`mb-4 rounded-xl px-4 py-3 text-sm ${message.startsWith("✅") ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" : "bg-rose-500/15 text-rose-400 border border-rose-500/25"}`}>
          {message}
        </div>
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
                    <div className="font-semibold text-white">{item.item_name}</div>
                    <div className="text-xs text-stone-400">
                      Purchased {new Date(item.purchase_date).toLocaleDateString()}
                      {item.wipe_cycle && ` • ${item.wipe_cycle}`}
                    </div>
                  </div>
                  <span className="rounded-full px-2 py-1 text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Available
                  </span>
                </div>
                
                {item.item_type === "insurance" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUseItem(item.id)}
                      disabled={actionLoading === item.id}
                      className="flex-1 h-9 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-400 text-sm font-semibold hover:bg-rose-500/30 transition disabled:opacity-50"
                    >
                      {actionLoading === item.id ? "Processing..." : "🛡️ Use Insurance"}
                    </button>
                    <button
                      onClick={() => handleSaveItem(item.id)}
                      disabled={actionLoading === item.id}
                      className="flex-1 h-9 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-semibold hover:bg-amber-500/30 transition disabled:opacity-50"
                    >
                      💾 Save for Next Wipe
                    </button>
                  </div>
                )}
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
        <div>
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
    </div>
  );
}
