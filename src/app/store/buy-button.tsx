"use client";

import { useState } from "react";
import { PayPalButtons } from "@paypal/react-paypal-js";

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

                    <div className="mt-4">
                      <PayPalButtons
                        style={{ layout: "vertical", shape: "pill", label: "pay" }}
                        createOrder={(data, actions) => {
                          // Before log happens here implicitly because they select staff
                          return actions.order.create({
                            intent: "CAPTURE",
                            purchase_units: [
                              {
                                description: `${packName} - Referred by: ${selected}`,
                                amount: {
                                  currency_code: "USD",
                                  value: packPrice.toString(),
                                },
                              },
                            ],
                          });
                        }}
                        onApprove={async (data, actions) => {
                          if (actions.order) {
                            const order = await actions.order.capture();
                            // "Officially Buy" Log
                            await fetch("/api/store/success", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                orderId: order.id,
                                payer: order.payer,
                                packName,
                                packSlug,
                                price: packPrice,
                                referredBy: selected,
                                user,
                              }),
                            });
                            alert("Payment Successful! Your items have been logged and added to your inventory.");
                            setShowModal(false);
                          }
                        }}
                        onError={(err) => {
                          console.error("PayPal Error:", err);
                          alert("There was an issue with the PayPal payment. Please try again or use the fallback link.");
                        }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleProceed(selected)}
                      className="w-full text-center text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-300 transition"
                    >
                      ← Use Fallback Link (No Official Log)
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                    <div className="mt-4">
                      <PayPalButtons
                        style={{ layout: "vertical", shape: "pill", label: "pay" }}
                        createOrder={(data, actions) => {
                          return actions.order.create({
                            intent: "CAPTURE",
                            purchase_units: [
                              {
                                description: `${packName} - Direct Purchase`,
                                amount: {
                                  currency_code: "USD",
                                  value: packPrice.toString(),
                                },
                              },
                            ],
                          });
                        }}
                        onApprove={async (data, actions) => {
                          if (actions.order) {
                            const order = await actions.order.capture();
                            // "Officially Buy" Log
                            await fetch("/api/store/success", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                orderId: order.id,
                                payer: order.payer,
                                packName,
                                packSlug,
                                price: packPrice,
                                referredBy: "Direct",
                                user,
                              }),
                            });
                            alert("Payment Successful! Your items have been logged.");
                            setShowModal(false);
                          }
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleProceed("Direct")}
                      className="w-full text-center text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:text-slate-400 transition"
                    >
                      ← Use Fallback Link (Direct)
                    </button>
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
