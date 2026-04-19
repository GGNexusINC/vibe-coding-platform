"use client";

import { useState, useEffect } from "react";

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

export default function Home() {
  const [lang, setLang] = useState<"en" | "es">("en");
  const [staff, setStaff] = useState<AdminEntry[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [wipeMs, setWipeMs] = useState<number | null>(null);
  const [wipeLabel, setWipeLabel] = useState("Server Wipe");
  const [now, setNow] = useState(Date.now());

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
    fetch("/api/admin/wipe-timer")
      .then(r => r.json())
      .then(d => {
        if (d.ok && d.wipeAt) {
          setWipeMs(new Date(d.wipeAt).getTime());
          setWipeLabel(d.label ?? "Server Wipe");
        }
      }).catch(() => {});
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
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
            <div className="rz-chip rz-float">{t.chip}</div>

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
      </section>
    </div>
  );
}
