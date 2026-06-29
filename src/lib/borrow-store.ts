import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

export type BorrowRequest = {
  id: string;
  discordId: string;
  username: string;
  amount: number;
  reason: string;
  preferredCycle: string; // 'weekly', 'biweekly', 'monthly'
  status: "pending" | "approved" | "rejected";
  approvedBy?: string;
  approverName?: string;
  adminReasoning?: string;
  paymentFrequency?: string; // 'weekly', 'biweekly', 'monthly'
  installments?: number;
  amountPerCycle?: number;
  paymentStartDate?: string;
  createdAt: string;
  updatedAt: string;
  signature?: string;
  legalName?: string;
  signedAt?: string;
  repaymentDayOfWeek?: string;
  apr?: number;
  totalInterest?: number;
  totalRepayment?: number;
  requestedInstallments?: number;
  requestedApr?: number;
};

const TABLE = "borrow_requests";
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "borrow-requests.json");

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function readFile(): BorrowRequest[] {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DATA_FILE)) return [];
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(raw) as BorrowRequest[];
  } catch {
    return [];
  }
}

function writeFile(entries: BorrowRequest[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(entries, null, 2), "utf8");
  } catch {
    console.warn("borrow-store: fs write skipped (read-only env)");
  }
}

function mapRow(row: Record<string, unknown>): BorrowRequest {
  const baseReason = String(row.reason ?? "");
  let reasonText = baseReason;
  let repaymentDayOfWeek = undefined;
  let requestedInstallments = undefined;
  let requestedApr = undefined;

  if (baseReason.startsWith("{")) {
    try {
      const parsed = JSON.parse(baseReason);
      reasonText = parsed.text || "";
      repaymentDayOfWeek = parsed.repaymentDayOfWeek;
      requestedInstallments = parsed.requestedInstallments;
      requestedApr = parsed.requestedApr;
    } catch {}
  }

  const baseAdminReasoning = String(row.admin_reasoning ?? "");
  let adminReasoningText = baseAdminReasoning;
  let signature = undefined;
  let legalName = undefined;
  let signedAt = undefined;
  let apr = undefined;
  let totalInterest = undefined;
  let totalRepayment = undefined;

  if (baseAdminReasoning.startsWith("{")) {
    try {
      const parsed = JSON.parse(baseAdminReasoning);
      adminReasoningText = parsed.text || "";
      signature = parsed.signature;
      legalName = parsed.legalName;
      signedAt = parsed.signedAt;
      if (parsed.repaymentDayOfWeek) {
        repaymentDayOfWeek = parsed.repaymentDayOfWeek;
      }
      apr = parsed.apr;
      totalInterest = parsed.totalInterest;
      totalRepayment = parsed.totalRepayment;
    } catch {}
  }

  return {
    id: String(row.id),
    discordId: String(row.discord_id),
    username: String(row.username ?? ""),
    amount: Number(row.amount ?? 0),
    reason: reasonText,
    preferredCycle: String(row.preferred_cycle ?? ""),
    status: (row.status as "pending" | "approved" | "rejected") ?? "pending",
    approvedBy: (row.approved_by as string | null) ?? undefined,
    approverName: (row.approver_name as string | null) ?? undefined,
    adminReasoning: adminReasoningText,
    paymentFrequency: (row.payment_frequency as string | null) ?? undefined,
    installments: row.installments ? Number(row.installments) : undefined,
    amountPerCycle: row.amount_per_cycle ? Number(row.amount_per_cycle) : undefined,
    paymentStartDate: (row.payment_start_date as string | null) ?? undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    signature,
    legalName,
    signedAt,
    repaymentDayOfWeek,
    apr,
    totalInterest,
    totalRepayment,
    requestedInstallments,
    requestedApr,
  };
}

