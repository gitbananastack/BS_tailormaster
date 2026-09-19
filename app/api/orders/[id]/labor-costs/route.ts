import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({ amount: z.coerce.number().positive("Enter an amount greater than zero.").max(10000000), note: z.string().trim().max(1000).optional(), stage: z.enum(["CUTTING", "STITCHING", "QUALITY_CHECK", "PACKING", "DELIVERY"]), userId: z.string().min(1) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor) return Response.json({ error: "Sign in to add a cost." }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message || "Invalid cost." }, { status: 400 });
  const { id } = await params;
  const canManage = ["ADMIN", "ORDER_MANAGER"].includes(actor.role);
  if (!canManage) return Response.json({ error: "Only Admin or Order Manager can propose a phase amount." }, { status: 403 });
  try {
    const assignment = await prisma.orderAssignment.findUnique({ where: { orderId_stage: { orderId: id, stage: parsed.data.stage } } });
    if (!assignment || assignment.userId !== parsed.data.userId) return Response.json({ error: "Select the worker assigned to this phase." }, { status: 400 });
    const existing = await prisma.laborCostEntry.findFirst({ where: { orderId: id, stage: parsed.data.stage }, orderBy: { createdAt: "desc" } });
    const cost = existing ? await prisma.laborCostEntry.update({ where: { id: existing.id }, data: { userId: parsed.data.userId, amount: parsed.data.amount, note: parsed.data.note || null, isAccepted: false, responseNote: null, isApproved: false }, include: { user: { select: { name: true } } } }) : await prisma.laborCostEntry.create({ data: { orderId: id, stage: parsed.data.stage, userId: parsed.data.userId, amount: parsed.data.amount, note: parsed.data.note || null, isAccepted: false, isApproved: false }, include: { user: { select: { name: true } } } });
    return Response.json({ ...cost, amount: cost.amount.toString(), createdAt: cost.createdAt.toISOString() }, { status: 201 });
  } catch (error) {
    console.error("Unable to save phase cost", error);
    return Response.json({ error: "Unable to save the phase amount. Please retry after refreshing the page." }, { status: 500 });
  }
}
