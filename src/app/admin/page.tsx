import { AdminPanelClient } from "@/app/admin/admin-panel-client";

export default function AdminPage() {
  return (
    <div className="relative mx-auto w-full max-w-7xl px-4 py-10 sm:py-14">
      <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_top,rgba(103,232,249,0.12),transparent_38%),radial-gradient(circle_at_80%_20%,rgba(34,197,94,0.12),transparent_34%),radial-gradient(circle_at_50%_100%,rgba(245,158,11,0.08),transparent_40%)]" />
      <section className="relative">
        <div className="max-w-3xl">
          <div className="rz-chip">Admin Command Center</div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Run broadcasts, track members, and manage Discord-facing activity in one place.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
            Use presets, live stats, raw Discord profile details, and targeted webhook posting without leaving the dashboard.
          </p>
        </div>

        <div className="mt-10">
          <AdminPanelClient />
        </div>
      </section>
    </div>
  );
}
