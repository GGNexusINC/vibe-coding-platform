import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET - Check if insurance is available for purchase
// Returns { available: boolean, reason?: string, cutoff_date?: string }
export async function GET() {
  try {
    const supabase = getSupabase();

    // Get the active wipe cycle
    const { data: wipeCycle, error: wipeError } = await supabase
      .from("wipe_cycles")
      .select("*")
      .eq("is_active", true)
      .order("start_date", { ascending: false })
      .limit(1)
      .single();

    // If no wipe cycle is configured, default to available
    if (wipeError || !wipeCycle) {
      return NextResponse.json({ 
        ok: true, 
        available: true,
        message: "No wipe cycle configured - insurance available"
      });
    }

    // If wipe has no end date (ongoing), insurance is available
    if (!wipeCycle.end_date) {
      return NextResponse.json({ 
        ok: true, 
        available: true,
        wipe_cycle: wipeCycle.name,
        message: "Wipe ongoing - insurance available"
      });
    }

    // Calculate cutoff date (end_date minus cutoff hours)
    const endDate = new Date(wipeCycle.end_date);
    const cutoffHours = wipeCycle.insurance_cutoff_hours || 96; // default 4 days
    const cutoffDate = new Date(endDate.getTime() - (cutoffHours * 60 * 60 * 1000));
    const now = new Date();

    // Check if we're past the cutoff
    const available = now < cutoffDate;

    return NextResponse.json({
      ok: true,
      available,
      wipe_cycle: wipeCycle.name,
      wipe_end_date: wipeCycle.end_date,
      cutoff_date: cutoffDate.toISOString(),
      hours_remaining: available ? Math.floor((cutoffDate.getTime() - now.getTime()) / (1000 * 60 * 60)) : 0,
      reason: available ? undefined : `Insurance unavailable - within ${cutoffHours / 24} days of wipe end`
    });

  } catch (e) {
    console.error("Insurance status check failed:", e);
    // Default to available on error
    return NextResponse.json({ 
      ok: true, 
      available: true,
      message: "Status check failed - defaulting to available"
    });
  }
}
