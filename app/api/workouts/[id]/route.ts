import { NextResponse } from "next/server";
import { deleteWorkout } from "@/lib/db";
import { getUserId } from "@/lib/auth";

// The Postgres client uses TCP sockets, so it needs the Node.js runtime (not Edge).
export const runtime = "nodejs";

/** DELETE /api/workouts/:id — remove a logged workout. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const removed = await deleteWorkout(userId, numericId);
  if (!removed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
