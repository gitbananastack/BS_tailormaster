import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { ProductionStage } from "@prisma/client";
import { z } from "zod";

const schema = z.object({ status: z.enum(["IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"]), comment: z.string().trim().max(2000).optional(), eta: z.string().optional() }).superRefine((value, context) => {
  if (["ON_HOLD", "CANCELLED"].includes(value.status) && !value.comment) context.addIssue({ code: "custom", message: "A comment is required when putting an order on hold or cancelling it.", path: ["comment"] });
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor) return Response.json({ error: "Sign in to update order status." }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message || "Invalid status update." }, { status: 400 });
  const { id } = await params;
  const canManage = ["ADMIN", "ORDER_MANAGER"].includes(actor.role);
  const currentOrder = await prisma.order.findUnique({ where: { id }, select: { currentStage: true } });
  if (!currentOrder) return Response.json({ error: "Job order not found." }, { status: 404 });
  const assignment = await prisma.orderAssignment.findUnique({ where: { orderId_stage: { orderId: id, stage: currentOrder.currentStage } } });
  if (!canManage && assignment?.userId !== actor.id) return Response.json({ error: "You are not assigned to the current stage of this job order." }, { status: 403 });
  const eta = parsed.data.eta ? new Date(parsed.data.eta) : null;
  const nextStage: Record<ProductionStage, ProductionStage | null> = { CUTTING: "STITCHING", STITCHING: "QUALITY_CHECK", QUALITY_CHECK: "PACKING", PACKING: "DELIVERY", DELIVERY: null };
  if (currentOrder.currentStage === "QUALITY_CHECK" && parsed.data.status === "COMPLETED") { const inspection = await prisma.qcInspection.findUnique({ where: { orderId: id }, select: { result: true, stitchingPassed: true, measurementPassed: true, finishingPassed: true } }); if (!inspection || inspection.result !== "PASSED" || !inspection.stitchingPassed || !inspection.measurementPassed || !inspection.finishingPassed) return Response.json({ error: "Complete and pass all QC checks before sending this order to Packing." }, { status: 400 }); }
  const advancedStage = parsed.data.status === "COMPLETED" ? nextStage[currentOrder.currentStage] : null;
  const order = await prisma.order.update({ where: { id }, data: { status: advancedStage ? "IN_PROGRESS" : parsed.data.status, currentStage: advancedStage || currentOrder.currentStage, estimatedCompletion: eta, statusUpdates: { create: { status: parsed.data.status, stage: currentOrder.currentStage, comment: parsed.data.comment || null, eta, userId: actor.id } } }, select: { id: true, status: true, currentStage: true, estimatedCompletion: true } });
  return Response.json(order);
}
