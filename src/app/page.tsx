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
const EGG_MESSAGES = [
  "YOU FOUND IT.",
  "THE SIGNAL WAS ALWAYS THERE.",
  "SURVIVE. ADAPT. CONTROL.",
  "THE NEXUS REMEMBERS YOU.",
];

type Particle = { id: number; x: number; y: number; vx: number; vy: number; size: number; color: string; life: number };

function EasterEggOverlay({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const [phase, setPhase] = useState<"explode" | "reveal" | "done">("explode");
  const [msgIdx, setMsgIdx] = useState(0);
  const [glitch, setGlitch] = useState(false);

  const colors = ["#f97316","#fbbf24","#14b8a6","#a78bfa","#f43f5e","#34d399","#60a5fa","#fff"];

  const spawnBurst = useCallback((cx: number, cy: number, count: number) => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const speed = 4 + Math.random() * 14;
      particlesRef.current.push({
        id: Date.now() + i + Math.random(),
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - Math.random() * 4,
        size: 2 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
      });
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Initial mega burst
    spawnBurst(canvas.width / 2, canvas.height / 2, 220);
    setTimeout(() => spawnBurst(canvas.width * 0.25, canvas.height * 0.35, 80), 120);
    setTimeout(() => spawnBurst(canvas.width * 0.75, canvas.height * 0.4, 80), 240);
    setTimeout(() => spawnBurst(canvas.width / 2, canvas.height * 0.65, 120), 360);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current = particlesRef.current.filter(p => p.life > 0.01);
      particlesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.22; // gravity
        p.vx *= 0.985;
        p.life -= 0.012;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 12;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [spawnBurst]);

  // Phase sequence
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("reveal"), 900);
    const t2 = setTimeout(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 300);
    }, 1200);
    const t3 = setTimeout(() => setPhase("done"), 6500);
    // Cycle messages
    const iv = setInterval(() => setMsgIdx(i => (i + 1) % EGG_MESSAGES.length), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearInterval(iv); };
  }, []);

  useEffect(() => { if (phase === "done") onClose(); }, [phase, onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-black/92 backdrop-blur-sm"
      onClick={onClose}
    >
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" />

      {/* Scanline overlay */}
      <div className="pointer-events-none absolute inset-0" style={{
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.18) 2px, rgba(0,0,0,0.18) 4px)",
      }} />

      {/* Central content */}
      {phase !== "explode" && (
        <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center select-none">
          {/* Glitch logo */}
          <div className="relative">
            <div
              className="text-5xl sm:text-7xl font-black uppercase tracking-[0.12em] text-white"
              style={{
                textShadow: glitch
                  ? "4px 0 #f43f5e, -4px 0 #14b8a6, 0 0 40px #f97316"
                  : "0 0 60px rgba(249,115,22,0.9), 0 0 120px rgba(249,115,22,0.4)",
                transform: glitch ? `skewX(${(Math.random()-0.5)*8}deg) translateX(${(Math.random()-0.5)*6}px)` : "none",
                transition: "transform 0.05s",
              }}
            >
              NEW<span style={{ color: "#f97316" }}>HOPE</span>GGN
            </div>
            {/* Glitch clone layers */}
            {glitch && (
              <>
                <div className="absolute inset-0 text-5xl sm:text-7xl font-black uppercase tracking-[0.12em]" style={{ color: "#f43f5e", opacity: 0.6, transform: "translateX(5px) translateY(-2px)", mixBlendMode: "screen" }}>NEWHOPEGNN</div>
                <div className="absolute inset-0 text-5xl sm:text-7xl font-black uppercase tracking-[0.12em]" style={{ color: "#14b8a6", opacity: 0.6, transform: "translateX(-5px) translateY(2px)", mixBlendMode: "screen" }}>NEWHOPEGNN</div>
              </>
            )}
          </div>

          {/* Cycling secret message */}
          <div className="font-mono text-sm sm:text-lg font-bold uppercase tracking-[0.3em] text-teal-300"
            style={{ textShadow: "0 0 20px rgba(20,184,166,0.8)", minHeight: "2rem" }}>
            {EGG_MESSAGES[msgIdx]}
          </div>

          {/* Lore card */}
          <div className="mt-2 rounded-2xl border border-orange-500/30 bg-orange-500/8 px-8 py-5 max-w-md backdrop-blur-sm"
            style={{ boxShadow: "0 0 40px rgba(249,115,22,0.2), inset 0 1px 0 rgba(255,255,255,0.06)" }}>
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-400 mb-2">// CLASSIFIED — NEXUS LORE //</div>
            <p className="text-sm text-slate-200 leading-relaxed">
              Before the servers, before the wipes — there was a signal. A small group heard it first.
              They built a base not of metal, but of trust. They called it <span className="font-bold text-orange-300">NewHopeGGN</span>.
              You found the signal too.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-teal-300">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-400 shadow-[0_0_6px_rgba(20,184,166,1)]" />
              SIGNAL RECEIVED
            </div>
          </div>

          <div className="mt-2 text-[10px] text-slate-600 uppercase tracking-widest">tap anywhere to return</div>
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
