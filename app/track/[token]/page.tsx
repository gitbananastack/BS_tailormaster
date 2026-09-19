import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

const stages = ["CUTTING", "STITCHING", "QUALITY_CHECK", "PACKING", "DELIVERY"] as const;
const labels: Record<(typeof stages)[number], string> = { CUTTING: "Cutting", STITCHING: "Stitching", QUALITY_CHECK: "Quality check", PACKING: "Packing", DELIVERY: "Delivery" };

export const metadata = { title: "Track job order | StitchFlow", description: "Read-only live production status" };

export default async function PublicTrackingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const order = await prisma.order.findUnique({ where: { qrToken: decodeURIComponent(token) }, include: { customer: { select: { name: true } }, items: { include: { sizeQuantities: { orderBy: { size: "asc" } } } }, statusUpdates: { select: { stage: true, status: true, createdAt: true }, orderBy: { createdAt: "desc" } } } });
  if (!order) notFound();
  const currentIndex = stages.indexOf(order.currentStage);
  const total = order.items.flatMap((item) => item.sizeQuantities).reduce((sum, entry) => sum + entry.quantity, 0);
  const sizes = order.items.flatMap((item) => item.sizeQuantities).filter((entry) => entry.quantity > 0);
  return <main className="public-track-shell"><header className="track-brand"><span>SF</span><div><b>StitchFlow</b><small>Live order tracking</small></div></header><section className="track-hero"><div><p className="eyebrow">Job order</p><h1>{order.orderNumber}</h1><p>{order.garmentName} · {order.customer.name}</p></div><span className={`order-status ${order.status.toLowerCase()}`}>{order.status.replaceAll("_", " ")}</span></section><section className="track-live"><small>Current production stage</small><h2>{labels[order.currentStage]}</h2>{order.estimatedCompletion ? <p>Expected completion: <b>{order.estimatedCompletion.toLocaleString("en-IN")}</b></p> : <p>Completion estimate will be updated shortly.</p>}</section><section className="track-timeline"><h2>Production journey</h2><ol>{stages.map((stage, index) => { const complete = index < currentIndex || (index === currentIndex && order.status === "COMPLETED"); const current = index === currentIndex && !complete; const latest = order.statusUpdates.find((update) => update.stage === stage); return <li className={complete ? "complete" : current ? "current" : "pending"} key={stage}><i>{complete ? "✓" : index + 1}</i><div><b>{labels[stage]}</b><span>{complete ? "Completed" : current ? order.status.replaceAll("_", " ") : "Pending"}</span>{latest ? <small>Updated {latest.createdAt.toLocaleString("en-IN")}</small> : null}</div></li>; })}</ol></section><section className="track-details"><div><span>Total quantity</span><b>{total} garments</b></div><div><span>Received date</span><b>{order.receivedDate?.toLocaleDateString("en-IN") || order.createdAt.toLocaleDateString("en-IN")}</b></div><div><span>Process</span><b>{order.processName || "Production"}</b></div></section>{sizes.length ? <section className="track-sizes"><h2>Size breakdown</h2><div>{sizes.map((entry) => <span key={entry.id}><small>Size {entry.size}</small><b>{entry.quantity}</b></span>)}</div></section> : null}<footer>This is a read-only tracking page. Internal costs, notes, and staff information are not shown.</footer></main>;
}
