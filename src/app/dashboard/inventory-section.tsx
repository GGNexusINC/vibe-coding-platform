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

function StatusPill({ item }: { item: InventoryItem }) {
  const classes =
    item.status === "available"
      ? "border-teal-300/30 bg-teal-300/10 text-teal-200"
      : item.status === "saved"
        ? "border-amber-300/30 bg-amber-300/10 text-amber-200"
        : item.status === "expired"
          ? "border-rose-300/30 bg-rose-300/10 text-rose-200"
          : "border-slate-400/20 bg-slate-400/10 text-slate-400";

  return (
    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${classes}`}>
      {item.status}
    </span>
  );
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
    <article className={`group relative overflow-hidden rounded-2xl border ${style.panel} ${style.glow} shadow-2xl transition duration-300 hover:-translate-y-1 hover:border-white/20 ${muted ? "opacity-55" : ""}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.14),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_44%)]" />
      <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-white/8 blur-2xl transition group-hover:bg-white/12" />
      <div className={`absolute left-0 top-0 h-1 w-full bg-gradient-to-r ${style.accent}`} />

      <div className="relative p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className={`relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br ${style.accent} p-[1px] shadow-xl`}>
              <div className="absolute inset-[1px] rounded-2xl bg-slate-950/90" />
              {art?.image ? (
                <img
                  src={art.image}
                  alt={`${item.item_name} Once Human item art`}
                  className="relative h-12 w-14 object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.22)]"
                  loading="lazy"
                />
              ) : (
                <ItemIcon type={item.item_type} className="relative h-10 w-10 text-white/85 drop-shadow-[0_0_18px_rgba(255,255,255,0.18)]" />
              )}
            </div>

            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/10 bg-black/25 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-white/60">
                  {style.label}
                </span>
                {isReward && (
                  <span className="rounded-full border border-fuchsia-300/25 bg-fuchsia-300/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-fuchsia-200">
                    Reward
                  </span>
                )}
                {item.metadata?.given_by && (
                  <span className="rounded-full border border-violet-300/25 bg-violet-300/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-violet-200">
                    Gift
                  </span>
                )}
                {art?.sourceName && (
                  <span className="rounded-full border border-cyan-300/20 bg-cyan-300/8 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200">
                    Once Human Art
                  </span>
                )}
              </div>

              <h3 className="truncate text-base font-black tracking-tight text-white">
                {item.item_name}
              </h3>
              <p className="mt-1 text-[11px] font-medium text-slate-400">
                Acquired {new Date(item.purchase_date).toLocaleDateString()}
                {item.wipe_cycle ? ` - ${item.wipe_cycle}` : ""}
              </p>
              {item.metadata?.reason && (
                <p className="mt-1 line-clamp-2 text-[11px] text-violet-200/75">
                  Reason: {item.metadata.reason}
                </p>
              )}
            </div>
          </div>

          <StatusPill item={item} />
        </div>

        {timer && (
          <div className="mt-4 rounded-xl border border-white/8 bg-black/25 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Claim Window</span>
              <span className={`text-[11px] font-black ${timer.urgent ? "text-rose-300" : "text-amber-200"}`}>{timer.label}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/8">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${timer.urgent ? "from-rose-500 to-amber-300" : "from-cyan-400 to-teal-300"}`}
                style={{ width: `${timer.percent}%` }}
              />
            </div>
          </div>
        )}

        {item.status === "available" && (
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              onClick={() => onAction(item.id, "use", item.item_type)}
              disabled={disabled}
              className="rounded-xl border border-teal-300/30 bg-teal-300/10 px-3 py-2.5 text-[11px] font-black uppercase tracking-[0.18em] text-teal-100 transition hover:-translate-y-0.5 hover:bg-teal-300/18 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {actionLoading === item.id ? "Processing..." : isReward ? "Use + Open Ticket" : "Use Package"}
            </button>
            <button
              onClick={() => onAction(item.id, "save", item.item_type)}
              disabled={disabled}
              className="rounded-xl border border-amber-300/25 bg-amber-300/8 px-3 py-2.5 text-[11px] font-black uppercase tracking-[0.18em] text-amber-100 transition hover:-translate-y-0.5 hover:bg-amber-300/14 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Save for Wipe
            </button>
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
  const [showHistory, setShowHistory] = useState(false);
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
      if (data.ok) setItems(data.items);
    } catch {
      // Keep the current inventory visible if a refresh fails.
    } finally {
      setLoading(false);
    }
  }

  async function fetchLogs() {
    try {
      const res = await fetch("/api/inventory/logs?limit=20", { cache: "no-store" });
      const data = await res.json();
      if (data.ok) setLogs(data.logs || []);
    } catch {
      // History is nice-to-have.
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

      const ticket = data.support_ticket;
      if (action === "use" && ticket?.id && ticket?.channelId) {
        setActiveTicket({
          id: ticket.id,
          channelId: ticket.channelId,
          itemName: data.item?.item_name ?? claimedItemName,
          itemType: data.item?.item_type ?? claimedItemType,
          itemImage: getOnceHumanItemArt(data.item?.item_name ?? claimedItemName)?.image ?? claimedItemImage,
        });
        setMessage("Prize claimed. Your live support chat is open below.");
      } else if (action === "use") {
        const opened = await openFallbackClaimTicket(
          data.item?.item_name ?? claimedItemName,
          data.item?.item_type ?? claimedItemType,
          claimedItemImage,
        );
        setMessage(opened ? "Claimed. Your live support chat is open below." : "Package claimed. Staff have been notified.");
      } else {
        setMessage("Package saved for the next wipe.");
      }

      fetchInventory();
      fetchLogs();
    } catch {
      setMessage("Network error. Try again.");
    } finally {
      setActionLoading(null);
    }
  }

  const grouped = useMemo(() => {
    const available = items.filter((item) => item.status === "available");
    const saved = items.filter((item) => item.status === "saved");
    const used = items.filter((item) => item.status === "used");
    const expired = items.filter((item) => item.status === "expired");
    const rewards = items.filter((item) => item.metadata?.reward_source);
    return { available, saved, used, expired, rewards };
  }, [items]);

  const totalValue = grouped.available.length + grouped.saved.length;

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-orange-300/15 bg-[linear-gradient(145deg,rgba(12,17,10,0.96),rgba(7,12,18,0.95)_48%,rgba(21,12,7,0.96))] shadow-[0_28px_90px_rgba(0,0,0,0.55)]">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(251,191,36,0.14),transparent_34%),radial-gradient(circle_at_88%_18%,rgba(20,184,166,0.12),transparent_30%),radial-gradient(circle_at_42%_90%,rgba(249,115,22,0.11),transparent_34%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:30px_30px]" />
      </div>

      {confirmItem && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-orange-300/20 bg-slate-950 shadow-2xl">
            <div className="border-b border-white/8 bg-white/[0.03] px-6 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-orange-200">Confirm inventory action</p>
              <h3 className="mt-2 text-xl font-black text-white">
                {confirmItem.action === "use" ? "Claim this item now?" : "Save this item?"}
              </h3>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm leading-6 text-slate-300">
                {confirmItem.action === "use"
                  ? "This marks the item as used and opens a staff delivery flow when needed."
                  : "This keeps the item reserved for the next wipe when the system supports saving it."}
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  onClick={() => setConfirmItem(null)}
                  className="h-11 rounded-xl border border-white/10 bg-white/5 text-sm font-bold text-slate-300 transition hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAction}
                  className="h-11 rounded-xl bg-[linear-gradient(135deg,#f97316,#fbbf24)] text-sm font-black text-stone-950 transition hover:scale-[1.02]"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        <header className="border-b border-white/8 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-300/20 bg-orange-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-orange-100">
                <span className="h-1.5 w-1.5 rounded-full bg-lime-300 shadow-[0_0_14px_rgba(190,242,100,0.85)]" />
                Survivor storage vault
              </div>
              <h2 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl">
                Inventory
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-400">
                Premium packs, reward claims, saved wipe items, and staff delivery tickets in one place.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
              {[
                ["Ready", grouped.available.length, "text-teal-200"],
                ["Saved", grouped.saved.length, "text-amber-200"],
                ["Stored", totalValue, "text-orange-100"],
              ].map(([label, value, color]) => (
                <div key={label} className="rounded-2xl border border-white/8 bg-black/25 p-3 text-center">
                  <div className={`text-2xl font-black ${color}`}>{value}</div>
                  <div className="mt-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </header>

        <div className="space-y-5 p-4 sm:p-6">
          {message && (
            <div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
              message.toLowerCase().includes("error") || message.toLowerCase().includes("fail")
                ? "border-rose-300/25 bg-rose-500/10 text-rose-100"
                : "border-teal-300/25 bg-teal-500/10 text-teal-100"
            }`}>
              {message}
            </div>
          )}

          {grouped.rewards.length > 0 && (
            <div className="overflow-hidden rounded-3xl border border-fuchsia-300/20 bg-[linear-gradient(135deg,rgba(134,25,143,0.22),rgba(8,47,73,0.22),rgba(20,83,45,0.18))]">
              <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.28em] text-fuchsia-100">Reward claim window</div>
                  <p className="mt-2 text-sm font-semibold text-white">
                    Lottery and Whack-a-Mole prizes land here with a 48 hour timer.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-200">
                  <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1.5">3 mole chances per wipe</span>
                  <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1.5">Use opens ticket</span>
                  <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1.5">Save before expiry</span>
                </div>
              </div>
            </div>
          )}

          {activeTicket && (
            <div className="rounded-3xl border border-cyan-300/25 bg-cyan-950/20 p-4 shadow-[0_0_36px_rgba(34,211,238,0.12)]">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-200">Prize claim live chat</p>
                  <p className="mt-1 text-xs text-slate-400">Staff can answer from Discord while you stay on this page.</p>
                </div>
                <a
                  href="/support"
                  className="rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100 transition hover:bg-cyan-300/18"
                >
                  Support center
                </a>
              </div>
              {activeTicket.itemName && (
                <div className="mb-4 flex items-center gap-4 rounded-2xl border border-white/10 bg-black/25 p-3">
                  {activeTicket.itemImage ? (
                    <img
                      src={activeTicket.itemImage}
                      alt={activeTicket.itemName}
                      className="h-16 w-16 shrink-0 rounded-xl border border-white/10 bg-slate-950 object-cover"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Claiming Exact Item</div>
                    <div className="mt-1 truncate text-sm font-black text-white">{activeTicket.itemName}</div>
                    <div className="mt-0.5 text-xs text-slate-400">{activeTicket.itemType || "Reward item"}</div>
                  </div>
                </div>
              )}
              <TicketChat
                ticketId={activeTicket.id}
                channelId={activeTicket.channelId}
                onClose={() => setActiveTicket(null)}
                presenceSide="user"
              />
            </div>
          )}

          {loading && (
            <div className="grid gap-3 md:grid-cols-2">
              {[0, 1].map((idx) => (
                <div key={idx} className="h-48 animate-pulse rounded-2xl border border-white/8 bg-white/[0.04]" />
              ))}
            </div>
          )}

          {!loading && items.length === 0 && !showHistory && (
            <div className="rounded-3xl border border-white/8 bg-black/25 px-6 py-12 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-orange-300/15 bg-orange-300/8">
                <ItemIcon type="pack" className="h-12 w-12 text-orange-100/60" />
              </div>
              <h3 className="mt-5 text-lg font-black text-white">Your vault is empty</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                Store purchases, event rewards, and saved wipe packs will appear here.
              </p>
              <a
                href="/store"
                className="mt-5 inline-flex rounded-full bg-[linear-gradient(135deg,#f97316,#fbbf24)] px-5 py-2.5 text-xs font-black uppercase tracking-[0.18em] text-stone-950 transition hover:scale-[1.03]"
              >
                Visit store
              </a>
            </div>
          )}

          {grouped.available.length > 0 && (
            <div>
              <SectionTitle label="Ready to claim" count={grouped.available.length} tone="text-teal-200" />
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {grouped.available.map((item) => (
                  <InventoryCard key={item.id} item={item} actionLoading={actionLoading} onAction={handleAction} />
                ))}
              </div>
            </div>
          )}

          {grouped.saved.length > 0 && (
            <div>
              <SectionTitle label="Saved for next wipe" count={grouped.saved.length} tone="text-amber-200" />
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {grouped.saved.map((item) => (
                  <InventoryCard key={item.id} item={item} actionLoading={actionLoading} onAction={handleAction} />
                ))}
              </div>
            </div>
          )}

          {(grouped.used.length > 0 || grouped.expired.length > 0) && (
            <div>
              <SectionTitle label="Archive" count={grouped.used.length + grouped.expired.length} tone="text-slate-400" />
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {[...grouped.used, ...grouped.expired].map((item) => (
                  <InventoryCard key={item.id} item={item} actionLoading={actionLoading} onAction={handleAction} />
                ))}
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-3xl border border-white/8 bg-black/25">
            <button
              onClick={() => {
                setShowHistory((current) => !current);
                if (!showHistory) fetchLogs();
              }}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-white/[0.03]"
            >
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Activity ledger</div>
                <div className="mt-1 text-sm font-bold text-white">Inventory history</div>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
                {showHistory ? "Hide" : "Show"}
              </span>
            </button>

            {showHistory && (
              <div className="max-h-72 divide-y divide-white/6 overflow-y-auto border-t border-white/8 scrollbar-none">
                {logs.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-slate-500">No inventory activity yet.</div>
                ) : (
                  logs.map((log) => {
                    const meta = actionLabels[log.action] || { label: log.action, color: "text-slate-300" };
                    const date = new Date(log.action_at);
                    const showReason = log.details?.reason && !["User initiated", "Admin given"].includes(log.details.reason);

                    return (
                      <div key={log.id} className="flex items-start justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-[10px] font-black uppercase tracking-[0.18em] ${meta.color}`}>{meta.label}</span>
                            <span className="truncate text-sm font-bold text-white">{log.item_name}</span>
                          </div>
                          {(showReason || log.action_by_name) && (
                            <p className="mt-1 text-xs text-slate-500">
                              {log.action_by_name ? `From ${log.action_by_name}` : ""}
                              {log.action_by_name && showReason ? " - " : ""}
                              {showReason ? log.details?.reason : ""}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right text-[10px] font-semibold text-slate-500">
                          <div>{date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
                          <div>{date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-amber-300/15 bg-amber-300/8 px-4 py-3">
            <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-amber-300 shadow-[0_0_16px_rgba(252,211,77,0.75)]" />
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-200">Delivery note</div>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                All package deliveries still require staff confirmation before in-game delivery.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionTitle({ label, count, tone }: { label: string; count: number; tone: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${tone.replace("text-", "bg-")} shadow-[0_0_14px_currentColor]`} />
        <span className={`text-[11px] font-black uppercase tracking-[0.22em] ${tone}`}>{label}</span>
      </div>
      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black text-slate-300">
        {count}
      </span>
    </div>
  );
}
