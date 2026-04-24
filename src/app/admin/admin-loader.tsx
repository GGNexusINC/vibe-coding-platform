"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import dynamic from "next/dynamic";

const AdminPanelClient = dynamic(
  () => import("@/app/admin/admin-panel-client").then((mod) => mod.AdminPanelClient),
  { 
    ssr: false,
    loading: () => (
      <div className="py-20 text-center animate-pulse text-slate-500 font-bold italic">
        Initializing Admin Center...
      </div>
    )
  }
);

class AdminPanelErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[admin] Admin panel failed to render", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6 text-center shadow-2xl">
          <h2 className="text-xl font-black text-rose-100">Admin panel could not finish loading.</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-rose-100/75">
            The login worked, but the dashboard bundle hit a browser-side error. Reload once; if it repeats,
            clear this browser&apos;s site data for NewHopeGGN and sign in again.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-full bg-rose-400 px-5 py-2 text-sm font-black text-slate-950"
            >
              Reload Admin
            </button>
            <a
              href="/auth/admin/start"
              className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-black text-white"
            >
              Sign In Again
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function AdminLoader() {
  return (
    <AdminPanelErrorBoundary>
      <AdminPanelClient />
    </AdminPanelErrorBoundary>
  );
}
