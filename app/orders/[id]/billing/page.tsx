import { BillingCostControls } from "@/components/billing-cost-controls";
import { BillingPhaseCostForm } from "@/components/billing-phase-cost-form";
import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";

const stages = ["CUTTING", "STITCHING", "QUALITY_CHECK", "PACKING", "DELIVERY"] as const;
const labels: Record<(typeof stages)[number], string> = { CUTTING: "Cutting", STITCHING: "Stitching", QUALITY_CHECK: "Quality check", PACKING: "Packing", DELIVERY: "Delivery" };

export default async function BillingPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor) redirect("/login");
  if (!["ADMIN", "ORDER_MANAGER"].includes(actor.role)) redirect("/orders");
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id }, include: { customer: true, assignments: { include: { user: { select: { id: true, name: true } } } }, laborCosts: { include: { user: { select: { name: true } } }, orderBy: { createdAt: "asc" } } } });
  if (!order) notFound();
  const materialCost = Number(order.inwardValue || 0);
  const laborCost = order.laborCosts.reduce((sum, cost) => sum + Number(cost.amount), 0);
  const finalizedLabor = order.laborCosts.filter((cost) => cost.isAccepted).reduce((sum, cost) => sum + Number(cost.amount), 0);
  return <main className="billing-shell"><header className="billing-header"><div><a className="back-link" href={`/orders/${id}`}>← Back to order</a><p className="eyebrow">Billing phase</p><h1>{order.orderNumber} cost summary</h1><p className="muted">{order.garmentName} · {order.customer.name}</p></div><div className="billing-total"><span>Finalized total</span><b>₹{(materialCost + finalizedLabor).toFixed(2)}</b></div></header><section className="billing-summary"><article><span>Material / inward value</span><b>₹{materialCost.toFixed(2)}</b></article><article><span>Proposed worker costs</span><b>₹{laborCost.toFixed(2)}</b></article><article><span>Accepted worker costs</span><b>₹{finalizedLabor.toFixed(2)}</b></article></section><section className="billing-phase-list"><div className="section-heading"><div><p className="eyebrow">Phase costs</p><h2>Set and finalize worker costs</h2></div></div>{stages.map((stage) => { const entries = order.laborCosts.filter((cost) => cost.stage === stage); const finalized = entries.filter((cost) => cost.isAccepted).reduce((sum, cost) => sum + Number(cost.amount), 0); const worker = order.assignments.find((assignment) => assignment.stage === stage)?.user || null; return <article className="billing-phase" key={stage}><header><div><h3>{labels[stage]}</h3><span>{worker?.name || "Worker not assigned"}</span></div><b>₹{finalized.toFixed(2)}</b></header><BillingPhaseCostForm orderId={id} stage={stage} worker={worker}/>{entries.length ? <div className="billing-entry-list">{entries.map((entry) => <div key={entry.id}><div><b>{entry.user.name}</b><span>{entry.responseNote ? `Correction requested: ${entry.responseNote}` : entry.note || "No note"}</span><small>{entry.createdAt.toLocaleString("en-IN")}</small></div><strong>₹{Number(entry.amount).toFixed(2)}</strong><em className={entry.isAccepted ? "approved" : "pending"}>{entry.isAccepted ? "Accepted · Finalized" : "Waiting for worker"}</em><BillingCostControls orderId={id} costId={entry.id}/></div>)}</div> : <p className="muted">No amount proposed for this phase.</p>}</article>; })}</section></main>;
}
