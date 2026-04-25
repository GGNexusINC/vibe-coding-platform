"use client";

import { useState } from "react";

const STAFF_LIST = [
  { name: "Kilo",        emoji: "👑" },
  { name: "Buzzworthy",  emoji: "⚡" },
  { name: "Zeus",        emoji: "🌩️" },
  { name: "Hope",        emoji: "💗" },
  { name: "Jon",         emoji: "🛡️" },
  { name: "Cortez",      emoji: "🔥" },
  { name: "BÛTTÊR",     emoji: "🎫" },
  { name: "reda",        emoji: "🎮" },
  { name: "Rem",         emoji: "🛡️" },
  { name: "♠Zenon♠",   emoji: "🎫" },
  { name: "Whiispperss", emoji: "🛡️" },
];

type BuyButtonProps = {
  packName: string;
  packPrice: number;
  packSlug: string;
  buyUrl: string;
  user: { discord_id: string; username?: string } | null;
};

export function BuyButton({ packName, packPrice, packSlug, buyUrl, user }: BuyButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function openModal() {
    setSelected(null);
    setShowModal(true);
  }

  async function handleProceed(referredBy: string) {
    setLoading(true);
    // Log the referral before redirecting
    await fetch("/api/store/referral", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        packName,
        packSlug,
        price: packPrice,
        referredBy,
        user,
      }),
    }).catch(() => {});

    // Open PayPal in a new tab
    window.open(buyUrl, "_blank", "noopener,noreferrer");
    setLoading(false);
    setShowModal(false);
  }

  return (
    <>
      <button
        className="inline-flex h-9 items-center justify-center rounded-md border border-fuchsia-300/50 bg-gradient-to-r from-fuchsia-300 via-violet-200 to-cyan-200 px-4 text-sm font-extrabold text-black shadow-[0_0_22px_rgba(217,70,239,0.5)] transition hover:scale-[1.06] hover:shadow-[0_0_34px_rgba(217,70,239,0.75)] active:scale-[0.98]"
        onClick={openModal}
        type="button"
      >
        Buy
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
          onClick={(e) => { if (e.target === e.currentTarget && !loading) setShowModal(false); }}
        >
          <div className="relative w-full max-w-md rounded-[2.5rem] border border-white/10 bg-slate-900 p-8 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            {!loading && (
              <button
                onClick={() => setShowModal(false)}
                className="absolute right-6 top-6 text-slate-500 hover:text-white transition text-lg leading-none"
                aria-label="Close"
              >
                ✕
              </button>
            )}

            <>
              <div className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-fuchsia-400">Step 1 of 2</div>
              <h2 className="text-xl font-black text-white leading-tight">Who recommended or sold you this pack?</h2>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed">Select a staff member if they helped you. This helps us track their impact!</p>

              <div className="mt-6 grid grid-cols-2 gap-2 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
                {STAFF_LIST.map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => setSelected(s.name)}
                    className={`flex items-center gap-2 rounded-2xl border px-3 py-3 text-xs font-bold transition ${
                      selected === s.name
                        ? "border-fuchsia-400/60 bg-fuchsia-500/15 text-fuchsia-200"
                        : "border-white/5 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:bg-white/[0.08]"
                    }`}
                  >
                    <span className="text-base">{s.emoji}</span>
                    <span>{s.name}</span>
                  </button>
                ))}
              </div>

              <div className="mt-8 space-y-4">
                {selected ? (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-3">
                    <div className="mb-4 flex flex-col items-center">
                      <div className="mb-2 text-[10px] font-black uppercase tracking-[0.4em] text-cyan-400">Step 2: Secure Checkout</div>
                      <div className="h-px w-12 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Referred by</p>
                      <p className="text-sm font-black text-fuchsia-300">{selected}</p>
                    </div>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleProceed(selected)}
                      className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-500 py-4 text-sm font-black text-white shadow-[0_0_30px_rgba(217,70,239,0.4)] transition hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(217,70,239,0.6)] active:scale-[0.98] disabled:opacity-60 disabled:scale-100"
                    >
                      {loading ? "Opening PayPal..." : "Proceed to PayPal →"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelected(null)}
                      className="w-full text-center text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-300 transition"
                    >
                      ← Change Selection
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                    <button
                      type="button"
                      onClick={() => handleProceed("None / Self")}
                      disabled={loading}
                      className="w-full rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/5 py-4 text-sm font-black text-fuchsia-300 transition hover:bg-fuchsia-500/10 hover:border-fuchsia-500/40 disabled:opacity-60"
                    >
                      {loading ? "Opening PayPal..." : "I found it myself → Proceed to PayPal"}
                    </button>
                    <p className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-600">
                      Or select a staff member above
                    </p>
                  </div>
                )}
              </div>
            </>
          </div>
        </div>
      )}
    </>
  );
}
