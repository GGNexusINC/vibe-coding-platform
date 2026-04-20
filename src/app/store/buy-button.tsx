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
  buyUrl: string;
};

export function BuyButton({ packName, packPrice, buyUrl }: BuyButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function openModal() {
    setSelected(null);
    setShowModal(true);
  }

  async function proceed(referredBy: string) {
    setLoading(true);
    await fetch("/api/store/intent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ packName, price: packPrice, referredBy }),
    }).catch(() => {});
    setShowModal(false);
    setLoading(false);
    window.open(buyUrl, "_blank", "noopener,noreferrer");
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
          style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(6px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <button
              onClick={() => setShowModal(false)}
              className="absolute right-4 top-4 text-slate-500 hover:text-white transition text-lg leading-none"
              aria-label="Close"
            >
              ✕
            </button>

            <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-fuchsia-400">One quick question</div>
            <h2 className="text-lg font-bold text-white leading-snug">Who recommended or sold you this pack?</h2>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">Select a staff member if they pointed you here. Helps us track who's doing great work! You can skip if nobody did.</p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {STAFF_LIST.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => setSelected(s.name)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                    selected === s.name
                      ? "border-fuchsia-400/60 bg-fuchsia-500/15 text-fuchsia-200"
                      : "border-white/8 bg-white/4 text-slate-300 hover:border-white/20 hover:bg-white/8"
                  }`}
                >
                  <span>{s.emoji}</span>
                  <span>{s.name}</span>
                </button>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => proceed("None / Self")}
                disabled={loading}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-semibold text-slate-400 transition hover:bg-white/10 disabled:opacity-40"
              >
                Nobody — found it myself
              </button>
              <button
                type="button"
                onClick={() => selected && proceed(selected)}
                disabled={!selected || loading}
                className="flex-1 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-500 py-2.5 text-sm font-extrabold text-white transition hover:from-fuchsia-400 hover:to-violet-400 disabled:opacity-30"
              >
                {loading ? "Opening…" : "Continue →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

