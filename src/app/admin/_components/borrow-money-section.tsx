"use client";

import { useEffect, useState, useRef } from "react";
import type { BorrowRequest } from "@/lib/borrow-store";
import { PayPalProvider } from "@/app/store/paypal-provider";
import { PayPalButtons } from "@paypal/react-paypal-js";

type Viewer = {
  discordId?: string;
  username?: string;
  isOwner: boolean;
};

export function BorrowMoneySection({ viewer }: { viewer?: Viewer }) {
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actioning, setActioning] = useState(false);

  // Request form state
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [preferredCycle, setPreferredCycle] = useState("weekly");
  const [repaymentDayOfWeek, setRepaymentDayOfWeek] = useState("Monday");
  const [requestedInstallments, setRequestedInstallments] = useState(4);
  const [requestedApr] = useState(15);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Review modal state
  const [selectedRequest, setSelectedRequest] = useState<BorrowRequest | null>(null);
  const [decision, setDecision] = useState<"approved" | "rejected">("approved");
  const [adminReasoning, setAdminReasoning] = useState("");
  const [cycleFrequency, setCycleFrequency] = useState("weekly");
  const [installments, setInstallments] = useState(4);
  const [startDate, setStartDate] = useState("");
  const [modalError, setModalError] = useState("");
  const [approvedAmount, setApprovedAmount] = useState("");
  const [approvedApr, setApprovedApr] = useState(15);

  // Signature state
  const [legalName, setLegalName] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [signingError, setSigningError] = useState("");
  const [signingLoading, setSigningLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const isOwner = viewer?.isOwner ?? false;

  // Initialize start date to 7 days from now
  useEffect(() => {
    const future = new Date();
    future.setDate(future.getDate() + 7);
    const yyyy = future.getFullYear();
    const mm = String(future.getMonth() + 1).padStart(2, "0");
    const dd = String(future.getDate()).padStart(2, "0");
    setStartDate(`${yyyy}-${mm}-${dd}`);
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/borrow");
      const data = await res.json();
      if (data.ok) {
        setRequests(data.requests);
      }
    } catch (e) {
      console.error("Failed to load requests:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError("Please enter a valid amount greater than $0.");
      return;
    }
    if (!reason.trim()) {
      setFormError("Please enter the reason for borrowing.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/borrow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: numAmount, reason, preferredCycle, repaymentDayOfWeek, requestedInstallments, requestedApr }),
      });
      const data = await res.json();
      if (data.ok) {
        setFormSuccess("Loan request submitted successfully!");
        setAmount("");
        setReason("");
        setPreferredCycle("weekly");
        setRepaymentDayOfWeek("Monday");
        setRequestedInstallments(4);
        loadRequests();
      } else {
        setFormError(data.error || "Failed to submit request.");
      }
    } catch (err) {
      setFormError("A network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenReview = (req: BorrowRequest) => {
    setSelectedRequest(req);
    setDecision("approved");
    setAdminReasoning("");
    setCycleFrequency(req.preferredCycle || "weekly");
    setInstallments(req.requestedInstallments || 4);
    setModalError("");
    setLegalName(req.legalName || "");
    setHasSigned(false);
    setSigningError("");
    setAcceptTerms(false);
    setApprovedAmount(String(req.amount));
    setApprovedApr(req.requestedApr || 15);
  };

  const handleCloseReview = () => {
    setSelectedRequest(null);
    setLegalName("");
    setHasSigned(false);
    setSigningError("");
    setAcceptTerms(false);
    setApprovedAmount("");
    setApprovedApr(15);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    let x = 0;
    let y = 0;
    
    if ("touches" in e) {
      if (e.touches.length === 0) return;
      x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
      e.preventDefault();
    } else {
      x = (e.clientX - rect.left) * (canvas.width / rect.width);
      y = (e.clientY - rect.top) * (canvas.height / rect.height);
    }
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    let x = 0;
    let y = 0;
    
    if ("touches" in e) {
      if (e.touches.length === 0) return;
      x = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      y = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
      e.preventDefault();
    } else {
      x = (e.clientX - rect.left) * (canvas.width / rect.width);
      y = (e.clientY - rect.top) * (canvas.height / rect.height);
    }
    
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSigned(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  const handleSubmitDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    setModalError("");

    const parsedApprovedAmount = Number(approvedAmount);
    if (decision === "approved") {
      if (isNaN(parsedApprovedAmount) || parsedApprovedAmount <= 0) {
        setModalError("Please enter a valid approved loan amount.");
        return;
      }
    }

    if (!adminReasoning.trim()) {
      setModalError("Please provide reasoning for your decision.");
      return;
    }

    const payload: Record<string, any> = {
      status: decision,
      adminReasoning,
    };

    if (decision === "approved") {
      const adminInterest = parsedApprovedAmount * (approvedApr / 100) * (installments / 52);
      const adminTotalRepayment = parsedApprovedAmount + adminInterest;
      const amountPerCycle = installments > 0 ? Math.round((adminTotalRepayment / installments) * 100) / 100 : 0;
      
      payload.cycle = {
        frequency: cycleFrequency,
        installments,
        amountPerCycle,
        startDate,
        apr: approvedApr,
        totalInterest: Math.round(adminInterest * 100) / 100,
        totalRepayment: Math.round(adminTotalRepayment * 100) / 100,
        approvedAmount: parsedApprovedAmount,
      };
    }

    setActioning(true);
    try {
      const res = await fetch(`/api/admin/borrow/${selectedRequest.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok) {
        handleCloseReview();
        loadRequests();
      } else {
        setModalError(data.error || "Failed to submit decision.");
      }
    } catch (err) {
      setModalError("A network error occurred. Please try again.");
    } finally {
      setActioning(false);
    }
  };

  // Repayment calculator values
  const adminInterest = (Number(approvedAmount) || 0) * (approvedApr / 100) * (installments / 52);
  const adminTotalRepayment = (Number(approvedAmount) || 0) + adminInterest;
  const calculatedInstallment = installments > 0
    ? Math.round((adminTotalRepayment / installments) * 100) / 100
    : 0;

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const nonPendingRequests = requests.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-10">
      {/* Overview stats */}
      <div className="grid gap-6 sm:grid-cols-3">
        <div className="rz-lux-panel rounded-3xl p-6 border border-white/8">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Pending Approval
          </div>
          <div className="mt-2 text-3xl font-bold text-amber-400">
            {requests.filter((r) => r.status === "pending").length}
          </div>
          <div className="text-xs text-slate-400 mt-1">Awaiting admin review</div>
        </div>

        <div className="rz-lux-panel rounded-3xl p-6 border border-white/8">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Total Active Loans
          </div>
          <div className="mt-2 text-3xl font-bold text-emerald-400">
            ${requests
              .filter((r) => r.status === "approved")
              .reduce((sum, r) => sum + r.amount, 0)
              .toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 mt-1">Approved loans in repayment</div>
        </div>

        <div className="rz-lux-panel rounded-3xl p-6 border border-white/8">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Active Credit Accounts
          </div>
          <div className="mt-2 text-3xl font-bold text-sky-400">
            {new Set(requests.map((r) => r.discordId)).size}
          </div>
          <div className="text-xs text-slate-400 mt-1">Unique active credit users</div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left Side: Submit Form (For all staff members) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rz-lux-panel rounded-3xl p-7 border border-white/8">
            <h3 className="text-lg font-bold text-white mb-2">Apply for GGNexus Credit</h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Submit a formal credit loan application. GGNexus Bank administrators will evaluate your request, establish APR interest terms, and construct your binding Promissory Note.
            </p>

            <form onSubmit={handleCreateRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Principal Loan Amount ($)
                </label>
                <div className="relative rounded-2xl border border-white/10 bg-slate-950 focus-within:border-cyan-400/50 transition">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-slate-500 text-sm">
                    $
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="250"
                    disabled={submitting}
                    className="w-full bg-transparent py-3 pl-8 pr-4 text-sm font-semibold text-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Preferred Repayment Cycle
                </label>
                <select
                  value={preferredCycle}
                  onChange={(e) => setPreferredCycle(e.target.value)}
                  disabled={submitting}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-200 focus:border-cyan-400/50 focus:outline-none transition"
                >
                  <option value="weekly">Weekly repayments</option>
                  <option value="biweekly" disabled>Bi-weekly repayments (Coming Soon)</option>
                  <option value="monthly" disabled>Monthly repayments (Coming Soon)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Repayment Term (Duration)
                </label>
                <select
                  value={requestedInstallments}
                  onChange={(e) => setRequestedInstallments(Number(e.target.value))}
                  disabled={submitting}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-200 focus:border-cyan-400/50 focus:outline-none transition"
                >
                  <option value={4}>4 Weeks (Short Term)</option>
                  <option value={8}>8 Weeks (Standard)</option>
                  <option value={12}>12 Weeks (Extended)</option>
                  <option value={16}>16 Weeks (Extended +)</option>
                  <option value={24}>24 Weeks (Long Term)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Repayment Day of the Week
                </label>
                <select
                  value={repaymentDayOfWeek}
                  onChange={(e) => setRepaymentDayOfWeek(e.target.value)}
                  disabled={submitting}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-200 focus:border-cyan-400/50 focus:outline-none transition"
                >
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Reason for borrowing
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Need help covering repair costs for transport..."
                  rows={4}
                  disabled={submitting}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-medium text-white placeholder-slate-650 focus:border-cyan-400/50 focus:outline-none transition resize-none"
                  required
                />
              </div>

              {/* Dynamic Loan Calculator Preview */}
              {Number(amount) > 0 && (
                <div className="rounded-2xl border border-cyan-400/15 bg-slate-950/80 p-4 space-y-2 text-xs">
                  <div className="font-bold text-cyan-400 text-[10px] uppercase tracking-wider mb-1">
                    📊 Live Loan Quote Summary
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Principal Loan Amount:</span>
                    <span className="font-bold text-white">${Number(amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Interest rate (APR):</span>
                    <span className="font-bold text-emerald-400">{requestedApr.toFixed(2)}% APR</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Term Duration:</span>
                    <span className="font-bold text-white">{requestedInstallments} Weeks ({requestedInstallments} installments)</span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-1.5 mt-1 text-[11px]">
                    <span className="text-slate-400 font-medium">Estimated Interest (Finance Charge):</span>
                    <span className="font-bold text-amber-300">
                      ${(Number(amount) * (requestedApr / 100) * (requestedInstallments / 52)).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-1.5 mt-1 text-sm font-bold">
                    <span className="text-white">Total of Payments (Total Debt):</span>
                    <span className="text-cyan-400 font-black">
                      ${(Number(amount) + (Number(amount) * (requestedApr / 100) * (requestedInstallments / 52))).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-1.5 mt-1 text-xs font-black">
                    <span className="text-white">Estimated Weekly Payment:</span>
                    <span className="text-emerald-400 text-sm">
                      ${((Number(amount) + (Number(amount) * (requestedApr / 100) * (requestedInstallments / 52))) / requestedInstallments).toFixed(2)} / week
                    </span>
                  </div>
                </div>
              )}

              {formError && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
                  {formError}
                </div>
              )}

              {formSuccess && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300">
                  {formSuccess}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex h-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--accent-cyan),var(--accent-green))] text-sm font-bold text-stone-950 transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                {submitting ? "Submitting Application..." : "Submit Loan Application"}
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Admin reviews / history */}
        <div className="lg:col-span-7 space-y-6">
          {/* Admin Pending Requests Desk (Only shown to Owners) */}
          {isOwner && (
            <div className="rz-lux-panel rounded-3xl p-7 border border-white/8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Pending Team Requests</h3>
                <span className="rounded-full bg-amber-400/15 px-3 py-1 text-[10px] font-black text-amber-300 uppercase tracking-wider">
                  Admin Inbox
                </span>
              </div>

              {pendingRequests.length === 0 ? (
                <div className="text-center py-10 border border-white/4 rounded-2xl bg-white/1 px-4">
                  <div className="text-2xl mb-1 text-slate-600">📥</div>
                  <h4 className="text-xs font-bold text-slate-400">All caught up!</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">No pending borrow requests to review.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                  {pendingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="group border border-white/6 rounded-2xl bg-slate-950/40 p-4 transition hover:border-white/12 hover:bg-slate-950/80 flex flex-col sm:flex-row justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-100">{req.username}</span>
                          <span className="text-[10px] text-slate-500">({req.discordId})</span>
                        </div>
                        <p className="text-xs text-slate-300">
                          wants to borrow <strong className="text-amber-300">${req.amount}</strong>
                        </p>
                        <p className="text-xs text-slate-400 italic mt-1 line-clamp-2">
                          &quot;{req.reason}&quot;
                        </p>
                        <div className="text-[10px] text-slate-500 mt-1">
                          Prefers: {req.preferredCycle} · Requested on{" "}
                          {new Date(req.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center sm:self-center">
                        <button
                          onClick={() => handleOpenReview(req)}
                          className="w-full sm:w-auto px-4 py-2 text-xs font-bold rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-200 transition hover:bg-cyan-400/25"
                        >
                          Review & Decide
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* User History Table / Master Audit Log */}
          <div className="rz-lux-panel rounded-3xl p-7 border border-white/8">
            <h3 className="text-lg font-bold text-white mb-4">
              {isOwner ? "Master GGNexus Credit Ledger" : "My Active Loans & Applications"}
            </h3>

            {loading ? (
              <div className="py-12 text-center animate-pulse text-slate-500 text-sm font-medium">
                Syncing ledger entries...
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12 border border-white/4 rounded-2xl bg-white/1 px-4 text-slate-500 text-xs">
                No borrow records found on file.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/20">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/5 bg-slate-950/60 font-semibold text-slate-400">
                      {isOwner && <th className="px-4 py-3">Borrower</th>}
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Payment Cycle</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-medium text-slate-300">
                    {requests.map((req) => {
                      const dateStr = new Date(req.createdAt).toLocaleDateString();
                      return (
                        <tr key={req.id} className="hover:bg-white/2 transition">
                          {isOwner && (
                            <td className="px-4 py-3">
                              <div>{req.username}</div>
                              <div className="text-[9px] text-slate-500">{req.discordId}</div>
                            </td>
                          )}
                          <td className="px-4 py-3 font-bold text-white">${req.amount}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                                req.status === "approved"
                                  ? !req.signedAt
                                    ? "border-amber-500/25 bg-amber-500/10 text-amber-300 animate-pulse"
                                    : req.installments === 0
                                      ? "border-sky-500/20 bg-sky-500/10 text-sky-300"
                                      : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                                  : req.status === "rejected"
                                    ? "border-rose-500/20 bg-rose-500/10 text-rose-300"
                                    : "border-amber-500/20 bg-amber-500/10 text-amber-300"
                              }`}
                            >
                              {req.status === "approved"
                                ? !req.signedAt
                                  ? "Awaiting Sign"
                                  : req.installments === 0
                                    ? "Paid Off"
                                    : "Active"
                                : req.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {req.status === "approved" && req.paymentFrequency ? (
                              <div>
                                {req.installments} x ${req.amountPerCycle} ({req.paymentFrequency} on {req.repaymentDayOfWeek || "Monday"})
                              </div>
                            ) : (
                              <div>
                                <div className="text-slate-200">Prefers: {req.preferredCycle}</div>
                                <div className="text-[9px] text-slate-500">Day: {req.repaymentDayOfWeek || "Monday"}</div>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-400">{dateStr}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => {
                                // Reuse review dialog as details drawer for non-pending items too
                                setSelectedRequest(req);
                                setDecision(req.status === "rejected" ? "rejected" : "approved");
                                setAdminReasoning(req.adminReasoning || "");
                                setLegalName(req.legalName || "");
                                if (req.paymentFrequency) {
                                  setCycleFrequency(req.paymentFrequency);
                                  setInstallments(req.installments || 4);
                                  if (req.paymentStartDate) {
                                    setStartDate(req.paymentStartDate.slice(0, 10));
                                  }
                                }
                              }}
                              className="text-cyan-400 hover:text-cyan-200 transition"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review Dialog/Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              body * {
                visibility: hidden !important;
              }
              #printable-contract, #printable-contract * {
                visibility: visible !important;
              }
              #printable-contract {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                background: #ffffff !important;
                color: #0d1527 !important;
                border: none !important;
                padding: 1rem !important;
                box-shadow: none !important;
              }
              #printable-contract .no-print {
                display: none !important;
              }
            }
          `}} />
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl animate-fade-in ${
              selectedRequest.status === "approved" ? "max-w-2xl" : "max-w-lg"
            }`}
          >
            <div className="bg-gradient-to-r from-slate-900 to-slate-950 px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-black text-white">
                {selectedRequest.status === "pending" && isOwner
                  ? "Evaluate Loan Request"
                  : "Loan Request Details"}
              </h3>
              <button
                onClick={handleCloseReview}
                className="text-slate-400 hover:text-white transition text-lg"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={selectedRequest.status === "pending" && isOwner ? handleSubmitDecision : (e) => e.preventDefault()}
              className="p-6 space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar"
            >
              {selectedRequest.status === "pending" && isOwner ? (
                /* Admin Decision View */
                <>
                  {/* Request information header */}
                  <div className="rounded-2xl border border-white/6 bg-white/2 p-4 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Borrower:</span>
                      <span className="font-bold text-white">
                        {selectedRequest.username} ({selectedRequest.discordId})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Principal Requested:</span>
                      <span className="font-bold text-amber-300">${selectedRequest.amount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Preferred Cycle:</span>
                      <span className="font-bold text-white capitalize">{selectedRequest.preferredCycle} repayments (on {selectedRequest.repaymentDayOfWeek || "Monday"})</span>
                    </div>
                    <div className="pt-2 border-t border-white/5">
                      <span className="text-slate-400 block mb-1">Reason:</span>
                      <span className="text-slate-200 italic">&quot;{selectedRequest.reason}&quot;</span>
                    </div>
                  </div>

                  {/* Approval Selection Controls */}
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setDecision("approved")}
                      className={`flex h-11 items-center justify-center rounded-xl border font-bold transition ${
                        decision === "approved"
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                          : "border-white/10 bg-slate-950 text-slate-400 hover:text-slate-250"
                      }`}
                    >
                      Approve Request
                    </button>
                    <button
                      type="button"
                      onClick={() => setDecision("rejected")}
                      className={`flex h-11 items-center justify-center rounded-xl border font-bold transition ${
                        decision === "rejected"
                          ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                          : "border-white/10 bg-slate-950 text-slate-400 hover:text-slate-250"
                      }`}
                    >
                      Reject Request
                    </button>
                  </div>

                  {/* Payment cycle configuration (Only shown on approved) */}
                  {decision === "approved" && (
                    <div className="space-y-3 p-4 rounded-2xl border border-emerald-500/10 bg-emerald-500/4">
                      <div className="px-1 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                        Configure Repayment Schedule
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1.5">
                            Approved Principal Amount ($)
                          </label>
                          <div className="relative rounded-xl border border-white/10 bg-slate-950 focus-within:border-cyan-400/50 transition">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-slate-500 text-xs">$</span>
                            <input
                              type="number"
                              min="1"
                              value={approvedAmount}
                              onChange={(e) => setApprovedAmount(e.target.value)}
                              className="w-full bg-transparent py-2 pl-6 pr-3 text-xs font-semibold text-white focus:outline-none"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1.5">
                            Approved APR (%)
                          </label>
                          <select
                            value={approvedApr}
                            onChange={(e) => setApprovedApr(Number(e.target.value))}
                            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs font-semibold text-white focus:border-cyan-400/50 focus:outline-none transition"
                          >
                            <option value={0}>0.00% APR</option>
                            <option value={5}>5.00% APR</option>
                            <option value={10}>10.00% APR</option>
                            <option value={15}>15.00% APR</option>
                            <option value={20}>20.00% APR</option>
                            <option value={25}>25.00% APR</option>
                            <option value={30}>30.00% APR</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1.5">
                            Frequency
                          </label>
                          <select
                            value={cycleFrequency}
                            onChange={(e) => setCycleFrequency(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs font-semibold text-white focus:outline-none"
                          >
                            <option value="weekly">Weekly</option>
                            <option value="biweekly" disabled>Bi-weekly (Coming Soon)</option>
                            <option value="monthly" disabled>Monthly (Coming Soon)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1.5">
                            Installments Count
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="24"
                            value={installments}
                            onChange={(e) => setInstallments(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs font-semibold text-white focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1.5">
                            Start Repaying On
                          </label>
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs font-semibold text-white focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1.5">
                            Installment Amount
                          </label>
                          <div className="rounded-xl border border-white/5 bg-slate-950 px-3 py-2 text-xs font-black text-emerald-300">
                            ${calculatedInstallment} / cycle
                          </div>
                        </div>
                      </div>

                      {/* Recalculation details breakdown */}
                      <div className="border-t border-white/5 pt-2 text-[10px] text-slate-400 space-y-1">
                        <div className="flex justify-between">
                          <span>Principal Debt:</span>
                          <span className="font-bold text-white">${(Number(approvedAmount) || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Interest ({approvedApr}% APR):</span>
                          <span className="font-bold text-amber-300">${adminInterest.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold border-t border-white/5 pt-1 mt-1">
                          <span className="text-white">Total Repayable:</span>
                          <span className="text-emerald-400">${adminTotalRepayment.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Decision reasoning notes */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Admin Reasoning / Decision Notes (Mandatory)
                    </label>
                    <textarea
                      value={adminReasoning}
                      onChange={(e) => setAdminReasoning(e.target.value)}
                      placeholder="Input reasoning here (e.g. approved based on tenure, rejected due to pending loans...)"
                      rows={3}
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-xs font-medium text-white focus:outline-none resize-none"
                      required
                    />
                  </div>

                  {modalError && (
                    <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-300">
                      {modalError}
                    </div>
                  )}

                  {/* Submit buttons */}
                  <div className="flex gap-3 mt-2">
                    <button
                      type="button"
                      onClick={handleCloseReview}
                      className="flex-1 h-11 rounded-xl border border-white/10 bg-transparent text-xs font-bold text-slate-400 hover:text-white transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actioning}
                      className={`flex-1 h-11 rounded-xl text-xs font-bold text-stone-950 transition active:scale-[0.99] ${
                        decision === "approved"
                          ? "bg-emerald-400 hover:bg-emerald-350"
                          : "bg-rose-400 hover:bg-rose-350"
                      }`}
                    >
                      {actioning ? "Processing..." : "Submit Decision"}
                    </button>
                  </div>
                </>
              ) : selectedRequest.status === "approved" ? (
                /* High-Fidelity Paper Promissory Note View */
                (() => {
                  const docApr = selectedRequest.apr ?? 15;
                  const docAmount = selectedRequest.amount ?? 0;
                  const docInstallments = selectedRequest.installments ?? 4;
                  const docInterest = selectedRequest.totalInterest ?? (docAmount * (docApr / 100) * (docInstallments / 52));
                  const docTotalRepayment = selectedRequest.totalRepayment ?? (docAmount + docInterest);
                  const docAmountPerCycle = selectedRequest.amountPerCycle ?? (docTotalRepayment / docInstallments);
                  const docStartDate = selectedRequest.paymentStartDate
                    ? new Date(selectedRequest.paymentStartDate).toLocaleDateString()
                    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString();
                  const docRepaymentDay = selectedRequest.repaymentDayOfWeek ?? "Monday";
                  const isSigned = !!selectedRequest.signedAt;
                  const canSign = !isSigned && viewer?.discordId === selectedRequest.discordId;

                  return (
                    <div className="space-y-6 pt-2">
                      {/* Physical Paper Page Wrapper */}
                      <div
                        id="printable-contract"
                        className="bg-[#fcfbf9] text-slate-900 border border-slate-350 shadow-2xl p-6 sm:p-8 font-serif rounded-sm relative text-[11px] leading-relaxed select-text"
                      >
                        {/* Letterhead Header */}
                        <div className="text-center space-y-1 mb-6 border-b border-slate-200 pb-4">
                          <h4 className="text-sm font-black uppercase tracking-wider text-slate-800">
                            GGNexus Bank & Trust
                          </h4>
                          <h5 className="text-[10px] font-black text-slate-500 tracking-widest uppercase">
                            Cooperative Capital Concord · Staff Credit Facility
                          </h5>
                        </div>

                        {/* Document Title */}
                        <div className="text-center font-extrabold text-slate-900 text-xs uppercase tracking-widest mb-4">
                          Federal Truth in Lending Act (TILA) Disclosure Statement
                        </div>

                        {/* TILA Boxes Grid */}
                        <div className="border-2 border-slate-950 grid grid-cols-4 text-center divide-x-2 divide-slate-950 bg-white mb-4">
                          {/* Col 1 */}
                          <div className="p-2 flex flex-col justify-between min-h-[90px]">
                            <span className="text-[8px] font-black uppercase tracking-wider text-slate-700 leading-tight">
                              Annual Percentage Rate
                            </span>
                            <span className="text-sm sm:text-base font-black text-slate-950">
                              {docApr.toFixed(2)}%
                            </span>
                            <span className="text-[7px] text-slate-500 leading-tight font-sans">
                              The cost of your credit as a yearly rate.
                            </span>
                          </div>
                          {/* Col 2 */}
                          <div className="p-2 flex flex-col justify-between min-h-[90px]">
                            <span className="text-[8px] font-black uppercase tracking-wider text-slate-700 leading-tight">
                              Finance Charge
                            </span>
                            <span className="text-sm sm:text-base font-black text-slate-950">
                              ${docInterest.toFixed(2)}
                            </span>
                            <span className="text-[7px] text-slate-500 leading-tight font-sans">
                              The dollar amount the credit will cost you.
                            </span>
                          </div>
                          {/* Col 3 */}
                          <div className="p-2 flex flex-col justify-between min-h-[90px]">
                            <span className="text-[8px] font-black uppercase tracking-wider text-slate-700 leading-tight">
                              Amount Financed
                            </span>
                            <span className="text-sm sm:text-base font-black text-slate-950">
                              ${docAmount.toFixed(2)}
                            </span>
                            <span className="text-[7px] text-slate-500 leading-tight font-sans">
                              The amount of credit provided on your behalf.
                            </span>
                          </div>
                          {/* Col 4 */}
                          <div className="p-2 flex flex-col justify-between min-h-[90px]">
                            <span className="text-[8px] font-black uppercase tracking-wider text-slate-700 leading-tight">
                              Total of Payments
                            </span>
                            <span className="text-sm sm:text-base font-black text-slate-950">
                              ${docTotalRepayment.toFixed(2)}
                            </span>
                            <span className="text-[7px] text-slate-500 leading-tight font-sans">
                              Amount paid after making all scheduled payments.
                            </span>
                          </div>
                        </div>

                        {/* Repayment Schedule Info Box */}
                        <div className="border-x-2 border-b-2 border-slate-950 p-3 bg-white text-[11px] mb-6 space-y-1">
                          <div className="font-extrabold uppercase tracking-wider text-slate-800 text-[8px] mb-1">
                            Amortized Repayment Schedule:
                          </div>
                          <div className="flex flex-col sm:flex-row sm:justify-between font-bold text-slate-950 gap-1.5 font-sans text-[10px]">
                            <span>Installments Count: {docInstallments} Payments</span>
                            <span>Payment Amount: ${docAmountPerCycle.toFixed(2)} / week</span>
                            <span>Maturity Cycle: Weekly (Every {docRepaymentDay})</span>
                          </div>
                        </div>

                        {/* Promissory Note Legal Content */}
                        <div className="space-y-3 font-serif text-[10px] text-slate-800 border-t border-slate-200 pt-4">
                          <div className="text-center font-black uppercase tracking-widest text-slate-900 text-xs mb-2">
                            Promissory Note & Security Agreement
                          </div>
                          <p>
                            <strong>1. PROMISE TO PAY:</strong> For value received, the undersigned Borrower, <strong>{selectedRequest.username}</strong> (Discord ID: <code>{selectedRequest.discordId}</code>), hereby unconditionally promises to pay to the order of <strong>GGNEXUS BANK & TRUST</strong> (Lender), the principal amount of <strong>${docAmount.toFixed(2)}</strong> USD, together with the stated finance interest charge of <strong>${docInterest.toFixed(2)}</strong> USD, representing an annual percentage rate (APR) of <strong>{docApr.toFixed(2)}%</strong>.
                          </p>
                          <p>
                            <strong>2. SCHEDULED REPAYMENT:</strong> The total repayable debt of <strong>${docTotalRepayment.toFixed(2)}</strong> USD shall be liquidated in <strong>{docInstallments}</strong> consecutive weekly payments of <strong>${docAmountPerCycle.toFixed(2)}</strong> USD. Payments shall be submitted starting on <strong>{docStartDate}</strong> and recur every <strong>{docRepaymentDay}</strong> until fully amortized.
                          </p>
                          <p>
                            <strong>3. ACCELERATION ON DEFAULT:</strong> The occurrence of any default, including failure to pay an installment when due, shall trigger immediate acceleration of all unpaid obligations under this note. The Lender reserves the rights of debt recovery, legal proceedings, civil lawsuit filings, and collection agency assignment.
                          </p>
                          <p>
                            <strong>4. COLLECTION COST WAIVER:</strong> The Borrower agrees to forfeit presentment and notice of dishonor, and accepts full personal liability. In the event of default, Borrower will bear all reasonable legal fees, processing charges, and collection expenses.
                          </p>
                          <p className="text-[8px] text-slate-400 uppercase italic tracking-wider mt-4">
                            Executed as a binding financial covenant under seal on the date below.
                          </p>
                        </div>

                        {/* Signatures & Execution block */}
                        <div className="mt-8 pt-6 border-t-2 border-dashed border-slate-300 relative">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-[10px]">
                            {/* Left Column: Lender Representative */}
                            <div className="flex flex-col justify-end min-h-[90px] border-t border-slate-400 pt-2 text-slate-700">
                              <span className="text-slate-500 uppercase text-[8px] tracking-wider font-extrabold">
                                Authorized Lender Representative:
                              </span>
                              <span className="font-extrabold text-slate-900 mt-2">
                                {selectedRequest.approverName || "Authorized Administrator"}
                              </span>
                              <span className="text-[9px] text-slate-400 mt-0.5">
                                Date: {new Date(selectedRequest.updatedAt).toLocaleDateString()}
                              </span>
                            </div>

                            {/* Right Column: Borrower Digital Seal/Signature */}
                            <div className="flex flex-col justify-end min-h-[90px] border-t border-slate-400 pt-2 text-slate-700 relative">
                              <span className="text-slate-500 uppercase text-[8px] tracking-wider font-extrabold">
                                Borrower Signature:
                              </span>

                              {isSigned ? (
                                <>
                                  <div className="absolute bottom-6 left-2 right-2 flex justify-center items-center pointer-events-none">
                                    {/* Signature graphic */}
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={selectedRequest.signature}
                                      alt="Signature image"
                                      className="max-h-12 object-contain mix-blend-multiply"
                                    />
                                  </div>
                                  <span className="font-extrabold text-slate-900 mt-6 border-none">
                                    {selectedRequest.legalName}
                                  </span>
                                  <span className="text-[9px] text-slate-400 mt-0.5">
                                    Signed: {new Date(selectedRequest.signedAt!).toLocaleString()}
                                  </span>

                                  {/* Verification Stamp overlay */}
                                  <div className="absolute -top-7 -right-1 rotate-[-12deg] pointer-events-none select-none border-4 border-double border-emerald-600 bg-white/95 px-3 py-1.5 text-center rounded shadow-lg max-w-[170px]">
                                    <div className="text-[8px] font-black text-emerald-700 tracking-widest uppercase">
                                      Verified & Secured
                                    </div>
                                    <div className="text-[11px] font-black text-emerald-800 uppercase leading-none my-0.5">
                                      Digitally Executed
                                    </div>
                                    <div className="text-[7px] text-emerald-600 font-mono tracking-tight">
                                      ID: {selectedRequest.id.slice(0, 8)}<br />
                                      TS: {new Date(selectedRequest.signedAt!).toISOString().replace('T', ' ').substring(0, 19)}
                                    </div>
                                  </div>
                                </>
                              ) : (
                                /* Interactive signature pad */
                                <>
                                  <div className="my-2 border border-slate-350 bg-slate-50/80 rounded p-1 cursor-crosshair relative no-print">
                                    <canvas
                                      ref={canvasRef}
                                      width={350}
                                      height={100}
                                      onMouseDown={startDrawing}
                                      onMouseMove={draw}
                                      onMouseUp={stopDrawing}
                                      onMouseLeave={stopDrawing}
                                      onTouchStart={startDrawing}
                                      onTouchMove={draw}
                                      onTouchEnd={stopDrawing}
                                      className="w-full h-16 block bg-transparent"
                                    />
                                    {!hasSigned && (
                                      <span className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-400 pointer-events-none font-sans italic">
                                        Draw signature here with mouse or touch
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex justify-between items-center mt-1 no-print">
                                    <input
                                      type="text"
                                      value={legalName}
                                      onChange={(e) => setLegalName(e.target.value)}
                                      placeholder="Type full legal name"
                                      className="w-full max-w-[155px] border-b border-slate-400 bg-transparent text-[10px] font-bold text-slate-900 focus:outline-none placeholder-slate-400 font-sans"
                                      required
                                    />
                                    <button
                                      type="button"
                                      onClick={clearCanvas}
                                      className="text-[9px] font-bold uppercase text-rose-600 hover:text-rose-500 transition font-sans"
                                    >
                                      Clear Pad
                                    </button>
                                  </div>
                                  <span className="text-[9px] text-slate-400 mt-1 print:block">
                                    Awaiting Digital Signature
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Details/Repayment control interface outside of paper contract */}
                      <div className="space-y-4">
                        {isSigned && (
                          <div className="rounded-2xl border border-white/6 bg-white/2 p-4 text-xs space-y-1.5">
                            <span className="text-slate-400 block font-semibold">Admin Reasoning notes:</span>
                            <p className="text-slate-200 italic">&quot;{selectedRequest.adminReasoning || "Approved by administration."}&quot;</p>
                          </div>
                        )}

                        {/* Perjury Disclaimer Checkbox (borrower view only when unsigned) */}
                        {canSign && (
                          <div className="flex items-start gap-2.5 bg-slate-900/40 p-3 rounded-xl border border-white/5 no-print">
                            <input
                              id="accept-terms-checkbox"
                              type="checkbox"
                              checked={acceptTerms}
                              onChange={(e) => setAcceptTerms(e.target.checked)}
                              className="mt-0.5 rounded border-white/20 bg-slate-950 text-cyan-400 focus:ring-cyan-400/50"
                            />
                            <label
                              htmlFor="accept-terms-checkbox"
                              className="text-[11px] leading-relaxed text-slate-350 select-none cursor-pointer"
                            >
                              I hereby declare under penalty of perjury that I am the borrower named above, that the signature drawn is my own, and that I agree to be bound by the terms of this Promissory Note including personal liability and debt recovery actions.
                            </label>
                          </div>
                        )}

                        {signingError && (
                          <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-300 no-print">
                            {signingError}
                          </div>
                        )}

                        {/* Execute signing action (Borrower unsigned view only) */}
                        {canSign && (
                          <div className="flex gap-3 no-print">
                            <button
                              type="button"
                              onClick={handleCloseReview}
                              className="flex-1 h-11 rounded-xl border border-white/10 bg-transparent text-xs font-bold text-slate-400 hover:text-white transition"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!legalName.trim()) {
                                  setSigningError("Please type your full legal name inside the signature block.");
                                  return;
                                }
                                if (!hasSigned) {
                                  setSigningError("Please draw your signature in the pad box.");
                                  return;
                                }
                                if (!acceptTerms) {
                                  setSigningError("You must read and agree to the terms by checking the verification box.");
                                  return;
                                }

                                setSigningLoading(true);
                                setSigningError("");
                                try {
                                  const canvas = canvasRef.current;
                                  const signatureData = canvas ? canvas.toDataURL() : "";

                                  const res = await fetch("/api/admin/borrow/sign", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      requestId: selectedRequest.id,
                                      legalName: legalName.trim(),
                                      signature: signatureData,
                                    }),
                                  });
                                  const data = await res.json();
                                  if (data.ok) {
                                    loadRequests();
                                    handleCloseReview();
                                  } else {
                                    setSigningError(data.error || "Failed to submit signature.");
                                  }
                                } catch (e) {
                                  setSigningError("A network error occurred. Please try again.");
                                } finally {
                                  setSigningLoading(false);
                                }
                              }}
                              disabled={signingLoading || !acceptTerms}
                              className="flex-1 h-11 rounded-xl bg-cyan-400 hover:bg-cyan-350 disabled:opacity-50 text-xs font-bold text-stone-950 transition active:scale-[0.99]"
                            >
                              {signingLoading ? "Executing Note..." : "Execute & Sign Note"}
                            </button>
                          </div>
                        )}

                        {/* Unsigned note, viewer is not the borrower (admin viewing details) */}
                        {!isSigned && !canSign && (
                          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-300 leading-normal no-print">
                            ⏳ <strong>Awaiting Borrower Signature:</strong> Terms are configured. This contract must be signed by the borrower ({selectedRequest.username}) before payment capture options activate.
                          </div>
                        )}

                        {/* Repayment capture buttons via PayPal (signed approved active borrower only) */}
                        {isSigned &&
                          selectedRequest.installments !== undefined &&
                          selectedRequest.installments > 0 &&
                          selectedRequest.amountPerCycle !== undefined &&
                          viewer?.discordId === selectedRequest.discordId && (
                            <div className="p-4 border border-cyan-500/15 bg-slate-900/40 rounded-2xl space-y-3 no-print">
                              <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">
                                Repay Installment
                              </div>
                              <p className="text-xs text-slate-400 leading-relaxed">
                                Submit your next installment payment of <strong className="text-white">${selectedRequest.amountPerCycle.toFixed(2)}</strong>. Capturing payment securely updates this contract.
                              </p>
                              <PayPalProvider>
                                <div className="pt-2">
                                  <PayPalButtons
                                    style={{ layout: "vertical", shape: "pill", label: "pay", height: 38 }}
                                    createOrder={(_data, actions) => {
                                      return actions.order.create({
                                        intent: "CAPTURE",
                                        purchase_units: [
                                          {
                                            amount: {
                                              currency_code: "USD",
                                              value: selectedRequest.amountPerCycle!.toFixed(2),
                                            },
                                            description: `Loan Repayment (Installment) - NewHopeGGN`,
                                            custom_id: `${selectedRequest.id}|repayment|${selectedRequest.discordId}`,
                                          },
                                        ],
                                      });
                                    }}
                                    onApprove={async (_data, actions) => {
                                      if (!actions.order) return;
                                      const details = await actions.order.capture();
                                      try {
                                        const res = await fetch("/api/admin/borrow/repay", {
                                          method: "POST",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({
                                            requestId: selectedRequest.id,
                                            amount: selectedRequest.amountPerCycle,
                                            transactionId: details.purchase_units?.[0]?.payments?.captures?.[0]?.id || details.id,
                                          }),
                                        });
                                        const data = await res.json();
                                        if (data.ok) {
                                          loadRequests();
                                          handleCloseReview();
                                        }
                                      } catch (e) {
                                        console.error("Repayment processing failed", e);
                                      }
                                    }}
                                  />
                                </div>
                              </PayPalProvider>
                            </div>
                          )}

                        {/* Action buttons (Print / Close) */}
                        <div className="space-y-2 no-print">
                          {isSigned && (
                            <button
                              type="button"
                              onClick={() => window.print()}
                              className="w-full h-11 rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-xs font-bold text-cyan-200 hover:bg-cyan-400/20 transition flex items-center justify-center gap-2"
                            >
                              🖨️ Print Promissory Note Document
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={handleCloseReview}
                            className="w-full h-11 rounded-xl border border-white/10 bg-transparent text-xs font-bold text-slate-450 hover:text-white transition"
                          >
                            Dismiss View
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                /* Historical Rejected Request Details */
                <>
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Status Outcome:</span>
                      <span className="inline-block rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border-rose-500/20 bg-rose-500/10 text-rose-300">
                        {selectedRequest.status}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs text-slate-400 block font-semibold">
                        Administrative Decision Reasoning:
                      </span>
                      <div className="rounded-xl border border-white/5 bg-slate-950 p-4 text-xs italic text-slate-200">
                        {selectedRequest.adminReasoning || "Rejected by administration."}
                      </div>
                    </div>

                    {selectedRequest.approvedBy && (
                      <div className="text-[10px] text-slate-500 text-right mt-4">
                        Evaluated by {selectedRequest.approverName || selectedRequest.approvedBy} on{" "}
                        {new Date(selectedRequest.updatedAt).toLocaleDateString()}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleCloseReview}
                      className="w-full h-11 rounded-xl border border-white/10 bg-transparent text-xs font-bold text-slate-450 hover:text-white transition mt-2"
                    >
                      Dismiss View
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
