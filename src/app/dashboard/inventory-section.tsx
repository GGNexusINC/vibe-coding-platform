"use client";

import { useEffect, useMemo, useState } from "react";
import { TicketChat } from "@/app/support/ticket-chat";
import { getOnceHumanItemArt } from "@/lib/once-human-items";

type InventoryItem = {
  id: string;
  item_type: string;
  item_slug: string;
  item_name: string;
  status: "available" | "used" | "saved" | "expired";
  purchase_date: string;
  used_date?: string;
  wipe_cycle?: string;
  expires_at?: string | null;
  metadata?: Record<string, any>;
};

type PackageLog = {
  id: string;
  item_name: string;
  item_type: string;
  action: string;
  action_at: string;
  action_by_name?: string;
  details?: Record<string, any>;
};

const actionLabels: Record<string, { label: string; color: string }> = {
  admin_given: { label: "Received", color: "text-teal-300" },
  user_used: { label: "Used", color: "text-amber-300" },
  user_saved: { label: "Saved", color: "text-cyan-300" },
  admin_revoked: { label: "Revoked", color: "text-rose-300" },
  admin_restored: { label: "Restored", color: "text-violet-300" },
};

const typeStyles: Record<string, {
  label: string;
  accent: string;
  glow: string;
  panel: string;
  icon: string;
}> = {
  insurance: {
    label: "Insurance",
    accent: "from-sky-300 via-cyan-300 to-teal-300",
    glow: "shadow-cyan-500/20",
    panel: "border-cyan-400/25 bg-cyan-950/20",
    icon: "shield",
  },
  defense: {
    label: "Defense",
    accent: "from-lime-300 via-emerald-300 to-teal-300",
    glow: "shadow-emerald-500/20",
    panel: "border-emerald-400/25 bg-emerald-950/20",
    icon: "crate",
  },
  tactical: {
    label: "Tactical",
    accent: "from-orange-300 via-amber-300 to-yellow-300",
    glow: "shadow-amber-500/20",
    panel: "border-amber-400/25 bg-amber-950/20",
    icon: "ammo",
  },
  construction: {
    label: "Construction",
    accent: "from-zinc-200 via-stone-300 to-orange-200",
    glow: "shadow-stone-500/20",
    panel: "border-stone-300/20 bg-stone-950/25",
    icon: "beam",
  },
  pack: {
    label: "Package",
    accent: "from-fuchsia-300 via-violet-300 to-cyan-300",
    glow: "shadow-violet-500/20",
    panel: "border-violet-400/25 bg-violet-950/20",
    icon: "crate",
  },
};

function styleForType(type: string) {
  return typeStyles[type] ?? typeStyles.pack;
}

