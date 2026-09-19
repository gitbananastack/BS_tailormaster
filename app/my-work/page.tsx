import { MobileNav } from "@/components/mobile-nav";
import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

const labels: Record<string, string> = { CUTTING: "Cutting", STITCHING: "Stitching", QUALITY_CHECK: "Quality check", PACKING: "Packing", DELIVERY: "Delivery" };
const freshCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

export default async function MyWorkPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const assignments = await prisma.orderAssignment.findMany({ where: { userId: user.id }, select: { orderId: true, stage: true } });
  const orders = await prisma.order.findMany({ where: { id: { in: assignments.map((assignment) => assignment.orderId) }, status: { in: ["CREATED", "IN_PROGRESS", "ON_HOLD"] } }, include: { customer: true, items: { include: { sizeQuantities: true } }, statusUpdates: { where: { status: "COMPLETED" }, orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: { updatedAt: "desc" } });
  const work = orders.filter((order) => assignments.some((assignment) => assignment.orderId === order.id && assignment.stage === order.currentStage));
  const newCount = work.filter((order) => order.createdAt >= freshCutoff || order.statusUpdates.some((update) => update.createdAt >= freshCutoff)).length;
  return <main className="orders-shell"><header className="orders-header work-header"><div><a className="back-link" href="/">← Dashboard</a><p className="eyebrow">Assigned production</p><h1>My work bucket</h1><p className="muted">Jobs waiting for you at their active production stage.</p></div><div className="work-summary"><div><span>Waiting for you</span><b>{work.length}</b></div><div className={newCount ? "new-work-count" : ""}><span>New handoffs</span><b>{newCount}</b></div></div></header><section className="work-list">{work.length ? work.map((order) => { const quantity = order.items.flatMap((item) => item.sizeQuantities).reduce((sum, line) => sum + line.quantity, 0); const isNew = order.createdAt >= freshCutoff || order.statusUpdates.some((update) => update.createdAt >= freshCutoff); return <a className={`work-card${isNew ? " is-new" : ""}`} href={`/orders/${order.id}`} key={order.id}>{isNew ? <span className="new-job-badge">New handoff</span> : null}<div className="work-card-head"><div><span className="order-number">{order.orderNumber}</span><h2>{order.garmentName}</h2><p>{order.customer.name}</p></div><span className={`order-status ${order.status.toLowerCase()}`}>{order.status.replace("_", " ")}</span></div><div className="work-stage"><span>YOUR CURRENT TASK</span><b>{labels[order.currentStage]}</b><i>→</i><small>Open job to update progress</small></div><div className="work-card-meta"><span><small>Quantity</small><b>{quantity} pieces</b></span><span><small>Due / ETA</small><b>{order.estimatedCompletion ? order.estimatedCompletion.toLocaleDateString("en-IN") : "Not set"}</b></span><span><small>Received</small><b>{order.createdAt.toLocaleDateString("en-IN")}</b></span></div></a>; }) : <article className="empty-orders"><h2>No jobs in your bucket</h2><p>New work will appear here automatically when the previous stage is completed.</p></article>}</section><MobileNav active="work" /></main>;
}
