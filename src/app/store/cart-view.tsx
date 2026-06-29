"use client";

import { useState } from "react";
import { useCart } from "./cart-context";
import { PayPalCheckout } from "./paypal-checkout";
import { createPortal } from "react-dom";

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
  { name: "Shark",       emoji: "🦈" },
  { name: "Whiispperss", emoji: "🛡️" },
  { name: "Thano",       emoji: "⚔️" },
  { name: "Tim",         emoji: "🎯" },
];

export function CartView({ user, isOpen, onClose }: { user: any; isOpen: boolean; onClose: () => void }) {
  const { items, removeFromCart, totalPrice, clearCart } = useCart();
  const [step, setStep] = useState<"items" | "referral" | "checkout" | "success">("items");
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative h-full w-full max-w-md border-l border-white/10 bg-slate-900 shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex h-full flex-col p-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Your Cart</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="text-4xl mb-4 opacity-20">🛒</div>
                <p className="text-slate-400 font-medium">Your cart is empty</p>
                <button 
                  onClick={onClose}
                  className="mt-4 text-xs font-black uppercase tracking-widest text-cyan-400 hover:text-cyan-300"
                >
                  Go browse packs →
                </button>
              </div>
            ) : (
              <>
                {step === "items" && (
                  <div className="space-y-4">
                    {items.map((item) => (
                      <div key={item.slug} className="group relative rounded-2xl border border-white/5 bg-white/5 p-4 transition hover:border-white/10">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-bold text-white text-sm">{item.name}</h3>
                            <p className="text-xs text-slate-500">${item.price} × {item.quantity}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-black text-cyan-400 text-sm">${(item.price * item.quantity).toFixed(2)}</span>
                            <button 
                              onClick={() => removeFromCart(item.slug)}
                              className="h-8 w-8 flex items-center justify-center rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {step === "referral" && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                     <div className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-fuchsia-400">Step 1 of 2</div>
                     <h3 className="text-lg font-black text-white leading-tight">Who recommended or sold you these packs?</h3>
                     <p className="mt-2 text-xs text-slate-500 leading-relaxed mb-6">Select a staff member if they helped you. This helps us track their impact!</p>
                     
                     <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {STAFF_LIST.map((s) => (
                          <button
                            key={s.name}
                            type="button"
                            onClick={() => setSelectedStaff(s.name)}
                            className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-xs font-bold transition ${
                              selectedStaff === s.name
                                ? "border-fuchsia-400/60 bg-fuchsia-500/15 text-fuchsia-200"
                                : "border-white/5 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:bg-white/[0.08]"
                            }`}
                          >
                            <span className="text-base">{s.emoji}</span>
                            <span>{s.name}</span>
                          </button>
                        ))}
                      </div>
                      
                      <button
                        onClick={() => setSelectedStaff("None / Self")}
                        className="mt-4 w-full rounded-xl border border-white/5 bg-white/5 py-3 text-xs font-bold text-slate-500 hover:text-slate-300 transition"
                      >
                        I found it myself
                      </button>
                  </div>
                )}

                {step === "checkout" && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center">
                    <div className="mb-8 text-center">
                       <div className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-400 mb-2">Step 2: Secure Checkout</div>
                       <div className="h-px w-12 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent mx-auto" />
                    </div>
                    
                    <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-5 mb-8">
                      <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                        <span>Total Balance</span>
                        <span className="text-fuchsia-300">Referred by {selectedStaff}</span>
                      </div>
                      <div className="text-3xl font-black text-white">${totalPrice.toFixed(2)}</div>
                    </div>

                    <PayPalCheckout 
                      items={items}
                      totalPrice={totalPrice}
                      user={user}
                      referredBy={selectedStaff || "None / Self"}
                      onSuccess={() => {
                        setStep("success");
                        clearCart();
                      }}
                    />
                    
                    <button 
                      onClick={() => setStep("referral")}
                      className="mt-6 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-300 transition"
                    >
                      ← Change Referrer
                    </button>
                  </div>
                )}

                {step === "success" && (
                  <div className="flex flex-col items-center justify-center h-full text-center animate-in zoom-in duration-500">
                    <div className="h-20 w-20 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-4xl mb-6 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
                      ✓
                    </div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Purchase Success!</h3>
                    <p className="text-slate-400 text-sm leading-relaxed mb-8">
                      Your items have been processed. They will be delivered to your in-game inventory shortly. Check Discord for a confirmation receipt!
                    </p>
                    <button 
                      onClick={onClose}
                      className="w-full rounded-2xl bg-white text-black py-4 text-sm font-black transition hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Return to Store
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {items.length > 0 && step === "items" && (
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Subtotal</span>
                <span className="text-2xl font-black text-white">${totalPrice.toFixed(2)}</span>
              </div>
              <button 
                onClick={() => setStep("referral")}
                className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-500 py-4 text-sm font-black text-white shadow-[0_0_30px_rgba(217,70,239,0.3)] transition hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(217,70,239,0.5)] active:scale-[0.98]"
              >
                Proceed to Checkout →
              </button>
            </div>
          )}

          {step === "referral" && selectedStaff && (
            <div className="mt-6 pt-6 border-t border-white/10">
              <button 
                onClick={() => setStep("checkout")}
                className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-500 py-4 text-sm font-black text-white shadow-[0_0_30px_rgba(217,70,239,0.3)] transition hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(217,70,239,0.5)] active:scale-[0.98]"
              >
                Continue to Payment →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
