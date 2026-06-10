import { NextResponse } from "next/server";
import { deleteEntry, updateEntryQty } from "@/lib/db";
import { getUserId } from "@/lib/auth";

// The Postgres client uses TCP sockets, so it needs the Node.js runtime (not Edge).
export const runtime = "nodejs";

const MAX_QTY = 99;

/** PATCH /api/log/:id — change an entry's quantity (servings). Body: { qty }. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: { qty?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const qty = Number(body.qty);
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
    return NextResponse.json(
      { error: `qty must be a whole number between 1 and ${MAX_QTY}.` },
      { status: 400 },
    );
  }

  const entry = await updateEntryQty(userId, numericId, qty);
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ entry });
}

/** DELETE /api/log/:id — remove a logged entry. */
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
  const removed = await deleteEntry(userId, numericId);
  if (!removed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
