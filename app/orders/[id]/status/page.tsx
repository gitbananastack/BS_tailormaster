import { DesignNumbers } from "@/components/design-numbers";
import { hasAnyRole, hasRole, canWorkStage } from "@/lib/roles";
import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { OrderStatusUpdate } from "@/components/order-status-update";
import { QcInspection } from "@/components/qc-inspection";

const stages = ["CUTTING", "FUSING", "STITCHING", "QUALITY_CHECK", "PACKING", "DELIVERY"] as const;
const labels = { CUTTING: "Cutting", FUSING: "Fusing", STITCHING: "Stitching", QUALITY_CHECK: "Quality check", PACKING: "Packing", DELIVERY: "Delivery" };
const icons = ["✂", "◆", "◇", "✓", "▣", "↗"];

export default async function OrderStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await currentUser();
  if (!actor) redirect(`/login?next=${encodeURIComponent(`/orders/${id}/status`)}`);
  const canManage = hasAnyRole(actor, ["ADMIN", "ORDER_MANAGER"]);
  const order = await prisma.order.findUnique({ where: { id }, include: { customer: true, qcInspection: true, assignments: { select: { userId: true, stage: true, user: { select: { name: true } } } }, statusUpdates: { include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" } }, items: { include: { sizeQuantities: true } } } });
  if (!order) notFound();
  const stageIndex = stages.indexOf(order.currentStage);
  const quantity = order.items.flatMap(item => item.sizeQuantities).reduce((total, line) => total + line.quantity, 0);
  const latest = order.statusUpdates[0];
  const canInspect = hasRole(actor, "QC_INSPECTOR") && order.currentStage === "QUALITY_CHECK" && order.assignments.some(item => item.stage === "QUALITY_CHECK" && item.userId === actor.id);
  const reworkTailorIds = order.qcInspection?.result === "REWORK_REQUIRED" && order.qcInspection.reworkStage === "STITCHING" && Array.isArray(order.qcInspection.reworkTailorIds) ? order.qcInspection.reworkTailorIds.filter((item): item is string => typeof item === "string") : [];
  const isAssignedCurrentWorker = order.assignments.some(item => item.stage === order.currentStage && canWorkStage(actor, order.currentStage, item.userId)) && (!reworkTailorIds.length || reworkTailorIds.includes(actor.id));
  const canUpdate = order.currentStage === "STITCHING" ? isAssignedCurrentWorker : canManage || isAssignedCurrentWorker;
  const actorStitchingUpdates = order.currentStage === "STITCHING" ? order.statusUpdates.filter(update => update.stage === "STITCHING" && update.userId === actor.id && (!reworkTailorIds.length || !order.qcInspection || update.createdAt >= order.qcInspection.updatedAt)) : order.statusUpdates;
  const actorStatus = order.currentStage === "STITCHING" ? actorStitchingUpdates[0]?.status || "CREATED" : order.status;
  const complete = order.status === "COMPLETED";
  return <main className="scan-result-shell">
    <nav className="scan-result-nav" aria-label="Scan result navigation"><a href="/scan">← Scan another QR</a><div><a href="/">Dashboard ↗</a>{canUpdate && <a className="scan-update-link" href="#update">Update {labels[order.currentStage]} →</a>}</div></nav>
    <section className="scan-result-hero"><div className="scan-result-identity"><span className="scan-success-icon" aria-hidden="true">✓</span><div><DesignNumbers items={order.items} prominent /><p className="eyebrow">Job order</p><h1>{order.orderNumber}</h1><p>{order.garmentName} · {order.customer.name}</p></div></div><span className={`order-status ${order.status.toLowerCase()}`}>{order.status.replaceAll("_", " ")}</span></section>
    <div className="scan-result-metrics"><article><span>Total garments</span><b>{quantity}<small> pieces</small></b></article><article><span>Current stage</span><b>{labels[order.currentStage]}</b></article><article><span>Expected completion</span><b>{order.estimatedCompletion?.toLocaleDateString("en-IN") || "Not set"}</b></article></div>
    <section className="scan-journey"><div className="scan-section-title"><div><p className="eyebrow">From cutting to delivery</p><h2>Production journey</h2></div><span>{complete ? "Complete" : `Stage ${stageIndex + 1} of ${stages.length}`}</span></div><ol>{stages.map((stage, index) => { const done = index < stageIndex || complete; const active = index === stageIndex && !complete; return <li key={stage} className={done ? "done" : active ? "current" : "pending"} aria-current={active ? "step" : undefined}><i aria-hidden="true">{done ? "✓" : icons[index]}</i><b>{labels[stage]}</b><small>{done ? "Completed" : active ? order.status.replaceAll("_", " ").toLowerCase() : "Upcoming"}</small></li>; })}</ol></section>
    <div id="update" />
    {(order.currentStage === "QUALITY_CHECK" || order.qcInspection) && <QcInspection orderId={order.id} inspection={order.qcInspection ? { result: order.qcInspection.result, stitchingPassed: order.qcInspection.stitchingPassed, measurementPassed: order.qcInspection.measurementPassed, finishingPassed: order.qcInspection.finishingPassed, rejectionReason: order.qcInspection.rejectionReason, reworkStage: order.qcInspection.reworkStage, reworkTailorIds: order.qcInspection.reworkTailorIds, reworkDesignCodes: order.qcInspection.reworkDesignCodes, updatedAt: order.qcInspection.updatedAt.toISOString(), defectPhotoPath: order.qcInspection.defectPhotoPath } : null} canInspect={canInspect} designs={order.items.flatMap(item => item.designCode?.trim() ? [{ code: item.designCode.trim(), name: item.itemName }] : [])} tailors={order.assignments.filter(item => item.stage === "STITCHING").map(item => ({ id: item.userId, name: item.user.name }))} />}
    {canUpdate ? <div><OrderStatusUpdate key={`${order.currentStage}-${actorStatus}`} orderId={order.id} currentStatus={actorStatus} currentStage={order.currentStage} eta={actorStitchingUpdates[0]?.eta?.toISOString() || order.estimatedCompletion?.toISOString() || null} updates={actorStitchingUpdates.map(update => ({ ...update, createdAt: update.createdAt.toISOString(), eta: update.eta?.toISOString() || null }))} canUpdate={true} completionLabel={order.currentStage === "STITCHING" ? "Completed — my stitching is done" : undefined} /></div> : <p className="scan-access-note">{order.currentStage === "STITCHING" && canManage ? "Tailor progress is read-only for managers. Open the order pipeline to review each tailor’s status and history." : "Read-only access. Only the staff member assigned to the current stage with its required role, or an administrator / order manager, can update this order."}</p>}
    <section className="scan-order-details"><div className="scan-section-title"><div><p className="eyebrow">Order details</p><h2>Garments & sizes</h2></div><span>{order.items.length} designs</span></div>{order.items.map(item => <article key={item.id}><div><DesignNumbers items={[item]} /><b>{item.itemName}</b><small>Colour: {item.color || "Not specified"}</small></div><div className="scan-size-chips">{item.sizeQuantities.filter(size => size.quantity > 0).map(size => <span key={size.id}><small>Size {size.size}</small><b>{size.quantity}</b></span>)}</div></article>)}</section>
    <section className="scan-latest-update"><span aria-hidden="true">◷</span><div><b>Latest activity</b><p>{latest ? `${labels[latest.stage]} · ${latest.status.replaceAll("_", " ").toLowerCase()} by ${latest.user.name}` : "This order is ready for its first production update."}</p>{latest && <time>{latest.createdAt.toLocaleString("en-IN")}</time>}</div></section>
    <div className="scan-result-actions"><a className="primary" href={`/orders/${order.id}`}>Open order workspace →</a><a className="scan-secondary-action" href={`/orders/${order.id}/label`}>{canManage ? "Print QR label" : "View QR label"}</a></div>
  </main>;
}