function ItemIcon({ type, className = "" }: { type: string; className?: string }) {
  const style = styleForType(type);

  if (style.icon === "shield") {
    return (
      <svg className={className} viewBox="0 0 64 64" fill="none">
        <path d="M32 6 52 14v15c0 13.5-8.2 23.2-20 29C20.2 52.2 12 42.5 12 29V14L32 6Z" fill="currentColor" fillOpacity=".16" stroke="currentColor" strokeWidth="2" />
        <path d="M32 16v31M22 29h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (style.icon === "ammo") {
    return (
      <svg className={className} viewBox="0 0 64 64" fill="none">
        <rect x="14" y="14" width="36" height="38" rx="4" fill="currentColor" fillOpacity=".14" stroke="currentColor" strokeWidth="2" />
        <path d="M22 23h20M22 32h20M22 41h13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M44 14v38" stroke="currentColor" strokeWidth="1.5" strokeOpacity=".35" />
      </svg>
    );
  }

  if (style.icon === "beam") {
    return (
      <svg className={className} viewBox="0 0 64 64" fill="none">
        <path d="M12 44 42 14l10 10-30 30H12V44Z" fill="currentColor" fillOpacity=".16" stroke="currentColor" strokeWidth="2" />
        <path d="m36 20 8 8M28 28l8 8M20 36l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg className={className} viewBox="0 0 64 64" fill="none">
      <path d="M8 22h48v30a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V22Z" fill="currentColor" fillOpacity=".13" stroke="currentColor" strokeWidth="2" />
      <path d="M14 12h36l6 10H8l6-10Z" fill="currentColor" fillOpacity=".22" stroke="currentColor" strokeWidth="2" />
      <path d="M32 22v34M8 38h48" stroke="currentColor" strokeOpacity=".45" strokeWidth="1.5" />
      <rect x="25" y="33" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function getClaimTimer(item: InventoryItem) {
  const expiresAt = item.expires_at || item.metadata?.reward_claim_expires_at || null;
  if (!expiresAt) return null;

  const startedAt = new Date(item.purchase_date).getTime();
  const expires = new Date(expiresAt).getTime();
  const now = Date.now();
  const total = Math.max(1, expires - startedAt);
  const remaining = expires - now;

  if (remaining <= 0) {
    return { label: "Expired", percent: 0, urgent: true };
  }

  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const label = hours >= 24
    ? `${Math.floor(hours / 24)}d ${hours % 24}h left`
    : `${hours}h ${minutes}m left`;

  return {
    label,
    percent: Math.max(3, Math.min(100, Math.round((remaining / total) * 100))),
    urgent: remaining < 6 * 3600000,
  };
}



function getInventoryArt(item: InventoryItem) {
  const metadataImage =
    typeof item.metadata?.item_image_url === "string"
      ? item.metadata.item_image_url
      : typeof item.metadata?.image_url === "string"
        ? item.metadata.image_url
        : null;
  const metadataSource =
    typeof item.metadata?.item_art_source_url === "string" ? item.metadata.item_art_source_url : null;
  const fallbackArt = getOnceHumanItemArt(
    typeof item.metadata?.reward_prize === "string" ? item.metadata.reward_prize : item.item_name,
  );

  if (metadataImage) {
    return {
      image: metadataImage,
      sourceName:
        typeof item.metadata?.item_art_source_name === "string"
          ? item.metadata.item_art_source_name
          : fallbackArt?.sourceName,
      sourceUrl: metadataSource ?? fallbackArt?.sourceUrl,
    };
  }

  return fallbackArt;
}

function InventoryCard({
  item,
  actionLoading,
  onAction,
}: {
  item: InventoryItem;
  actionLoading: string | null;
  onAction: (itemId: string, action: "use" | "save", itemType: string) => void;
}) {
  const style = styleForType(item.item_type);
  const timer = getClaimTimer(item);
  const isReward = Boolean(item.metadata?.reward_source);
  const art = getInventoryArt(item);
  const disabled = Boolean(actionLoading);
  const muted = item.status === "used" || item.status === "expired";

  return (
    <article className={`group relative flex flex-col overflow-hidden rounded-[2rem] border border-white/6 bg-slate-900/40 transition-all duration-500 hover:border-white/10 hover:bg-slate-900/60 hover:shadow-2xl hover:shadow-black/50 ${muted ? "opacity-40 grayscale" : ""}`}>
      {/* Visual Accents */}
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${style.accent} opacity-40 group-hover:opacity-100 transition-opacity`} />
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/5 blur-2xl group-hover:bg-white/10 transition-colors" />

      <div className="flex flex-col p-5">
        {/* Top row: Art & Meta */}
        <div className="flex items-start gap-4">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-white/5 bg-slate-950 p-2 shadow-inner group-hover:border-white/10 transition-colors">
            {art?.image ? (
              <img
                src={art.image}
                alt=""
                className="h-full w-full object-contain drop-shadow-[0_0_12px_rgba(255,255,255,0.1)] group-hover:scale-105 transition-transform"
              />
            ) : (
              <ItemIcon type={item.item_type} className="h-10 w-10 text-slate-500" />
            )}
            {/* Condition badge */}
            <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-lg border border-slate-900 bg-slate-800 text-[10px] font-black text-white shadow-lg">
              {item.status === "available" ? "★" : item.status === "saved" ? "S" : "✓"}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-white/5 bg-white/5 text-slate-400`}>
                {style.label}
              </span>
              {isReward && (
                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-400">
                  Reward
                </span>
              )}
              {item.metadata?.given_by && (
                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-violet-500/20 bg-violet-500/10 text-violet-400">
                  Gift
                </span>
              )}
            </div>
            <h3 className="truncate text-lg font-black tracking-tight text-white group-hover:text-cyan-100 transition-colors">
              {item.item_name}
            </h3>
            <div className="mt-1 flex items-center gap-2 text-[10px] font-bold text-slate-500">
              <span className="flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                {new Date(item.purchase_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
              {item.wipe_cycle && (
                <span className="flex items-center gap-1 border-l border-white/10 pl-2">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {item.wipe_cycle}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Reason or Claim Info */}
        {item.metadata?.reason && (
          <div className="mt-4 rounded-xl bg-white/[0.03] p-2.5 text-[11px] font-medium text-slate-400 border border-white/5 italic">
            "{item.metadata.reason}"
          </div>
        )}

        {/* Claim Timer */}
        {timer && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest">
              <span className="text-slate-500">Extraction Window</span>
              <span className={timer.urgent ? "text-rose-400 animate-pulse" : "text-cyan-400"}>{timer.label}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/5 border border-white/5">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${timer.urgent ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" : "bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]"}`}
                style={{ width: `${timer.percent}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        {item.status === "available" && (
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onAction(item.id, "use", item.item_type); }}
              disabled={disabled}
              className="flex items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/5 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-emerald-500/20 hover:border-emerald-500/30 hover:text-emerald-400 disabled:opacity-40 active:scale-95"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
              {actionLoading === item.id ? "..." : "Claim"}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onAction(item.id, "save", item.item_type); }}
              disabled={disabled}
              className="flex items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/5 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-amber-500/20 hover:border-amber-500/30 hover:text-amber-400 disabled:opacity-40 active:scale-95"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              Save
            </button>
          </div>
        )}

        {item.status === "saved" && (
          <div className="mt-5">
            <button
              onClick={(e) => { e.stopPropagation(); onAction(item.id, "use", item.item_type); }}
              disabled={disabled}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-cyan-400 transition hover:bg-cyan-500/20 hover:text-cyan-300 disabled:opacity-40 active:scale-95"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              {actionLoading === item.id ? "..." : "Reclaim to Current Wipe"}
            </button>
          </div>
        )}

        {muted && (
          <div className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
            {item.status === "used" ? "Successfully Extracted" : "Window Expired"}
          </div>
        )}
      </div>
    </article>
  );
}

