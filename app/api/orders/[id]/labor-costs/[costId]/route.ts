import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({ amount: z.coerce.number().positive().max(10000000).optional(), note: z.string().trim().max(1000).nullable().optional(), isAccepted: z.boolean().optional(), responseNote: z.string().trim().max(1000).nullable().optional() });
async function manager() { const actor = await currentUser(); return actor && ["ADMIN", "ORDER_MANAGER"].includes(actor.role) ? actor : null; }
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; costId: string }> }) {
  const actor = await currentUser();
  if (!actor) return Response.json({ error: "Sign in to respond to this amount." }, { status: 401 });
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid cost update." }, { status: 400 });
  const { id, costId } = await params;
  const canManage = ["ADMIN", "ORDER_MANAGER"].includes(actor.role);
  const existing = await prisma.laborCostEntry.findFirst({ where: { id: costId, orderId: id }, select: { userId: true } });
  if (!existing || (!canManage && existing.userId !== actor.id)) return Response.json({ error: "Cost entry not found or not assigned to you." }, { status: 404 });
  if (!canManage && (parsed.data.amount !== undefined || parsed.data.note !== undefined)) return Response.json({ error: "Workers can only accept or request a correction." }, { status: 403 });
  const data = canManage ? { amount: parsed.data.amount, note: parsed.data.note, ...(parsed.data.amount !== undefined ? { isAccepted: false, responseNote: null } : {}) } : { isAccepted: parsed.data.isAccepted, responseNote: parsed.data.responseNote };
  const cost = await prisma.laborCostEntry.updateMany({ where: { id: costId, orderId: id }, data });
  if (!cost.count) return Response.json({ error: "Cost entry not found." }, { status: 404 });
  return Response.json({ ok: true });
}
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; costId: string }> }) {
  if (!await manager()) return Response.json({ error: "Only Admin or Order Manager can remove costs." }, { status: 403 });
  const { id, costId } = await params;
  const cost = await prisma.laborCostEntry.deleteMany({ where: { id: costId, orderId: id } });
  if (!cost.count) return Response.json({ error: "Cost entry not found." }, { status: 404 });
  return Response.json({ ok: true });
}
