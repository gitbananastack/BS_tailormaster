import { hasAnyRole, hasRole } from "@/lib/roles";
import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const stageRoles = { CUTTING: "CUTTING_OPERATOR", FUSING: "FUSING_OPERATOR", STITCHING: "TAILOR", QUALITY_CHECK: "QC_INSPECTOR", PACKING: "PACKING_STAFF", DELIVERY: "DELIVERY_COORDINATOR" } as const;
const schema = z.object({ stage: z.enum(["CUTTING", "FUSING", "STITCHING", "QUALITY_CHECK", "PACKING", "DELIVERY"]), userId: z.string().min(1) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor || !hasAnyRole(actor, ["ADMIN", "ORDER_MANAGER"])) return Response.json({ error: "Administrator or order-manager access is required." }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Choose a valid production stage and staff member." }, { status: 400 });
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!user?.isActive || !hasRole(user, stageRoles[parsed.data.stage])) return Response.json({ error: "Choose an active staff member with the role required for this stage." }, { status: 400 });
  const assignment = parsed.data.stage === "STITCHING"
    ? await prisma.orderAssignment.upsert({ where: { orderId_stage_userId: { orderId: id, stage: parsed.data.stage, userId: user.id } }, update: {}, create: { orderId: id, stage: parsed.data.stage, userId: user.id }, include: { user: { select: { id: true, name: true, role: true, roles: true } } } })
    : await prisma.$transaction(async transaction => { await transaction.orderAssignment.deleteMany({ where: { orderId: id, stage: parsed.data.stage } }); return transaction.orderAssignment.create({ data: { orderId: id, stage: parsed.data.stage, userId: user.id }, include: { user: { select: { id: true, name: true, role: true, roles: true } } } }); });
  return Response.json(assignment);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor || !hasAnyRole(actor, ["ADMIN", "ORDER_MANAGER"])) return Response.json({ error: "Administrator or order-manager access is required." }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Choose a valid production stage and staff member." }, { status: 400 });
  const { id } = await params;
  const removed = await prisma.orderAssignment.deleteMany({ where: { orderId: id, stage: parsed.data.stage, userId: parsed.data.userId } });
  if (!removed.count) return Response.json({ error: "Assignment not found." }, { status: 404 });
  return Response.json({ ok: true });
}