export function InventorySection() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [logs, setLogs] = useState<PackageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"available" | "saved" | "archive" | "history">("available");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [activeTicket, setActiveTicket] = useState<{
    id: string;
    channelId: string;
    itemName?: string;
    itemType?: string;
    itemImage?: string;
  } | null>(null);
  const [confirmItem, setConfirmItem] = useState<{ id: string; action: "use" | "save"; type: string } | null>(null);

  useEffect(() => {
    fetchInventory();
    fetchLogs();
  }, []);

  useEffect(() => {
    const onRefresh = () => {
      fetchInventory();
      fetchLogs();
    };
    window.addEventListener("newhope:inventory-refresh", onRefresh);
    return () => window.removeEventListener("newhope:inventory-refresh", onRefresh);
  }, []);

  async function fetchInventory() {
    try {
      const res = await fetch("/api/inventory", { cache: "no-store" });
      const data = await res.json();
      if (data.ok) {
        setItems(data.items);
        // If the current tab is empty but another isn't, switch to the one with items
        const hasAvailable = data.items.some((i: any) => i.status === "available");
        const hasSaved = data.items.some((i: any) => i.status === "saved");
        if (!hasAvailable && hasSaved) setActiveTab("saved");
      }
    } catch {
      // Keep current
    } finally {
      setLoading(false);
    }
  }

  async function fetchLogs() {
    try {
      const res = await fetch("/api/inventory/logs?limit=30", { cache: "no-store" });
      const data = await res.json();
      if (data.ok) setLogs(data.logs || []);
    } catch {
      // Ignore
    }
  }

  function handleAction(itemId: string, action: "use" | "save", itemType: string) {
    setConfirmItem({ id: itemId, action, type: itemType });
  }

  async function openFallbackClaimTicket(itemName: string, itemType: string, itemImage?: string) {
    const subject = `Package claim: ${itemName}`;
    const body = [
      "I claimed this item from my inventory and need staff delivery.",
      `Item: ${itemName}`,
      `Type: ${itemType}`,
      "Claim source: Inventory",
    ].join("\n");

    const res = await fetch("/api/support/ticket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, message: body }),
    });
    const ticket = await res.json().catch(() => null);
    if (res.ok && ticket?.ticketId && ticket?.channelId) {
      setActiveTicket({ id: ticket.ticketId, channelId: ticket.channelId, itemName, itemType, itemImage });
      return true;
    }
    return false;
  }

  async function confirmAction() {
    if (!confirmItem) return;
    const { id: itemId, action, type: itemType } = confirmItem;
    const claimedItem = items.find((item) => item.id === itemId);
    const claimedItemName = claimedItem?.item_name ?? "Inventory item";
    const claimedItemType = claimedItem?.item_type ?? itemType;
    const claimedItemImage = getOnceHumanItemArt(claimedItemName)?.image ?? undefined;
    
    setConfirmItem(null);
    setActionLoading(itemId);
    setMessage("");
    if (action === "use") setActiveTicket(null);

    try {
      const res = await fetch("/api/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId, action }),
      });
      const data = await res.json();

      if (!data.ok) {
        setMessage(data.error || "Failed to process item.");
        return;
      }

      if (action === "use") {
        const ticket = data.support_ticket;
        if (ticket?.id && ticket?.channelId) {
          setActiveTicket({
            id: ticket.id,
            channelId: ticket.channelId,
            itemName: data.item?.item_name ?? claimedItemName,
            itemType: data.item?.item_type ?? claimedItemType,
            itemImage: getOnceHumanItemArt(data.item?.item_name ?? claimedItemName)?.image ?? claimedItemImage,
          });
          setMessage("Prize claimed. Staff delivery channel is open.");
        } else {
          const opened = await openFallbackClaimTicket(
            data.item?.item_name ?? claimedItemName,
            data.item?.item_type ?? claimedItemType,
            claimedItemImage,
          );
          setMessage(opened ? "Claimed. Live support channel open below." : "Package claimed. Staff notified.");
        }
      } else {
        setMessage("Item successfully stored for next wipe.");
      }

      await fetchInventory();
      await fetchLogs();
    } catch {
      setMessage("Connection error. Please try again.");
    } finally {
      setActionLoading(null);
    }
  }

  const grouped = useMemo(() => {
    return {
      available: items.filter((item) => item.status === "available"),
      saved: items.filter((item) => item.status === "saved"),
      archive: items.filter((item) => item.status === "used" || item.status === "expired"),
      rewards: items.filter((item) => item.metadata?.reward_source),
    };
  }, [items]);

  const totalActive = grouped.available.length + grouped.saved.length;

  const tabs = [
    { id: "available", label: "Vault", count: grouped.available.length, icon: "📦" },
    { id: "saved", label: "Wipe Storage", count: grouped.saved.length, icon: "💾" },
    { id: "archive", label: "Archive", count: grouped.archive.length, icon: "📁" },
    { id: "history", label: "Ledger", count: logs.length, icon: "📜" },
  ] as const;

  return (
    <section className="relative overflow-hidden rounded-[2.5rem] border border-white/6 bg-[#0a0d14] shadow-[0_32px_120px_rgba(0,0,0,0.6)]">
      {/* Background VFX */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-1/4 -top-1/4 h-[150%] w-[150%] bg-[radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.03),transparent_50%)]" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] mix-blend-overlay" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
      </div>

      {confirmItem && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-sm overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900 shadow-2xl shadow-black/50">
            <div className="bg-gradient-to-b from-white/5 to-transparent px-6 py-5 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-2xl text-cyan-400">
                {confirmItem.action === "use" ? "🚀" : "💾"}
              </div>
              <h3 className="text-xl font-bold text-white">
                {confirmItem.action === "use" ? "Claim Item?" : "Save for Wipe?"}
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                {confirmItem.action === "use"
                  ? "This will initialize the delivery process and open a support ticket."
                  : "This item will be safely stored and ready for the next season."}
              </p>
            </div>
            <div className="flex gap-2 p-4 pt-0">
              <button
                onClick={() => setConfirmItem(null)}
                className="flex-1 rounded-xl bg-white/5 py-3 text-sm font-bold text-slate-400 transition hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                className="flex-1 rounded-xl bg-cyan-500 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-400 active:scale-95"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        {/* Header Section */}
        <header className="px-6 pt-8 pb-6 sm:px-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-cyan-400">
                <span className="h-1 w-1 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                Survivor Secure Vault
              </div>
              <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Storage</h2>
              <p className="text-sm font-medium text-slate-500">Manage your packages, rewards, and seasonal wipe items.</p>
            </div>

            {/* Tab Navigation */}
            <nav className="flex items-center gap-1 self-start rounded-2xl bg-white/5 p-1 backdrop-blur-md">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`group relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all duration-200 ${
                    activeTab === tab.id ? "bg-white/10 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <span className={`text-sm transition-transform duration-200 ${activeTab === tab.id ? "scale-110" : "group-hover:scale-110"}`}>
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span className={`ml-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1.5 text-[9px] font-black tracking-tighter ${
                      activeTab === tab.id ? "bg-cyan-500 text-white" : "bg-white/10 text-slate-500"
                    }`}>
                      {tab.count}
                    </span>
                  )}
                  {activeTab === tab.id && (
                    <span className="absolute -bottom-1 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
                  )}
                </button>
              ))}
            </nav>
          </div>
        </header>

        {/* Status Message */}
        <div className="px-6 sm:px-10">
          {message && (
            <div className={`mb-6 animate-in slide-in-from-top-2 rounded-2xl border px-4 py-3 text-sm font-bold backdrop-blur-md ${
              message.toLowerCase().includes("error") || message.toLowerCase().includes("fail")
                ? "border-rose-500/20 bg-rose-500/10 text-rose-300"
                : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-base">{message.toLowerCase().includes("error") ? "⚠️" : "✅"}</span>
                {message}
              </div>
            </div>
          )}

          {activeTicket && (
            <div className="mb-8 rounded-[2rem] border border-cyan-500/20 bg-cyan-950/20 p-6 shadow-2xl shadow-cyan-500/10 animate-in slide-in-from-bottom-4 duration-500">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/20 text-2xl">🎟️</div>
                  <div>
                    <h4 className="text-lg font-bold text-white">Delivery Support Ticket</h4>
                    <p className="text-xs text-slate-400">Live chat with staff for item fulfillment.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Active Session</span>
                </div>
              </div>
              
              {activeTicket.itemName && (
                <div className="mb-6 flex items-center gap-4 rounded-2xl bg-black/40 p-4 border border-white/5">
                  <div className="h-16 w-16 overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-inner shrink-0">
                    {activeTicket.itemImage ? (
                      <img src={activeTicket.itemImage} alt="" className="h-full w-full object-contain p-1" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-2xl">📦</div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Fulfilling Item</div>
                    <div className="truncate text-lg font-black text-white">{activeTicket.itemName}</div>
                    <div className="text-xs text-cyan-400 font-bold">{activeTicket.itemType?.toUpperCase() || "PACKAGE"}</div>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-white/5 bg-slate-950/50 overflow-hidden">
                <TicketChat
                  ticketId={activeTicket.id}
                  channelId={activeTicket.channelId}
                  onClose={() => setActiveTicket(null)}
                  presenceSide="user"
                />
              </div>
            </div>
          )}
        </div>

        {/* Content Section */}
        <main className="min-h-[400px] px-6 pb-10 sm:px-10">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 animate-pulse rounded-3xl border border-white/5 bg-white/[0.02]" />
              ))}
            </div>
          ) : activeTab === "history" ? (
            /* History / Ledger View */
            <div className="rounded-[2rem] border border-white/5 bg-black/30 backdrop-blur-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="border-b border-white/5 bg-white/5 px-6 py-4 flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Activity History</h4>
                <span className="text-[10px] text-slate-600">Last 30 actions</span>
              </div>
              <div className="divide-y divide-white/5">
                {logs.length === 0 ? (
                  <div className="py-12 text-center text-slate-600">No activity logged yet.</div>
                ) : (
                  logs.map((log) => {
                    const meta = actionLabels[log.action] || { label: log.action, color: "text-slate-300" };
                    const date = new Date(log.action_at);
                    return (
                      <div key={log.id} className="flex items-center justify-between gap-4 px-6 py-4 transition hover:bg-white/[0.02]">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={`h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 text-lg ${meta.color.replace('text-', 'text-opacity-50 ')}`}>
                            {log.action.includes('use') ? '🚀' : log.action.includes('save') ? '💾' : '📦'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border border-current opacity-70 ${meta.color}`}>
                                {meta.label}
                              </span>
                              <span className="truncate text-sm font-bold text-white">{log.item_name}</span>
                            </div>
                            <p className="mt-1 text-[11px] text-slate-500">
                              {log.action_by_name ? `Action by ${log.action_by_name}` : "System entry"}
                              {log.details?.reason && ` · ${log.details.reason}`}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-xs font-bold text-slate-300">{date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                          <div className="text-[10px] text-slate-600">{date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* Standard Grid View (Available, Saved, Archive) */
            <>
              {items.filter(i => (activeTab === "available" ? i.status === "available" : activeTab === "saved" ? i.status === "saved" : i.status === "used" || i.status === "expired")).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-500">
                  <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[2.5rem] border border-white/5 bg-white/[0.03] text-4xl grayscale opacity-30">
                    {activeTab === "available" ? "📦" : activeTab === "saved" ? "💾" : "📁"}
                  </div>
                  <h3 className="text-xl font-bold text-white">No items found</h3>
                  <p className="mt-2 max-w-xs text-sm text-slate-500">
                    {activeTab === "available" 
                      ? "Your vault is currently empty. Visit the store to acquire new packages."
                      : activeTab === "saved"
                        ? "Items saved for the next wipe cycle will appear here."
                        : "Your item usage history is empty."}
                  </p>
                  {activeTab === "available" && (
                    <a href="/store" className="mt-6 rounded-xl bg-white/5 border border-white/10 px-6 py-2.5 text-xs font-bold text-white transition hover:bg-white/10">
                      Browse Store
                    </a>
                  )}
                </div>
              ) : (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 animate-in fade-in slide-in-from-bottom-3 duration-500">
                  {items
                    .filter(item => {
                      if (activeTab === "available") return item.status === "available";
                      if (activeTab === "saved") return item.status === "saved";
                      return item.status === "used" || item.status === "expired";
                    })
                    .map((item) => (
                      <InventoryCard
                        key={item.id}
                        item={item}
                        actionLoading={actionLoading}
                        onAction={handleAction}
                      />
                    ))
                  }
                </div>
              )}
            </>
          )}
        </main>

        {/* Footer Note */}
        <footer className="border-t border-white/5 px-6 py-6 sm:px-10 bg-white/[0.01]">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <div>
              <h5 className="text-xs font-black uppercase tracking-widest text-amber-400">Protocol Information</h5>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                All package extractions are monitored by server administrators. Large volume claims may require additional verification. 
                Saved items are guaranteed to persist across seasonal wipes unless otherwise specified in the package terms.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </section>
  );
}