export async function getBorrowRequests(discordId?: string): Promise<BorrowRequest[]> {
  const sb = getSupabase();
  if (sb) {
    let query = sb.from(TABLE).select("*").order("created_at", { ascending: false });
    if (discordId) {
      query = query.eq("discord_id", discordId);
    }
    const { data, error } = await query;
    if (!error && data) {
      return data.map((r) => mapRow(r as Record<string, unknown>));
    }
    if (error) {
      console.error("borrow-store getBorrowRequests error", error);
    }
  }

  // Fallback to local json file
  const list = readFile();
  if (discordId) {
    return list.filter((item) => item.discordId === discordId);
  }
  return list;
}

export async function createBorrowRequest(entry: {
  discordId: string;
  username: string;
  amount: number;
  reason: string;
  preferredCycle: string;
  repaymentDayOfWeek?: string;
  requestedInstallments?: number;
  requestedApr?: number;
}): Promise<BorrowRequest> {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const reasonSerialized = JSON.stringify({
    text: entry.reason,
    repaymentDayOfWeek: entry.repaymentDayOfWeek || "Monday",
    requestedInstallments: entry.requestedInstallments || 4,
    requestedApr: entry.requestedApr || 15
  });

  const request: BorrowRequest = {
    id,
    discordId: entry.discordId,
    username: entry.username,
    amount: entry.amount,
    reason: entry.reason,
    preferredCycle: entry.preferredCycle,
    status: "pending",
    createdAt: now,
    updatedAt: now,
    repaymentDayOfWeek: entry.repaymentDayOfWeek || "Monday",
    requestedInstallments: entry.requestedInstallments || 4,
    requestedApr: entry.requestedApr || 15
  };

  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from(TABLE)
      .insert({
        id,
        discord_id: request.discordId,
        username: request.username,
        amount: request.amount,
        reason: reasonSerialized,
        preferred_cycle: request.preferredCycle,
        status: request.status,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (!error && data) {
      return mapRow(data as Record<string, unknown>);
    }
    if (error) {
      console.error("borrow-store createBorrowRequest Supabase error", error);
    }
  }

  // Fallback
  const list = readFile();
  list.unshift(request);
  writeFile(list);
  return request;
}

export async function updateBorrowRequestStatus(
  id: string,
  status: "approved" | "rejected",
  approverId: string,
  approverName: string,
  adminReasoning: string,
  cycle?: {
    frequency: string;
    installments: number;
    amountPerCycle: number;
    startDate: string;
    repaymentDayOfWeek?: string;
    apr?: number;
    totalInterest?: number;
    totalRepayment?: number;
    approvedAmount?: number;
  }
): Promise<BorrowRequest | null> {
  const now = new Date().toISOString();
  
  const list = readFile();
  const req = list.find((item) => item.id === id);
  const existingRepaymentDay = req?.repaymentDayOfWeek || cycle?.repaymentDayOfWeek || "Monday";

  const adminReasoningSerialized = JSON.stringify({
    text: adminReasoning,
    signature: req?.signature,
    legalName: req?.legalName,
    signedAt: req?.signedAt,
    repaymentDayOfWeek: existingRepaymentDay,
    apr: cycle?.apr ?? req?.apr,
    totalInterest: cycle?.totalInterest ?? req?.totalInterest,
    totalRepayment: cycle?.totalRepayment ?? req?.totalRepayment,
  });

  const updates: Record<string, unknown> = {
    status,
    approved_by: approverId,
    approver_name: approverName,
    admin_reasoning: adminReasoningSerialized,
    updated_at: now,
  };

  if (status === "approved" && cycle) {
    updates.payment_frequency = cycle.frequency;
    updates.installments = cycle.installments;
    updates.amount_per_cycle = cycle.amountPerCycle;
    updates.payment_start_date = cycle.startDate;
    if (cycle.approvedAmount !== undefined) {
      updates.amount = cycle.approvedAmount;
    }
  }

  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from(TABLE)
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (!error && data) {
      return mapRow(data as Record<string, unknown>);
    }
    if (error) {
      console.error("borrow-store updateBorrowRequestStatus Supabase error", error);
    }
  }

  // Fallback
  if (!req) return null;

  req.status = status;
  req.approvedBy = approverId;
  req.approverName = approverName;
  req.adminReasoning = adminReasoning;
  req.updatedAt = now;
  req.repaymentDayOfWeek = existingRepaymentDay;

  if (status === "approved" && cycle) {
    req.paymentFrequency = cycle.frequency;
    req.installments = cycle.installments;
    req.amountPerCycle = cycle.amountPerCycle;
    req.paymentStartDate = cycle.startDate;
    req.apr = cycle.apr;
    req.totalInterest = cycle.totalInterest;
    req.totalRepayment = cycle.totalRepayment;
    if (cycle.approvedAmount !== undefined) {
      req.amount = cycle.approvedAmount;
    }
  }

  writeFile(list);
  return req;
}

