import { OrderAssignment } from "@/components/order-assignment";
import { ManagerNotes } from "@/components/manager-notes";
import { InteractivePipeline } from "@/components/interactive-pipeline";
import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";

const sizes = [38, 40, 42, 44, 46, 48, 50];

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor) redirect("/login");
  const canAssign = ["ADMIN", "ORDER_MANAGER"].includes(actor.role);
  const { id } = await params;
  const [order, staff] = await Promise.all([
    prisma.order.findUnique({ where: { id }, include: { customer: true, createdBy: { select: { id: true, name: true, phone: true, role: true } }, items: { include: { sizeQuantities: true } }, rawMaterials: true, batches: true, qcInspection: true, assignments: { include: { user: { select: { id: true, name: true, role: true, phone: true } } } }, statusUpdates: { include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" } }, managerNotes: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "desc" } }, laborCosts: { where: canAssign ? {} : { userId: actor.id }, include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" } } } }),
    prisma.user.findMany({ where: { isActive: true, role: { in: ["CUTTING_OPERATOR", "TAILOR", "QC_INSPECTOR", "PACKING_STAFF", "DELIVERY_COORDINATOR"] } }, select: { id: true, name: true, role: true }, orderBy: { name: "asc" } }),
  ]);
  if (!order) notFound();
  const total = order.items.flatMap((item) => item.sizeQuantities).reduce((sum, line) => sum + line.quantity, 0);
  const canUpdateStatus = canAssign || order.assignments.some((assignment) => assignment.userId === actor.id && assignment.stage === order.currentStage);
  const isAssignedQcWorker = actor.role === "QC_INSPECTOR" && order.currentStage === "QUALITY_CHECK" && order.assignments.some((assignment) => assignment.stage === "QUALITY_CHECK" && assignment.userId === actor.id);
  const visibleManagerNotes = canAssign ? order.managerNotes : order.managerNotes.filter((note) => order.assignments.some((assignment) => assignment.userId === actor.id && assignment.stage === note.stage));
  const activeWorker = order.assignments.find((assignment) => assignment.stage === order.currentStage)?.user;
  const fallbackManager = !order.createdBy && order.productionManager ? await prisma.user.findFirst({ where: { name: order.productionManager, role: { in: ["ADMIN", "ORDER_MANAGER"] }, isActive: true }, select: { id: true, name: true, phone: true, role: true } }) : null;
  const orderManager = order.createdBy || fallbackManager;
  const whatsappContact = canAssign ? activeWorker : orderManager;
  const whatsappNumber = whatsappContact?.phone?.replace(/\D/g, "");
  const whatsappHref = whatsappNumber ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hello ${whatsappContact?.name}, regarding job order ${order.orderNumber} (${order.garmentName}) — ${order.currentStage.replaceAll("_", " ")}.`)}` : null;

  return <main className="detail-shell">
    <header className="detail-header"><div><a className="back-link" href="/orders">← All job orders</a><p className="eyebrow">Job order {order.orderNumber}</p><h1>{order.garmentName}</h1><p className="muted">{order.customer.name} · {order.processName || "Process not set"}</p></div><div className="detail-actions">{canAssign ? <><a className="text-button" href={`/orders/${order.id}/billing`}>Billing</a><a className="text-button" href={`/orders/${order.id}/edit`}>Edit order</a></> : null}<a className="primary" href={`/orders/${order.id}/label`}>{canAssign ? "Print QR label" : "View QR"}</a><div className="detail-total"><span>Total garments</span><b>{total}</b></div></div></header>
    <InteractivePipeline orderId={order.id} orderNumber={order.orderNumber} currentStage={order.currentStage} status={order.status} eta={order.estimatedCompletion?.toISOString() || null} assignments={order.assignments} updates={order.statusUpdates.map((update) => ({ ...update, eta: update.eta?.toISOString() || null, createdAt: update.createdAt.toISOString() }))} costs={order.laborCosts.map((cost) => ({ ...cost, amount: cost.amount.toString(), createdAt: cost.createdAt.toISOString() }))} canUpdate={canUpdateStatus} canManage={canAssign} managerContact={orderManager ? { name: orderManager.name, phone: orderManager.phone } : null} qcInspection={order.qcInspection ? { result: order.qcInspection.result, stitchingPassed: order.qcInspection.stitchingPassed, measurementPassed: order.qcInspection.measurementPassed, finishingPassed: order.qcInspection.finishingPassed, rejectionReason: order.qcInspection.rejectionReason, reworkStage: order.qcInspection.reworkStage, defectPhotoPath: order.qcInspection.defectPhotoPath } : null} canInspectQc={isAssignedQcWorker} />
    <section className="detail-grid"><article><p className="eyebrow">Client</p><h2>{order.customer.name}</h2><p>{order.customer.phone || "No contact number"}</p><p>{order.customer.address || "No address recorded"}</p></article><article><p className="eyebrow">Document details</p><dl><div><dt>Issue no.</dt><dd>{order.issueNumber || "—"}</dd></div><div><dt>Sales order</dt><dd>{order.salesOrderNumber || "—"}</dd></div><div><dt>Manager</dt><dd>{order.productionManager || "—"}</dd></div>{canAssign ? <div><dt>Inward value</dt><dd>{order.inwardValue ? `₹${order.inwardValue.toString()}` : "—"}</dd></div> : null}<div><dt>Received</dt><dd>{order.receivedDate?.toLocaleDateString("en-IN") || "—"}</dd></div></dl></article></section>
    {canAssign ? <OrderAssignment orderId={order.id} staff={staff} assignments={order.assignments} canAssign={canAssign} /> : null}
    <ManagerNotes orderId={order.id} currentStage={order.currentStage} notes={visibleManagerNotes.map((note) => ({ ...note, createdAt: note.createdAt.toISOString() }))} canManage={canAssign} />
    <section className="detail-section"><div className="section-heading"><div><p className="eyebrow">Finish</p><h2>Finished garment breakdown</h2></div><span className={`order-status ${order.status.toLowerCase()}`}>{order.status.replace("_", " ")}</span></div>{order.items.map((item) => { const values = new Map(item.sizeQuantities.map((line) => [line.size, line.quantity])); return <div className="size-breakdown" key={item.id}><div className="item-caption"><b>{item.itemName}</b><span>Color {item.color || "—"}</span></div>{sizes.map((size) => <div key={size}><small>Size {size}</small><b>{values.get(size) || 0}</b></div>)}</div>; })}</section>
    <section className="detail-section"><div className="section-heading"><div><p className="eyebrow">Raw</p><h2>Raw-material inward</h2></div><span>{order.rawMaterials.length} items</span></div>{order.rawMaterials.length ? <div className="material-detail-table"><div><span>Item code</span><span>Item name</span><span>Color</span><span>Panna</span><span>Quantity</span></div>{order.rawMaterials.map((material) => <div key={material.id}><b>{material.itemCode || "—"}</b><b>{material.itemName}</b><span>{material.color || "—"}</span><span>{material.panna?.toString() || "—"}</span><span>{material.quantity.toString()} {material.unit}</span></div>)}</div> : <p className="muted">No raw-material inward entries recorded.</p>}</section>
    {whatsappHref ? <a className="whatsapp-float" href={whatsappHref} target="_blank" rel="noreferrer" aria-label={`Message ${whatsappContact?.name} on WhatsApp`}><b>◔</b><span>{canAssign ? `Message ${whatsappContact?.name}` : "Message order manager"}</span></a> : null}
  </main>;
}
