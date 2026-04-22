"use client";

import { useMemo, useState } from "react";

type TeamFlairBoardProps = {
  variant: "about" | "support";
  onlineNames: string[];
};

const owners = ["Kilo", "Buzzworthy", "Zeus", "Hope", "Jon", "Cortez"];
const comingBack = ["Encriptado"];
const mods = ["BÛTTÊR", "reda", "Rem", "♠Zenon♠", "Whiispperss"];

const ownerStyles: Record<string, { border: string; bg: string; glow: string; text: string; badge: string }> = {
  Kilo:      { border: "rgba(250,204,21,0.5)",  bg: "rgba(250,204,21,0.08)",  glow: "rgba(250,204,21,0.2)",  text: "#fde047", badge: "👑 Owner" },
  Buzzworthy:{ border: "rgba(34,211,238,0.5)",  bg: "rgba(34,211,238,0.08)",  glow: "rgba(34,211,238,0.2)",  text: "#67e8f9", badge: "⚡ Owner" },
  Zeus:      { border: "rgba(99,102,241,0.5)",  bg: "rgba(99,102,241,0.08)",  glow: "rgba(99,102,241,0.2)",  text: "#a5b4fc", badge: "🌩️ Owner" },
  Hope:      { border: "rgba(244,114,182,0.5)", bg: "rgba(244,114,182,0.08)", glow: "rgba(244,114,182,0.2)", text: "#f9a8d4", badge: "✨ Owner" },
  Encriptado:{ border: "rgba(168,85,247,0.5)",  bg: "rgba(168,85,247,0.08)",  glow: "rgba(168,85,247,0.2)",  text: "#e9d5ff", badge: "🎇 Owner" },
  Jon:       { border: "rgba(74,222,128,0.5)",  bg: "rgba(74,222,128,0.08)",  glow: "rgba(74,222,128,0.2)",  text: "#86efac", badge: "El Jefe" },
  Cortez:    { border: "rgba(251,146,60,0.5)",  bg: "rgba(251,146,60,0.08)",  glow: "rgba(251,146,60,0.2)",  text: "#fdba74", badge: "🔥 Owner" },
};

const staffStyles: Record<string, { text: string; border: string; bg: string; glow: string; badge: string }> = {
  "BÛTTÊR":     { text: "#93c5fd", border: "rgba(147,197,253,0.4)", bg: "rgba(147,197,253,0.07)", glow: "rgba(147,197,253,0.15)", badge: "🎫 Support" },
  "reda":        { text: "#6ee7b7", border: "rgba(110,231,183,0.4)", bg: "rgba(110,231,183,0.07)", glow: "rgba(110,231,183,0.15)", badge: "🎮 In-Game Support" },
  "Rem":         { text: "#c4b5fd", border: "rgba(196,181,253,0.4)", bg: "rgba(196,181,253,0.07)", glow: "rgba(196,181,253,0.15)", badge: "🛡️ Discord Mod" },
  "♠Zenon♠":    { text: "#fca5a5", border: "rgba(252,165,165,0.4)", bg: "rgba(252,165,165,0.07)", glow: "rgba(252,165,165,0.15)", badge: "🎫 Support" },
  "Whiispperss": { text: "#d8b4fe", border: "rgba(216,180,254,0.4)", bg: "rgba(216,180,254,0.07)", glow: "rgba(216,180,254,0.15)", badge: "🛡️ Discord Mod" },
};

function renderAnimatedLetters(name: string, variant: "rainbow" | "dev") {
  return name.split("").map((char, index) => {
    const delay = `${index * 0.12}s`;
    const className =
      variant === "rainbow"
        ? "rz-rainbow-letter"
        : "rz-dev-letter";
    return (
      <span
        key={`${name}-${index}-${char}`}
        className={className}
        style={{ animationDelay: delay }}
      >
        {char === " " ? "\u00A0" : char}
      </span>
    );
  });
}

