import { hasAnyRole, canWorkStage } from "@/lib/roles";
import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { ProductionStage } from "@prisma/client";
import { firstStageUpdateAllowed, handoffState } from "@/lib/status-transition";
import { z } from "zod";

const schema = z.object({ status: z.enum(["IN_PROGRESS", "ON_HOLD", "COMPLETED", "NOT_REQUIRED", "CANCELLED"]), comment: z.string().trim().max(2000).optional(), eta: z.string().optional() }).superRefine((value, context) => {
  if (["ON_HOLD", "CANCELLED"].includes(value.status) && !value.comment) context.addIssue({ code: "custom", message: "A comment is required when putting an order on hold or cancelling it.", path: ["comment"] });
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor) return Response.json({ error: "Sign in to update order status." }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message || "Invalid status update." }, { status: 400 });
  const { id } = await params;
  const canManage = hasAnyRole(actor, ["ADMIN", "ORDER_MANAGER"]);
  const currentOrder = await prisma.order.findUnique({ where: { id }, select: { currentStage: true, qcInspection: { select: { result: true, reworkStage: true, reworkTailorIds: true, updatedAt: true } } } });
  if (!currentOrder) return Response.json({ error: "Job order not found." }, { status: 404 });
  if (parsed.data.status === "NOT_REQUIRED" && currentOrder.currentStage !== "FUSING") return Response.json({ error: "Not Required is available only for the Fusing stage." }, { status: 400 });
  if (currentOrder.currentStage === "FUSING" && parsed.data.status === "CANCELLED") return Response.json({ error: "Use Not Required to skip fusing and continue to Stitching." }, { status: 400 });
  const reworkCutoff = currentOrder.qcInspection?.result === "REWORK_REQUIRED" && currentOrder.qcInspection.reworkStage === currentOrder.currentStage ? currentOrder.qcInspection.updatedAt : null;
  const [assignment, latestActorUpdate] = await Promise.all([
    prisma.orderAssignment.findUnique({ where: { orderId_stage_userId: { orderId: id, stage: currentOrder.currentStage, userId: actor.id } } }),
    prisma.orderStatusUpdate.findFirst({ where: { orderId: id, stage: currentOrder.currentStage, userId: actor.id, ...(reworkCutoff ? { createdAt: { gte: reworkCutoff } } : {}) }, orderBy: { createdAt: "desc" }, select: { id: true } }),
  ]);
  const scopedReworkTailors = currentOrder.qcInspection?.result === "REWORK_REQUIRED" && currentOrder.qcInspection.reworkStage === "STITCHING" && Array.isArray(currentOrder.qcInspection.reworkTailorIds) ? currentOrder.qcInspection.reworkTailorIds.filter((item): item is string => typeof item === "string") : [];
  if (currentOrder.currentStage === "STITCHING" && scopedReworkTailors.length && !scopedReworkTailors.includes(actor.id)) return Response.json({ error: "This stitching rework is assigned to different tailors." }, { status: 403 });
  if (currentOrder.currentStage === "STITCHING" && !assignment) return Response.json({ error: "Only a tailor assigned to this order can update their stitching status. Managers can review each tailor’s progress." }, { status: 403 });
  if (!canManage && !canWorkStage(actor, currentOrder.currentStage, assignment?.userId)) return Response.json({ error: "You are not assigned to the current stage of this job order." }, { status: 403 });
  if (!firstStageUpdateAllowed(Boolean(latestActorUpdate), parsed.data.status)) return Response.json({ error: "Start this stage as In Progress before selecting another status." }, { status: 400 });
  const eta = parsed.data.eta ? new Date(parsed.data.eta) : null;
  const nextStage: Record<ProductionStage, ProductionStage | null> = { CUTTING: "FUSING", FUSING: "STITCHING", STITCHING: "QUALITY_CHECK", QUALITY_CHECK: "PACKING", PACKING: "DELIVERY", DELIVERY: null };
  if (currentOrder.currentStage === "QUALITY_CHECK" && parsed.data.status === "COMPLETED") { const inspection = await prisma.qcInspection.findUnique({ where: { orderId: id }, select: { result: true, stitchingPassed: true, measurementPassed: true, finishingPassed: true } }); if (!inspection || inspection.result !== "PASSED" || !inspection.stitchingPassed || !inspection.measurementPassed || !inspection.finishingPassed) return Response.json({ error: "Complete and pass all QC checks before sending this order to Packing." }, { status: 400 }); }
  if (currentOrder.currentStage === "STITCHING") {
    const order = await prisma.$transaction(async transaction => {
      await transaction.orderStatusUpdate.create({ data: { orderId: id, status: parsed.data.status, stage: "STITCHING", comment: parsed.data.comment || null, eta, userId: actor.id } });
      const assignedTailors = scopedReworkTailors.length ? scopedReworkTailors.map(userId => ({ userId })) : await transaction.orderAssignment.findMany({ where: { orderId: id, stage: "STITCHING" }, select: { userId: true } });
      const updates = await transaction.orderStatusUpdate.findMany({ where: { orderId: id, stage: "STITCHING", userId: { in: assignedTailors.map(item => item.userId) }, ...(scopedReworkTailors.length && currentOrder.qcInspection ? { createdAt: { gte: currentOrder.qcInspection.updatedAt } } : {}) }, orderBy: { createdAt: "desc" }, select: { userId: true, status: true } });
      const latest = new Map<string, string>();
      updates.forEach(update => { if (!latest.has(update.userId)) latest.set(update.userId, update.status); });
      const allCompleted = assignedTailors.length > 0 && assignedTailors.every(item => latest.get(item.userId) === "COMPLETED");
      const aggregateStatus = allCompleted ? "CREATED" : [...latest.values()].some(value => value === "IN_PROGRESS") ? "IN_PROGRESS" : [...latest.values()].some(value => value === "ON_HOLD") ? "ON_HOLD" : "IN_PROGRESS";
      return transaction.order.update({ where: { id }, data: { status: aggregateStatus, currentStage: allCompleted ? "QUALITY_CHECK" : "STITCHING", estimatedCompletion: allCompleted ? null : eta }, select: { id: true, status: true, currentStage: true, estimatedCompletion: true } });
    });
    return Response.json({ ...order, tailorStatus: parsed.data.status });
  }
  const existingFusingSkip = currentOrder.currentStage === "CUTTING" && parsed.data.status === "COMPLETED" ? await prisma.orderStatusUpdate.findFirst({ where: { orderId: id, stage: "FUSING", status: "NOT_REQUIRED" }, select: { id: true } }) : null;
  const advancedStage = currentOrder.currentStage === "CUTTING" && parsed.data.status === "COMPLETED" && existingFusingSkip ? "STITCHING" : parsed.data.status === "COMPLETED" || (currentOrder.currentStage === "FUSING" && parsed.data.status === "NOT_REQUIRED") ? nextStage[currentOrder.currentStage] : null;
  const nextState = handoffState(advancedStage, parsed.data.status, eta);
  const order = await prisma.$transaction(async transaction => {
    const claimed = await transaction.order.updateMany({
      where: { id, currentStage: currentOrder.currentStage },
      data: { status: nextState.status, currentStage: nextState.currentStage || currentOrder.currentStage, estimatedCompletion: nextState.estimatedCompletion },
    });
    if (!claimed.count) throw new Error("STALE_STAGE_UPDATE");
    await transaction.orderStatusUpdate.create({ data: { orderId: id, status: parsed.data.status, stage: currentOrder.currentStage, comment: parsed.data.comment || null, eta, userId: actor.id } });
    return transaction.order.findUniqueOrThrow({ where: { id }, select: { id: true, status: true, currentStage: true, estimatedCompletion: true } });
  }).catch(error => {
    if (error instanceof Error && error.message === "STALE_STAGE_UPDATE") return null;
    throw error;
  });
  if (!order) return Response.json({ error: "This order was updated by another user. Refresh and try again." }, { status: 409 });
  return Response.json(order);
}