export async function recordRepayment(
  id: string,
  amountPaid: number
): Promise<BorrowRequest | null> {
  const now = new Date().toISOString();
  const list = readFile();
  const req = list.find((item) => item.id === id);

  if (!req) {
    const sb = getSupabase();
    if (sb) {
      const { data: requestData } = await sb.from(TABLE).select("*").eq("id", id).single();
      if (requestData) {
        const currentInstallments = Number(requestData.installments ?? 0);
        const newInstallments = Math.max(0, currentInstallments - 1);
        const { data: updatedData } = await sb
          .from(TABLE)
          .update({
            installments: newInstallments,
            updated_at: now
          })
          .eq("id", id)
          .select()
          .single();
        if (updatedData) return mapRow(updatedData as Record<string, unknown>);
      }
    }
    return null;
  }

  const currentInstallments = Number(req.installments ?? 0);
  req.installments = Math.max(0, currentInstallments - 1);
  req.updatedAt = now;
  writeFile(list);

  const sb = getSupabase();
  if (sb) {
    await sb
      .from(TABLE)
      .update({
        installments: req.installments,
        updated_at: now
      })
      .eq("id", id);
  }

  return req;
}

export async function signBorrowRequest(
  id: string,
  legalName: string,
  signature: string
): Promise<BorrowRequest | null> {
  const now = new Date().toISOString();
  
  const list = readFile();
  const req = list.find((item) => item.id === id);
  
  let currentAdminReason = "";
  let repaymentDay = "";
  let apr = undefined;
  let totalInterest = undefined;
  let totalRepayment = undefined;
  
  if (req) {
    currentAdminReason = req.adminReasoning || "";
    repaymentDay = req.repaymentDayOfWeek || "Monday";
    apr = req.apr;
    totalInterest = req.totalInterest;
    totalRepayment = req.totalRepayment;
    
    req.legalName = legalName;
    req.signature = signature;
    req.signedAt = now;
    req.updatedAt = now;
    writeFile(list);
  }

  const sb = getSupabase();
  if (sb) {
    let finalAdminReason = currentAdminReason;
    let finalRepaymentDay = repaymentDay;
    let finalApr = apr;
    let finalTotalInterest = totalInterest;
    let finalTotalRepayment = totalRepayment;
    
    if (!req) {
      const { data: requestData } = await sb.from(TABLE).select("*").eq("id", id).single();
      if (requestData) {
        const mapped = mapRow(requestData as Record<string, unknown>);
        finalAdminReason = mapped.adminReasoning || "";
        finalRepaymentDay = mapped.repaymentDayOfWeek || "Monday";
        finalApr = mapped.apr;
        finalTotalInterest = mapped.totalInterest;
        finalTotalRepayment = mapped.totalRepayment;
      }
    }
    
    const adminReasoningSerialized = JSON.stringify({
      text: finalAdminReason,
      signature,
      legalName,
      signedAt: now,
      repaymentDayOfWeek: finalRepaymentDay,
      apr: finalApr,
      totalInterest: finalTotalInterest,
      totalRepayment: finalTotalRepayment
    });

    const { data, error } = await sb
      .from(TABLE)
      .update({
        admin_reasoning: adminReasoningSerialized,
        updated_at: now,
      })
      .eq("id", id)
      .select()
      .single();

    if (!error && data) {
      return mapRow(data as Record<string, unknown>);
    }
  }

  return req || null;
}
