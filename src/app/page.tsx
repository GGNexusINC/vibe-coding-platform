"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const translations = {
  en: {
    chip: "NewHopeGGN",
    title: "NewHopeGGN",
    subtitle: "Your Once Human community home base.",
    description: "Survive together. Build together. NewHopeGGN is a Once Human community server — buy wipe packs, open support tickets, and connect with your squad through Discord.",
    storeBtn: "🛒 Wipe Store",
    staffBtn: "Staff Login",
    highlights: [
      { title: "Once Human Server", copy: "A dedicated Once Human community — wipes, events, and base-building with real players." },
      { title: "Arena Events", copy: "PvP tournaments with auto-matchmaking. Form teams, get assigned voice channels, and fight! Discord DMs notify you when it's your turn." },
      { title: "Fast Support", copy: "Open a ticket and staff respond directly through Discord. No waiting around." },
      { title: "Wipe Packs & VIP", copy: "Buy packs each wipe to get resources and VIP perks tied to the current season." },
    ],
    operationsTitle: "What You Can Do",
    operations: ["Discord sign-in", "Support tickets", "Wipe pack checkout", "VIP role perks"],
    quickStartTitle: "Quick Start",
    steps: [
      { title: "1. Sign in with Discord", desc: "Sign in to unlock the dashboard, support flow, and store access." },
      { title: "2. Link UID and choose your pack", desc: "Make sure your details are correct before buying a pack." },
      { title: "3. Buy and receive VIP perks", desc: "Purchases are tracked through Discord and tied to the current wipe perks." },
    ],
    warning: "⚠️ VIP role perks are tied to the active wipe. Buy during the wipe to receive your rewards.",
    staffTitle: "👥 Staff & Admin Team",
    staffDescription: "Our staff team keeps the server running, tickets answered, and the community positive.",
    ownerBadge: "👑 Owner",
    adminBadge: "⚡ Admin",
    loadingStaff: "Loading team...",
    online: "Online",
    offline: "Offline",
  },
  es: {
    chip: "NewHopeGGN",
    title: "NewHopeGGN",
    subtitle: "Tu base comunitaria de Once Human.",
    description: "Sobrevive juntos. Construye juntos. NewHopeGGN es un servidor comunitario de Once Human — compra packs de wipe, abre tickets de soporte y conecta con tu equipo por Discord.",
    storeBtn: "🛒 Tienda Wipe",
    staffBtn: "Login Staff",
    highlights: [
      { title: "Servidor Once Human", copy: "Una comunidad dedicada a Once Human — wipes, eventos y construcción de bases con jugadores reales." },
      { title: "Soporte Rápido", copy: "Abre un ticket y el staff responde directamente por Discord. Sin esperas." },
      { title: "Packs Wipe & VIP", copy: "Compra packs cada wipe para obtener recursos y beneficios VIP vinculados a la temporada actual." },
    ],
    operationsTitle: "Qué Puedes Hacer",
    operations: ["Inicio con Discord", "Tickets de soporte", "Checkout de packs", "Beneficios VIP"],
    quickStartTitle: "Inicio Rápido",
    steps: [
      { title: "1. Inicia sesión con Discord", desc: "Inicia sesión para desbloquear el dashboard, flujo de soporte y acceso a la tienda." },
      { title: "2. Vincula UID y elige tu pack", desc: "Asegúrate de que tus datos sean correctos antes de comprar un pack." },
      { title: "3. Compra y recibe beneficios VIP", desc: "Las compras se rastrean por Discord y están vinculadas a los beneficios del wipe actual." },
    ],
    warning: "⚠️ Los beneficios VIP están vinculados al wipe activo. Compra durante el wipe para recibir tus recompensas.",
    staffTitle: "👥 Equipo Staff & Admin",
    staffDescription: "Nuestro equipo mantiene el servidor funcionando, responde tickets y mantiene la comunidad positiva.",
    ownerBadge: "👑 Dueño",
    adminBadge: "⚡ Admin",
    loadingStaff: "Cargando equipo...",
    online: "En línea",
    offline: "Desconectado",
  },
};

type AdminEntry = {
  id: string;
  discordId: string;
  username: string;
  avatarUrl?: string;
  role?: string;
  status: string;
  activeNow: boolean;
  lastSeen: string | null;
};

/* ── Easter Egg ── */
const REQUIRED_CLICKS = 5;

type EParticle = {
  x: number; y: number; vx: number; vy: number;
  size: number; color: string; life: number; shape: "circle"|"star"|"ring";
};
type MatrixDrop = { x: number; y: number; speed: number; chars: string[]; opacity: number };