export function TeamFlairBoard({ variant, onlineNames }: TeamFlairBoardProps) {
  const [spotlight, setSpotlight] = useState<string | null>(null);
  const online = useMemo(() => new Set(onlineNames), [onlineNames]);
  const title = variant === "about" ? "Staff & Admin Team" : "Support Team";
  const subtitle = variant === "about" ? "The people behind the server" : "The people answering tickets";
  const modsLabel = variant === "about" ? "Moderators & Support" : "Mods & Support";
  const comingBackLabel = variant === "about" ? "Coming Back Soon" : "Coming Back";

  function renderOwner(name: string) {
    const s = ownerStyles[name];
    const active = spotlight === name || (name === "Buzzworthy" && spotlight === "Buzzworthy");
    return (
      <button
        key={name}
        type="button"
        onClick={() => setSpotlight((current) => (current === name ? null : name))}
        className="relative rounded-xl px-3 py-3 text-center text-sm font-bold transition duration-300 hover:-translate-y-1"
        style={{
          background: s.bg,
          boxShadow: `${active ? "0 0 0 1px rgba(255,255,255,0.18), 0 0 22px rgba(255,255,255,0.09)" : `0 0 0 1px ${s.border}, 0 0 14px ${s.glow}`}`,
          transform: active ? "translateY(-6px) scale(1.03)" : undefined,
        }}
      >
        <div
          className={`absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full ${online.has(name) ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`}
        />
        {name === "Hope" ? (
          <div className={`transition-all duration-300 ${active ? "animate-bounce" : ""}`}>
            {renderAnimatedLetters("Hope", "rainbow")}
          </div>
        ) : name === "Buzzworthy" ? (
          <div className={`transition-all duration-300 ${active ? "animate-bounce" : ""}`}>
            {renderAnimatedLetters("Buzzworthy", "dev")}
          </div>
        ) : (
          <div className={`transition-all duration-300 ${active ? "animate-bounce" : ""}`} style={{ color: s.text }}>
            {name}
          </div>
        )}
        <div className="mt-1 text-[9px] font-semibold tracking-widest opacity-70" style={{ color: s.text }}>
          {name === "Hope" ? "Rainbow Owner" : s.badge}
        </div>
      </button>
    );
  }

  function renderComingBack(name: string) {
    const active = spotlight === name;
    return (
      <button
        key={name}
        type="button"
        onClick={() => setSpotlight((current) => (current === name ? null : name))}
        className="relative rounded-xl px-3 py-3 text-center text-sm font-bold transition duration-300 hover:-translate-y-1"
        style={{
          background: "rgba(168,85,247,0.08)",
          boxShadow: `${active ? "0 0 0 1px rgba(255,255,255,0.18), 0 0 22px rgba(168,85,247,0.16)" : "0 0 0 1px rgba(168,85,247,0.35), 0 0 14px rgba(168,85,247,0.18)"}`,
          transform: active ? "translateY(-6px) scale(1.03)" : undefined,
        }}
      >
        <div className={`absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full ${online.has(name) ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
        <div className="text-violet-200">{name}</div>
        <div className="mt-1 text-[9px] font-semibold tracking-widest text-violet-300 opacity-80">
          {comingBackLabel}
        </div>
      </button>
    );
  }

  function renderStaff(name: string) {
    const s = staffStyles[name];
    if (!s) return null;
    const active = spotlight === name || (name === "Buzzworthy" && spotlight === "Buzzworthy");
    return (
      <button
        key={name}
        type="button"
        onClick={() => setSpotlight((current) => (current === name ? null : name))}
        className="relative rounded-xl px-3 py-3 text-center text-sm font-semibold transition duration-300 hover:-translate-y-1"
        style={{
          background: s.bg,
          boxShadow: `${active ? "0 0 0 1px rgba(255,255,255,0.16), 0 0 18px rgba(34,211,238,0.12)" : `0 0 0 1px ${s.border}, 0 0 10px ${s.glow}`}`,
          transform: active ? "translateY(-5px) scale(1.02)" : undefined,
        }}
      >
        <div
          className={`absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full ${online.has(name) ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`}
        />
        <div style={{ color: s.text }}>{name}</div>
        <div className="mt-1 text-[9px] font-semibold tracking-widest opacity-70" style={{ color: s.text }}>
          {s.badge}
        </div>
      </button>
    );
  }

  return (
    <div className="rz-surface rz-panel-border rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-600 shadow-lg shadow-amber-500/30 animate-pulse">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-transparent via-white/40 to-transparent animate-[shine_2s_ease-in-out_infinite]" />
          <svg className="h-6 w-6 text-amber-950 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-7.072m0 0l-2.829 2.829M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center">
            <span className="text-[8px] font-bold text-white">?</span>
          </div>
        </div>
        <div>
          <div className="text-sm font-semibold text-white">{title}</div>
          <div className="text-xs text-slate-500">{subtitle}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {owners.map(renderOwner)}
      </div>

      <div className="mt-4 pt-4 border-t border-white/5">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">{comingBackLabel}</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {comingBack.map(renderComingBack)}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-white/5">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">{modsLabel}</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {mods.map(renderStaff)}
        </div>
      </div>

    </div>
  );
}
