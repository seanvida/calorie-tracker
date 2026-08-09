import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

// Lightweight keep-alive: a trivial query keeps the Supabase free-tier project
// from auto-pausing (which took the app down before) and keeps the pooled
// connection warm. Hit periodically by an external cron (see
// .github/workflows/keepalive.yml). No auth, no user data.
export const runtime = "nodejs";

export async function GET() {
  try {
    await sql`select 1`;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
