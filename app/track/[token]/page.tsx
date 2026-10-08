import { DesignNumbers } from "@/components/design-numbers";
import { currentUser } from "@/lib/current-user";
import { hasAnyRole, canWorkStage } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

const stages = ["CUTTING", "FUSING", "STITCHING", "QUALITY_CHECK", "PACKING", "DELIVERY"] as const;
const labels: Record<(typeof stages)[number], string> = { CUTTING: "Cutting", FUSING: "Fusing", STITCHING: "Stitching", QUALITY_CHECK: "Quality check", PACKING: "Packing", DELIVERY: "Delivery" };

export const metadata = { title: "Track job order | StitchFlow", description: "Read-only live production status" };

export default async function PublicTrackingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const order = await prisma.order.findUnique({ where: { qrToken: decodeURIComponent(token) }, include: { customer: { select: { name: true } }, items: { include: { sizeQuantities: { orderBy: { size: "asc" } } } }, statusUpdates: { select: { stage: true, status: true, createdAt: true }, orderBy: { createdAt: "desc" } } } });
  if (!order) notFound();
  const actor = await currentUser();
  const assignment = actor ? await prisma.orderAssignment.findFirst({ where: { orderId: order.id, stage: order.currentStage, userId: actor.id }, select: { userId: true } }) : null;
  const canUpdate = actor && (hasAnyRole(actor, ["ADMIN", "ORDER_MANAGER"]) || canWorkStage(actor, order.currentStage, assignment?.userId));
  const updatePath = `/orders/${order.id}/status#update`;
  const currentIndex = stages.indexOf(order.currentStage);
  const total = order.items.flatMap((item) => item.sizeQuantities).reduce((sum, entry) => sum + entry.quantity, 0);
  const sizes = order.items.flatMap((item) => item.sizeQuantities).filter((entry) => entry.quantity > 0);
  return <main className="public-track-shell"><div className="tracking-staff-access">{!actor ? <a className="primary" href={`/login?next=${encodeURIComponent(updatePath)}`}>Staff login to update →</a> : canUpdate ? <a className="primary" href={updatePath}>Update {labels[order.currentStage]} →</a> : <span>Signed in · Read-only for this stage</span>}<small>Updates require the current stage’s role and assignment.</small></div><header className="track-brand"><span>SF</span><div><b>StitchFlow</b><small>Live order tracking</small></div></header><section className="track-hero"><div><DesignNumbers items={order.items} prominent /><p className="eyebrow">Job order</p><h1>{order.orderNumber}</h1><p>{order.garmentName} · {order.customer.name}</p></div><span className={`order-status ${order.status.toLowerCase()}`}>{order.status.replaceAll("_", " ")}</span></section><section className="track-live"><small>Current production stage</small><h2>{labels[order.currentStage]}</h2>{order.estimatedCompletion ? <p>Expected completion: <b>{order.estimatedCompletion.toLocaleString("en-IN")}</b></p> : <p>Completion estimate will be updated shortly.</p>}</section><section className="track-timeline"><h2>Production journey</h2><ol>{stages.map((stage, index) => { const complete = index < currentIndex || (index === currentIndex && order.status === "COMPLETED"); const current = index === currentIndex && !complete; const latest = order.statusUpdates.find((update) => update.stage === stage); return <li className={complete ? "complete" : current ? "current" : "pending"} key={stage}><i>{complete ? "✓" : index + 1}</i><div><b>{labels[stage]}</b><span>{complete ? "Completed" : current ? order.status.replaceAll("_", " ") : "Pending"}</span>{latest ? <small>Updated {latest.createdAt.toLocaleString("en-IN")}</small> : null}</div></li>; })}</ol></section><section className="track-details"><div><span>Total quantity</span><b>{total} garments</b></div><div><span>Received date</span><b>{order.receivedDate?.toLocaleDateString("en-IN") || order.createdAt.toLocaleDateString("en-IN")}</b></div><div><span>Process</span><b>{order.processName || "Production"}</b></div></section>{sizes.length ? <section className="track-sizes"><h2>Size breakdown</h2>{order.items.map(item => <article className="track-design-sizes" key={item.id}><DesignNumbers items={[item]} /><b>{item.itemName}</b><div>{item.sizeQuantities.filter(entry => entry.quantity > 0).map(entry => <span key={entry.id}><small>Size {entry.size}</small><b>{entry.quantity}</b></span>)}</div></article>)}</section> : null}<footer>This is a read-only tracking page. Internal costs, notes, and staff information are not shown.</footer></main>;
}