const MATRIX_CHARS = "NEWHOPEGGNSURVIVEADAPTCONTROL01アイウエオカキクケコ▓▒░█▄▀◆◇".split("");
const PARTICLE_COLORS = ["#f97316","#fbbf24","#14b8a6","#a78bfa","#f43f5e","#34d399","#60a5fa","#ffffff","#ff006e","#8338ec"];

function useTypewriter(text: string, speed = 45, active = true) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    if (!active) { setDisplayed(""); return; }
    setDisplayed("");
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(iv);
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed, active]);
  return displayed;
}

function EasterEggOverlay({ onClose }: { onClose: () => void }) {
  const particleCanvas = useRef<HTMLCanvasElement>(null);
  const matrixCanvas  = useRef<HTMLCanvasElement>(null);
  const pRef  = useRef<EParticle[]>([]);
  const mRef  = useRef<MatrixDrop[]>([]);
  const pRaf  = useRef<number>(0);
  const mRaf  = useRef<number>(0);
  const shakeRef = useRef<HTMLDivElement>(null);

  /* phases: intro → boot → glitch → reveal → lore → done */
  const [phase, setPhase] = useState<"intro"|"boot"|"glitch"|"reveal"|"lore"|"done">("intro");
  const [countdown, setCountdown] = useState<3|2|1|0>(3);
  const [countFlash, setCountFlash] = useState(false);
  const [glitchFrame, setGlitchFrame] = useState(0);
  const [showMatrix, setShowMatrix] = useState(true);
  const [ringScale, setRingScale] = useState(0);

  const lore1 = useTypewriter("SIGNAL ORIGIN: UNKNOWN", 38, phase === "lore");
  const lore2 = useTypewriter("FOUNDING MEMBERS: CLASSIFIED", 38, phase === "lore");
  const lore3 = useTypewriter("YOU ARE ONE OF US NOW.", 55, phase === "lore");

  /* ── screen shake ── */
  const shake = useCallback(() => {
    const el = shakeRef.current;
    if (!el) return;
    let t = 0;
    const iv = setInterval(() => {
      const s = Math.max(0, 1 - t / 500);
      el.style.transform = `translate(${(Math.random()-0.5)*18*s}px,${(Math.random()-0.5)*12*s}px) rotate(${(Math.random()-0.5)*1.5*s}deg)`;
      t += 16;
      if (t > 500) { el.style.transform = ""; clearInterval(iv); }
    }, 16);
  }, []);

  /* ── particle burst ── */
  const burst = useCallback((cx: number, cy: number, n: number, force = 1) => {
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n + Math.random() * 0.6;
      const speed = (3 + Math.random() * 16) * force;
      const shapes: EParticle["shape"][] = ["circle","circle","circle","star","ring"];
      pRef.current.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - Math.random() * 5 * force,
        size: 2 + Math.random() * 6,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
        life: 0.9 + Math.random() * 0.3,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
      });
    }
  }, []);

  /* ── matrix rain ── */
  useEffect(() => {
    const canvas = matrixCanvas.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const cols = Math.floor(canvas.width / 18);
    mRef.current = Array.from({ length: cols }, (_, i) => ({
      x: i * 18 + 9, y: Math.random() * -canvas.height,
      speed: 1.5 + Math.random() * 3,
      chars: Array.from({ length: 28 }, () => MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]),
      opacity: 0.3 + Math.random() * 0.5,
    }));
    let alive = true;
    const draw = () => {
      if (!alive) return;
      ctx.fillStyle = "rgba(0,0,0,0.06)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      mRef.current.forEach(d => {
        d.y += d.speed;
        if (d.y > canvas.height + 200) { d.y = -200; d.speed = 1.5 + Math.random() * 3; }
        d.chars.forEach((ch, k) => {
          const alpha = Math.max(0, d.opacity - k * 0.035);
          if (alpha < 0.01) return;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = k === 0 ? "#ffffff" : k < 3 ? "#f97316" : "#14b8a6";
          ctx.font = `bold ${k === 0 ? 14 : 11}px monospace`;
          ctx.fillText(ch, d.x, d.y - k * 16);
          if (Math.random() < 0.01) d.chars[k] = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
        });
      });
      ctx.globalAlpha = 1;
      mRaf.current = requestAnimationFrame(draw);
    };
    mRaf.current = requestAnimationFrame(draw);
    return () => { alive = false; cancelAnimationFrame(mRaf.current); };
  }, []);

  /* ── particle canvas ── */
  useEffect(() => {
    const canvas = particleCanvas.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const cx = canvas.width / 2, cy = canvas.height / 2;

    burst(cx, cy, 300, 1.4);
    setTimeout(() => burst(cx * 0.4,  cy * 0.6, 120, 1), 100);
    setTimeout(() => burst(cx * 1.6,  cy * 0.7, 120, 1), 200);
    setTimeout(() => burst(cx,        cy * 1.5,  150, 0.9), 340);
    setTimeout(() => burst(cx * 0.3,  cy * 1.4,  80, 0.7), 480);
    setTimeout(() => burst(cx * 1.7,  cy * 1.3,  80, 0.7), 580);
    setTimeout(() => { burst(cx, cy, 200, 0.6); shake(); }, 1400);

    let alive = true;
    const draw = () => {
      if (!alive) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pRef.current = pRef.current.filter(p => p.life > 0.01);
      pRef.current.forEach(p => {
        p.x  += p.vx; p.y  += p.vy;
        p.vy += 0.18; p.vx *= 0.988;
        p.life -= 0.008 + Math.random() * 0.003;
        const a = Math.max(0, p.life);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.fillStyle   = p.color;
        ctx.shadowBlur  = 16;
        ctx.shadowColor = p.color;
        if (p.shape === "star") {
          ctx.beginPath();
          for (let k = 0; k < 5; k++) {
            const r1 = p.size * p.life, r2 = r1 * 0.45;
            const a1 = (k * Math.PI * 2) / 5 - Math.PI / 2;
            const a2 = a1 + Math.PI / 5;
            if (k === 0) ctx.moveTo(p.x + Math.cos(a1)*r1, p.y + Math.sin(a1)*r1);
            else ctx.lineTo(p.x + Math.cos(a1)*r1, p.y + Math.sin(a1)*r1);
            ctx.lineTo(p.x + Math.cos(a2)*r2, p.y + Math.sin(a2)*r2);
          }
          ctx.closePath(); ctx.fill();
        } else if (p.shape === "ring") {
          ctx.strokeStyle = p.color;
          ctx.lineWidth   = 1.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life * 2, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });
      pRaf.current = requestAnimationFrame(draw);
    };
    pRaf.current = requestAnimationFrame(draw);
    return () => { alive = false; cancelAnimationFrame(pRaf.current); };
  }, [burst, shake]);

  /* ── cinematic countdown ── */
  useEffect(() => {
    const flash = (n: 3|2|1|0) => {
      setCountdown(n);
      setCountFlash(true);
      setTimeout(() => setCountFlash(false), 120);
    };
    // 3 … 2 … 1 … GO
    const t0 = setTimeout(() => flash(3), 100);
    const t1 = setTimeout(() => flash(2), 950);
    const t2 = setTimeout(() => flash(1), 1800);
    const t3 = setTimeout(() => { flash(0); setPhase("boot"); }, 2650);
    return () => [t0,t1,t2,t3].forEach(clearTimeout);
  }, []);

  /* ── phase timeline (fires after boot begins) ── */
  useEffect(() => {
    if (phase !== "boot") return;
    shake();
    const timers = [
      setTimeout(() => setRingScale(1), 200),
      setTimeout(() => { setPhase("glitch"); shake(); }, 800),
      setTimeout(() => setPhase("reveal"), 1800),
      setTimeout(() => { setPhase("lore"); setShowMatrix(false); }, 3200),
      setTimeout(() => setPhase("done"), 11000),
    ];
    let gCount = 0;
    const giv = setInterval(() => {
      setGlitchFrame(f => f + 1);
      gCount++;
      if (gCount > 18) clearInterval(giv);
    }, 80);
    return () => { timers.forEach(clearTimeout); clearInterval(giv); };
  }, [phase, shake]);

  useEffect(() => { if (phase === "done") onClose(); }, [phase, onClose]);

  const isGlitching = phase === "glitch" || (phase === "reveal" && glitchFrame % 7 < 2);
  const gx = isGlitching ? `${(Math.random()-0.5)*10}px` : "0px";
  const gsk = isGlitching ? `${(Math.random()-0.5)*6}deg` : "0deg";

  return (
    <div ref={shakeRef} className="fixed inset-0 z-[9999] overflow-hidden" style={{ background: "rgba(0,0,0,0.95)" }} onClick={onClose}>

      {/* Matrix rain */}
      <canvas ref={matrixCanvas} className="pointer-events-none absolute inset-0"
        style={{ opacity: showMatrix ? 0.55 : 0, transition: "opacity 1.2s" }} />

      {/* Particles */}
      <canvas ref={particleCanvas} className="pointer-events-none absolute inset-0" />

      {/* Scanlines */}
      <div className="pointer-events-none absolute inset-0" style={{
        backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.22) 3px,rgba(0,0,0,0.22) 4px)",
      }} />

      {/* Pulsing rings */}
      {[0,1,2].map(i => (
        <div key={i} className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-orange-500/20"
          style={{
            width:  `${(i+1) * 280}px`, height: `${(i+1) * 280}px`,
            transform: `translate(-50%,-50%) scale(${ringScale})`,
            transition: `transform ${0.6 + i*0.25}s cubic-bezier(0.34,1.56,0.64,1)`,
            boxShadow: `0 0 ${20+i*10}px rgba(249,115,22,${0.12-i*0.03}), inset 0 0 ${30+i*15}px rgba(249,115,22,${0.06-i*0.015})`,
            opacity: ringScale,
          }} />
      ))}

      {/* ── Phase: intro countdown ── */}
      {phase === "intro" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 select-none">
          {/* Vignette flash on each number */}
          <div className="pointer-events-none absolute inset-0 transition-opacity duration-100"
            style={{ background: "radial-gradient(ellipse at center, transparent 30%, rgba(249,115,22,0.18) 100%)", opacity: countFlash ? 1 : 0.3 }} />

          {/* Countdown number */}
          <div key={countdown} className="relative" style={{ animation: "eggCountIn 0.25s cubic-bezier(0.34,1.56,0.64,1)" }}>
            {countdown > 0 ? (
              <div className="text-[clamp(6rem,25vw,14rem)] font-black leading-none tabular-nums"
                style={{
                  color: countdown === 3 ? "#f97316" : countdown === 2 ? "#fbbf24" : "#f43f5e",
                  textShadow: `0 0 60px currentColor, 0 0 120px currentColor`,
                  WebkitTextStroke: "2px currentColor",
                }}>
                {countdown}
              </div>
            ) : (
              <div className="text-[clamp(3rem,12vw,8rem)] font-black leading-none uppercase tracking-widest text-white"
                style={{ textShadow: "0 0 80px #fff, 0 0 160px rgba(249,115,22,0.9)", animation: "eggCountIn 0.2s cubic-bezier(0.34,1.56,0.64,1)" }}>
                GO!
              </div>
            )}
          </div>

          {/* Sub-label */}
          <div className="font-mono text-[11px] uppercase tracking-[0.4em] text-slate-500">
            {countdown === 3 ? "SIGNAL INTERCEPTED" : countdown === 2 ? "DECRYPTING…" : countdown === 1 ? "BREACH IMMINENT" : "NEXUS ONLINE"}
          </div>

          {/* Progress bar */}
          <div className="w-48 h-0.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-orange-500 transition-all duration-[850ms] ease-linear"
              style={{ width: countdown === 3 ? "33%" : countdown === 2 ? "66%" : "100%" }} />
          </div>
        </div>
      )}

      {/* ── Phase: boot ── */}
      {phase === "boot" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="font-mono text-xs text-teal-400/60 animate-pulse tracking-widest">SIGNAL DETECTED…</div>
        </div>
      )}

      {/* ── Phase: glitch ── */}
      {(phase === "glitch" || phase === "reveal") && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative select-none" style={{ transform: `translateX(${gx}) skewX(${gsk})`, transition: "transform 0.04s" }}>
            <div className="text-[clamp(3rem,10vw,7rem)] font-black uppercase tracking-[0.08em] text-white leading-none"
              style={{ textShadow: isGlitching ? "6px 0 #f43f5e,-6px 0 #14b8a6,0 0 60px #f97316" : "0 0 80px rgba(249,115,22,1),0 0 160px rgba(249,115,22,0.5)" }}>
              NEW<span style={{ color: "#f97316" }}>HOPE</span><span style={{ color: "#fbbf24" }}>GGN</span>
            </div>
            {isGlitching && <>
              <div className="absolute inset-0 text-[clamp(3rem,10vw,7rem)] font-black uppercase tracking-[0.08em] leading-none"
                style={{ color: "#f43f5e", opacity: 0.7, transform: "translateX(7px) translateY(-3px) scaleX(1.01)", mixBlendMode: "screen", pointerEvents: "none" }}>NEWHOPEGNN</div>
              <div className="absolute inset-0 text-[clamp(3rem,10vw,7rem)] font-black uppercase tracking-[0.08em] leading-none"
                style={{ color: "#14b8a6", opacity: 0.7, transform: "translateX(-7px) translateY(3px) scaleX(0.99)", mixBlendMode: "screen", pointerEvents: "none" }}>NEWHOPEGNN</div>
              <div className="absolute inset-0 text-[clamp(3rem,10vw,7rem)] font-black uppercase tracking-[0.08em] leading-none"
                style={{ color: "#8338ec", opacity: 0.4, transform: "translateY(5px)", mixBlendMode: "screen", pointerEvents: "none" }}>NEWHOPEGNN</div>
            </>}
          </div>
        </div>
      )}

      {/* ── Phase: lore ── */}
      {phase === "lore" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0 px-4" onClick={e => e.stopPropagation()}>

          {/* Big glowing title */}
          <div className="mb-8 text-center select-none">
            <div className="text-[clamp(2.5rem,8vw,5.5rem)] font-black uppercase tracking-[0.1em] leading-none"
              style={{ textShadow: "0 0 80px rgba(249,115,22,1),0 0 160px rgba(249,115,22,0.6),0 0 240px rgba(249,115,22,0.3)" }}>
              <span style={{ color: "#fed7aa" }}>NEW</span><span style={{ color: "#f97316" }}>HOPE</span><span style={{ color: "#fbbf24" }}>GGN</span>
            </div>
            <div className="mt-2 font-mono text-xs sm:text-sm tracking-[0.35em] uppercase text-teal-300/80"
              style={{ textShadow: "0 0 20px rgba(20,184,166,0.9)" }}>
              ── SIGNAL RECEIVED ──
            </div>
          </div>

          {/* Terminal card */}
          <div className="w-full max-w-lg rounded-2xl border border-teal-500/25 bg-black/70 overflow-hidden backdrop-blur-sm"
            style={{ boxShadow: "0 0 60px rgba(20,184,166,0.15),0 0 120px rgba(249,115,22,0.08),inset 0 1px 0 rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2 border-b border-teal-500/15 bg-teal-500/5 px-5 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-teal-400" />
              <span className="ml-3 font-mono text-[10px] text-teal-400/60 tracking-widest">NEXUS_CLASSIFIED.EXE</span>
            </div>
            <div className="p-6 font-mono text-sm space-y-3">
              <div className="text-teal-400">
                <span className="text-teal-600 mr-2">&gt;_</span>{lore1}<span className="animate-pulse">▋</span>
              </div>
              {lore1.length >= 22 && (
                <div className="text-orange-300">
                  <span className="text-teal-600 mr-2">&gt;_</span>{lore2}<span className="animate-pulse">▋</span>
                </div>
              )}
              {lore2.length >= 28 && (
                <div className="mt-2 text-white font-bold text-base">
                  <span className="text-teal-600 mr-2">&gt;_</span>{lore3}<span className="animate-pulse text-orange-400">█</span>
                </div>
              )}
              {lore3.length >= 21 && (
                <div className="mt-4 pt-4 border-t border-white/8">
                  <div className="text-[10px] text-slate-600 uppercase tracking-widest mb-3">// COMMUNITY INTEL //</div>
                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    {[
                      { k: "STATUS", v: "ACTIVE", c: "text-teal-400" },
                      { k: "WIPE CYCLE", v: "ONGOING", c: "text-amber-400" },
                      { k: "FOUNDING BASE", v: "SECURED", c: "text-emerald-400" },
                      { k: "YOUR RANK", v: "SIGNAL BEARER", c: "text-orange-300" },
                    ].map(({k,v,c}) => (
                      <div key={k} className="rounded-lg border border-white/6 bg-white/3 px-3 py-2">
                        <div className="text-slate-600 text-[9px] uppercase tracking-wider">{k}</div>
                        <div className={`font-bold mt-0.5 ${c}`}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Lore text */}
          {lore3.length >= 21 && (
            <div className="mt-6 max-w-md text-center text-sm text-slate-400 leading-relaxed animate-[fadeIn_0.6s_ease]">
              Before the servers, before the wipes — there was a signal.<br />
              A small group heard it first. They called it{" "}
              <span className="font-bold text-orange-300" style={{ textShadow: "0 0 20px rgba(249,115,22,0.8)" }}>NewHopeGGN</span>.
            </div>
          )}

          <div className="mt-6 text-[10px] text-slate-700 uppercase tracking-widest animate-pulse">tap anywhere to return</div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [lang, setLang] = useState<"en" | "es">("en");
  const [staff, setStaff] = useState<AdminEntry[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [wipeMs, setWipeMs] = useState<number | null>(null);
  const [wipeLabel, setWipeLabel] = useState("Server Wipe");
  const [now, setNow] = useState(Date.now());
  const [eggClicks, setEggClicks] = useState(0);
  const [eggActive, setEggActive] = useState(false);
  const eggTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChipClick = useCallback(() => {
    setEggClicks(prev => {
      const next = prev + 1;
      if (eggTimerRef.current) clearTimeout(eggTimerRef.current);
      if (next >= REQUIRED_CLICKS) {
        setEggActive(true);
        return 0;
      }
      eggTimerRef.current = setTimeout(() => setEggClicks(0), 2500);
      return next;
    });
  }, []);

  const t = translations[lang];

  useEffect(() => {
    const loadStaff = () => {
      fetch("/api/staff", { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => { if (data?.staff) setStaff(data.staff); })
        .catch(() => setStaff([]))
        .finally(() => setStaffLoading(false));
    };
    loadStaff();
    const interval = setInterval(loadStaff, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchWipe = () => {
      fetch("/api/admin/wipe-timer", { cache: "no-store" })
        .then(r => r.json())
        .then(d => {
          if (d.ok && d.wipeAt) {
            setWipeMs(new Date(d.wipeAt).getTime());
            setWipeLabel(d.label ?? "Server Wipe");
          } else if (d.ok && !d.wipeAt) {
            setWipeMs(null);
          }
        }).catch(() => {});
    };
    fetchWipe();
    const poll = setInterval(fetchWipe, 30000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(poll); clearInterval(tick); };
  }, []);

  return (
    <div className="relative overflow-hidden">
      {/* Background video */}
      <video
        src="/AZ2Xd1Tx6lhyVmCtVBpXGQ-AZ2Xd1TxHNndMCl7LDOOBg.mp4"
        autoPlay loop muted playsInline
        className="pointer-events-none absolute inset-0 w-full h-full object-cover opacity-15"
        onError={(e) => { (e.currentTarget as HTMLVideoElement).style.display = "none"; }}
      />
      <div className="pointer-events-none absolute inset-0 rz-bg opacity-30 rz-drift" />
      <div className="pointer-events-none absolute inset-0 rz-grid opacity-20" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(4,16,24,0.55),rgba(4,16,24,0.7),rgba(4,16,24,0.97))]" />
      <div className="pointer-events-none absolute -left-40 top-10 h-80 w-80 rounded-full bg-cyan-400/14 blur-3xl rz-pulse" />
      <div className="pointer-events-none absolute right-[-6rem] top-36 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl rz-pulse" />
      <div className="pointer-events-none absolute bottom-8 left-1/2 h-64 w-[40rem] -translate-x-1/2 rounded-full bg-amber-300/8 blur-3xl" />

      <section className="relative mx-auto w-full max-w-7xl px-4 py-16 sm:py-24">
        {/* Language Toggle */}
        <div className="absolute top-4 right-4 flex rounded-full border border-white/10 bg-slate-950/80 p-1 backdrop-blur-sm">
          <button
            onClick={() => setLang("en")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full transition ${lang === "en" ? "bg-cyan-500/20 text-cyan-300" : "text-slate-400 hover:text-white"}`}
          >
            EN
          </button>
          <button
            onClick={() => setLang("es")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full transition ${lang === "es" ? "bg-cyan-500/20 text-cyan-300" : "text-slate-400 hover:text-white"}`}
          >
            ES
          </button>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rz-surface rz-panel-border rounded-[2rem] p-7 sm:p-10">
            <div
              className="rz-chip rz-float cursor-pointer select-none"
              onClick={handleChipClick}
              title="..."
            >{t.chip}{eggClicks > 0 && eggClicks < REQUIRED_CLICKS && (
              <span className="ml-1 font-mono text-[10px] text-orange-300/60">{"·".repeat(eggClicks)}</span>
            )}</div>
            {eggActive && <EasterEggOverlay onClose={() => setEggActive(false)} />}

            <h1 className="mt-6 max-w-4xl font-[family:var(--font-brand-display)] text-4xl font-semibold uppercase tracking-[0.06em] text-white sm:text-5xl xl:text-6xl">
              {t.title}
              <span className="mt-3 block bg-[linear-gradient(135deg,#fed7aa,#f97316,#fbbf24)] bg-clip-text text-transparent">
                {t.subtitle}
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-8 text-stone-300 sm:text-lg">
              {t.description}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="/store"
                className="inline-flex h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f97316,#fbbf24)] px-6 text-sm font-bold text-stone-950 transition hover:scale-[1.02] shadow-[0_0_28px_rgba(249,115,22,0.4)]"
              >
                {t.storeBtn}
              </a>
              <a
                href="/admin"
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {t.staffBtn}
              </a>
            </div>

            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {t.highlights.map((item) => (
                <div key={item.title} className="rounded-[1.5rem] border border-white/8 bg-slate-950/55 p-4">
                  <div className="text-sm font-semibold text-white">{item.title}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">{item.copy}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6">
            {/* 😺𝑾𝒊𝒑𝒆 Video */}
            <div className="rz-surface rz-panel-border rounded-[2rem] overflow-hidden">
              <div className="relative w-full aspect-video bg-slate-950">
                <video
                  src="/AZ2Xd1Tx6lhyVmCtVBpXGQ-AZ2Xd1TxHNndMCl7LDOOBg.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLVideoElement).style.display = "none"; }}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/50 pointer-events-none">
                  <div className="text-3xl font-black text-white tracking-widest drop-shadow-lg">😺𝑾𝒊𝒑𝒆</div>
                  <div className="mt-1 text-xs text-slate-300 uppercase tracking-[0.2em]">New Season Starting</div>
                </div>
                {/* Wipe Timer — top right corner */}
                {wipeMs && (() => {
                  const ms = wipeMs - now;
                  const past = ms <= 0;
                  const abs = Math.abs(ms);
                  const d = Math.floor(abs / 86400000);
                  const h = Math.floor((abs % 86400000) / 3600000);
                  const m = Math.floor((abs % 3600000) / 60000);
                  const s = Math.floor((abs % 60000) / 1000);
                  const pad = (n: number) => String(n).padStart(2, "0");
                  const display = d > 0
                    ? `${pad(d)}d ${pad(h)}h ${pad(m)}m`
                    : `${pad(h)}:${pad(m)}:${pad(s)}`;
                  return (
                    <div className={`absolute top-3 right-3 flex flex-col items-end gap-0.5 rounded-xl px-3 py-1.5 backdrop-blur-md pointer-events-none ${
                      past ? "bg-rose-950/80 border border-rose-500/30" : "bg-slate-950/80 border border-orange-500/25"
                    }`}>
                      <div className={`text-[9px] font-bold uppercase tracking-[0.2em] ${
                        past ? "text-rose-400/80" : "text-orange-400/70"
                      }`}>{past ? "⚠ WIPED" : `⏳ ${wipeLabel}`}</div>
                      <div className={`font-mono text-base font-black tabular-nums leading-none ${
                        past ? "text-rose-300" : "text-orange-200"
                      }`}>{display}</div>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="rz-surface rz-panel-border rounded-[2rem] p-6">
              <div className="rz-chip">{t.operationsTitle}</div>
              <div className="mt-5 grid gap-4">
                {t.operations.map((item, index) => (
                  <div
                    key={item}
                    className="flex items-center gap-4 rounded-[1.35rem] border border-white/8 bg-slate-950/55 px-4 py-4"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/10 text-sm font-semibold text-cyan-100">
                      0{index + 1}
                    </div>
                    <div className="text-sm font-medium text-slate-200">{item}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rz-surface rz-panel-border rounded-[2rem] p-6">
              <div className="rz-chip">{t.quickStartTitle}</div>
              <ol className="mt-5 space-y-3 text-sm">
                {t.steps.map((step, idx) => (
                  <li key={idx} className="rounded-[1.35rem] border border-white/8 bg-slate-950/55 px-4 py-4">
                    <div className="font-semibold text-white">{step.title}</div>
                    <div className="mt-1 text-slate-400">{step.desc}</div>
                  </li>
                ))}
              </ol>

              <div className="mt-6 rounded-[1.5rem] border border-orange-400/25 bg-orange-400/10 p-4 text-sm text-orange-100">
                {t.warning}
              </div>
            </div>
          </div>
        </div>

        {/* Wipe Timer */}
        {wipeMs && (() => {
          const ms = wipeMs - now;
          const past = ms <= 0;
          const abs = Math.abs(ms);
          const d = Math.floor(abs / 86400000);
          const h = Math.floor((abs % 86400000) / 3600000);
          const m = Math.floor((abs % 3600000) / 60000);
          const s = Math.floor((abs % 60000) / 1000);
          const pad = (n: number) => String(n).padStart(2, "0");
          const segments = d > 0
            ? [{ val: pad(d), label: "DAYS" }, { val: pad(h), label: "HRS" }, { val: pad(m), label: "MIN" }]
            : [{ val: pad(h), label: "HRS" }, { val: pad(m), label: "MIN" }, { val: pad(s), label: "SEC" }];
          return (
            <div className={`mt-8 rounded-[2rem] border overflow-hidden relative ${past ? "border-rose-500/30 bg-gradient-to-r from-rose-950/40 to-slate-950/60" : "border-orange-500/25 bg-gradient-to-r from-orange-950/30 to-amber-950/20"}`}>
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(249,115,22,0.04),transparent_60%)]" />
              <div className="relative flex flex-col sm:flex-row items-center justify-between gap-6 px-7 py-6">
                <div>
                  <div className={`text-[10px] font-bold uppercase tracking-[0.25em] mb-3 ${past ? "text-rose-400/70" : "text-orange-400/70"}`}>
                    {past ? "⚠ SERVER WIPED" : `⏳ ${wipeLabel}`}
                  </div>
                  <div className="flex items-center gap-1">
                    {segments.map((seg, i) => (
                      <div key={seg.label} className="flex items-center gap-1">
                        {i > 0 && <span className={`text-2xl font-black mb-3 ${past ? "text-rose-500/50" : "text-orange-500/50"}`}>:</span>}
                        <div className="flex flex-col items-center">
                          <div className={`font-mono text-4xl font-black tracking-tighter tabular-nums leading-none px-2 py-1 rounded-xl ${past ? "text-rose-300 bg-rose-500/10 border border-rose-500/20" : "text-orange-200 bg-orange-500/10 border border-orange-500/15"}`}>
                            {seg.val}
                          </div>
                          <div className={`text-[9px] font-bold tracking-[0.2em] mt-1 ${past ? "text-rose-500/60" : "text-orange-500/50"}`}>{seg.label}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-center sm:items-end gap-2">
                  {!past ? (
                    <>
                      <p className="text-xs text-orange-300/60 text-center sm:text-right">Wipe incoming — grab your pack now</p>
                      <a href="/store" className="inline-flex items-center gap-2 rounded-xl border border-orange-400/25 bg-orange-400/10 px-4 py-2 text-xs font-bold text-orange-300 hover:bg-orange-400/20 transition">
                        🛒 Wipe Store
                      </a>
                    </>
                  ) : (
                    <p className="text-xs text-rose-300/50">New wipe timer will be set soon</p>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Staff & Admin Team Section */}
        <div className="mt-12 rz-surface rz-panel-border rounded-[2rem] p-7 sm:p-10">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">{t.staffTitle}</h2>
              <p className="mt-1 text-sm text-slate-400">{t.staffDescription}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-slate-400">{staff.filter(s => s.activeNow).length} {t.online}</span>
              </div>
              <div className="h-3 w-px bg-white/10" />
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-slate-600" />
                <span className="text-xs text-slate-500">{staff.filter(s => !s.activeNow).length} {t.offline}</span>
              </div>
            </div>
          </div>

          {staffLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mr-3" />
              {t.loadingStaff}
            </div>
          ) : staff.length === 0 ? (
            <div className="text-center py-8 text-slate-500">Staff team loading...</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {staff.map((member) => (
                <div
                  key={member.discordId}
                  className={`flex items-center gap-3 rounded-[1.25rem] border p-4 transition hover:scale-[1.02] ${
                    member.role === "owner"
                      ? "border-amber-400/30 bg-gradient-to-r from-amber-500/10 to-transparent"
                      : "border-white/10 bg-slate-950/40"
                  }`}
                >
                  <div className="relative shrink-0">
                    {member.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={member.avatarUrl}
                        alt={member.username}
                        className={`h-12 w-12 rounded-xl object-cover ${
                          member.role === "owner" ? "ring-2 ring-amber-400/50" : "ring-1 ring-white/10"
                        }`}
                      />
                    ) : (
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold ${
                          member.role === "owner"
                            ? "bg-amber-400/20 text-amber-300 ring-2 ring-amber-400/50"
                            : "bg-white/10 text-slate-300 ring-1 ring-white/10"
                        }`}
                      >
                        {member.username[0].toUpperCase()}
                      </div>
                    )}
                    {/* Online status dot on avatar */}
                    <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-900 ${
                      member.activeNow ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" : "bg-slate-600"
                    }`} />
                    {member.role === "owner" && (
                      <span className="absolute -top-1 -right-1 text-xs">👑</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-white truncate">{member.username}</div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {member.role === "owner" ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                          {t.ownerBadge}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded">
                          {t.adminBadge}
                        </span>
                      )}
                      {/* Online/Offline indicator */}
                      <span className={`text-[10px] font-medium ${member.activeNow ? "text-emerald-400" : "text-slate-500"}`}>
                        {member.activeNow ? "● " + t.online : "● " + t.offline}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Links Footer */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {[
            { href: "/store",     label: "🛒 Store" },
            { href: "/community", label: "👥 Community" },
            { href: "/support",   label: "🎫 Support" },
            { href: "/minigame",  label: "☣️ Minigame" },
            { href: "/bans",      label: "🔨 Ban List" },
            { href: "/rules",     label: "📋 Rules" },
          ].map(link => (
            <a key={link.href} href={link.href}
              className="rounded-full border border-white/8 bg-white/3 px-4 py-1.5 text-xs font-semibold text-slate-400 hover:bg-white/8 hover:text-white transition">
              {link.label}
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
