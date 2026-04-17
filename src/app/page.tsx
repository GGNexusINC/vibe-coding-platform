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
  },
};

type AdminEntry = {
  id: string;
  discordId: string;
  username: string;
  avatarUrl?: string;
  role?: string;
  status: string;
};

export default function Home() {
  const [lang, setLang] = useState<"en" | "es">("en");
  const [staff, setStaff] = useState<AdminEntry[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);

  const t = translations[lang];

  useEffect(() => {
    fetch("/api/staff", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data?.staff) {
          setStaff(data.staff);
        }
      })
      .catch(() => setStaff([]))
      .finally(() => setStaffLoading(false));
  }, []);

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 rz-bg opacity-30 rz-drift" />
      <div className="pointer-events-none absolute inset-0 rz-grid opacity-20" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(103,232,249,0.06),rgba(4,16,24,0.4),rgba(4,16,24,0.95))]" />
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

        {/* Staff & Admin Team Section */}
        <div className="mt-12 rz-surface rz-panel-border rounded-[2rem] p-7 sm:p-10">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">{t.staffTitle}</h2>
              <p className="mt-1 text-sm text-slate-400">{t.staffDescription}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-slate-500">{staffLoading ? t.loadingStaff : `${staff.length} online`}</span>
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
                    {member.role === "owner" && (
                      <span className="absolute -top-1 -right-1 text-xs">👑</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-white truncate">{member.username}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {member.role === "owner" ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                          {t.ownerBadge}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded">
                          {t.adminBadge}
                        </span>
                      )}
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
