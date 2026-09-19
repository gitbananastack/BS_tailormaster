import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";

const stages = ["CUTTING", "STITCHING", "QUALITY_CHECK", "PACKING", "DELIVERY"] as const;
const labels: Record<(typeof stages)[number], string> = { CUTTING: "Cutting", STITCHING: "Stitching", QUALITY_CHECK: "Quality check", PACKING: "Packing", DELIVERY: "Delivery" };

export default async function OrderStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor) redirect("/login");
  const canPrint = ["ADMIN", "ORDER_MANAGER"].includes(actor.role);
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id }, include: { customer: true, statusUpdates: { include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 1 }, items: { include: { sizeQuantities: true } } } });
  if (!order) notFound();
  const stageIndex = stages.indexOf(order.currentStage);
  const quantity = order.items.flatMap((item) => item.sizeQuantities).reduce((total, line) => total + line.quantity, 0);
  const latest = order.statusUpdates[0];
  return <main className="status-shell"><a className="back-link" href="/scan">← Scan another QR</a><section className="status-card"><p className="eyebrow">Live job-order status</p><h1>{order.orderNumber}</h1><p className="muted">{order.garmentName} · {order.customer.name} · {quantity} garments</p><div className="live-status"><span>{labels[order.currentStage]}</span><b>{order.status.replace("_", " ")}</b></div><ol className="status-timeline">{stages.map((stage, index) => <li className={index < stageIndex ? "complete" : index === stageIndex ? "current" : ""} key={stage}><i>{index + 1}</i><div><b>{labels[stage]}</b><small>{index < stageIndex ? "Completed" : index === stageIndex ? "Current stage" : "Pending"}</small></div></li>)}</ol>{latest ? <p className="latest-event">Latest update: {latest.stage.replaceAll("_", " ")} · {latest.status.replace("_", " ")} by {latest.user.name} at {latest.createdAt.toLocaleString("en-IN")}</p> : <p className="latest-event">Waiting for the cutting team to start this job.</p>}<div className="status-actions"><a className="text-button" href={`/orders/${order.id}`}>View full order</a><a className="primary" href={`/orders/${order.id}/label`}>{canPrint ? "Print QR label" : "View QR"}</a></div></section></main>;
}
