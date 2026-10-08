import { canRespondToLaborCost, hasAnyRole } from "@/lib/roles";
import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({ amount: z.coerce.number().positive().max(10000000).optional(), note: z.string().trim().max(1000).nullable().optional(), isAccepted: z.boolean().optional(), responseNote: z.string().trim().max(1000).nullable().optional() });
async function manager() { const actor = await currentUser(); return actor && hasAnyRole(actor, ["ADMIN", "ORDER_MANAGER"]) ? actor : null; }
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; costId: string }> }) {
  const actor = await currentUser();
  if (!actor) return Response.json({ error: "Sign in to respond to this amount." }, { status: 401 });
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid cost update." }, { status: 400 });
  const { id, costId } = await params;
  const canManage = hasAnyRole(actor, ["ADMIN", "ORDER_MANAGER"]);
  const existing = await prisma.laborCostEntry.findFirst({ where: { id: costId, orderId: id, stage: "STITCHING" }, select: { userId: true } });
  if (!existing) return Response.json({ error: "Cost entry not found." }, { status: 404 });
  const isTailorResponse = parsed.data.isAccepted !== undefined || parsed.data.responseNote !== undefined;
  if (isTailorResponse && !canRespondToLaborCost(actor, existing.userId)) return Response.json({ error: "Only the tailor assigned this amount can respond to it." }, { status: 403 });
  if (!isTailorResponse && !canManage) return Response.json({ error: "Workers can only accept or request a correction." }, { status: 403 });
  const data = isTailorResponse ? { isAccepted: parsed.data.isAccepted, responseNote: parsed.data.responseNote } : { amount: parsed.data.amount, note: parsed.data.note, ...(parsed.data.amount !== undefined ? { isAccepted: false, responseNote: null } : {}) };
  const cost = await prisma.laborCostEntry.updateMany({ where: { id: costId, orderId: id, stage: "STITCHING" }, data });
  if (!cost.count) return Response.json({ error: "Cost entry not found." }, { status: 404 });
  return Response.json({ ok: true });
}
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; costId: string }> }) {
  if (!await manager()) return Response.json({ error: "Only Admin or Order Manager can remove costs." }, { status: 403 });
  const { id, costId } = await params;
  const cost = await prisma.laborCostEntry.deleteMany({ where: { id: costId, orderId: id, stage: "STITCHING" } });
  if (!cost.count) return Response.json({ error: "Cost entry not found." }, { status: 404 });
  return Response.json({ ok: true });
}
