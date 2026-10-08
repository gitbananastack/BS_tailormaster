import { hasAnyRole, hasRole } from "@/lib/roles";
import { BillingCostControls } from "@/components/billing-cost-controls";
import { BillingPhaseCostForm } from "@/components/billing-phase-cost-form";
import { LaborCostForm } from "@/components/labor-cost-form";
import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";

export default async function BillingPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor) redirect("/login");
  if (!hasAnyRole(actor, ["ADMIN", "ORDER_MANAGER"])) redirect("/orders");
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id }, include: { customer: true, assignments: { where: { stage: "STITCHING" }, include: { user: { select: { id: true, name: true } } } }, laborCosts: { where: { stage: "STITCHING" }, include: { user: { select: { name: true } } }, orderBy: { createdAt: "asc" } } } });
  if (!order) notFound();
  const proposed = order.laborCosts.reduce((sum, cost) => sum + Number(cost.amount), 0);
  const finalized = order.laborCosts.filter((cost) => cost.isAccepted).reduce((sum, cost) => sum + Number(cost.amount), 0);
  const tailors = order.assignments.map(assignment => assignment.user);
  const canAcceptOwnAmount = hasRole(actor, "TAILOR");
  return <main className="billing-shell"><header className="billing-header"><div><a className="back-link" href={`/orders/${id}`}>← Back to order</a><p className="eyebrow">Tailor billing</p><h1>{order.orderNumber} stitching amount</h1><p className="muted">{order.garmentName} · {order.customer.name}</p></div><div className="billing-total"><span>Finalized tailor amount</span><b>₹{finalized.toFixed(2)}</b></div></header><section className="billing-summary tailor-billing-summary"><article><span>Assigned tailors</span><b>{tailors.length}</b><small>{tailors.map(tailor => tailor.name).join(" · ") || "Not assigned"}</small></article><article><span>Proposed amount</span><b>₹{proposed.toFixed(2)}</b></article><article><span>Accepted amount</span><b>₹{finalized.toFixed(2)}</b></article></section><section className="billing-phase-list"><div className="section-heading"><div><p className="eyebrow">Stitching cost</p><h2>Set each tailor’s amount</h2></div></div>{tailors.length ? tailors.map(tailor => { const entries = order.laborCosts.filter(entry => entry.userId === tailor.id); const tailorFinalized = entries.filter(entry => entry.isAccepted).reduce((sum, entry) => sum + Number(entry.amount), 0); return <article className="billing-phase" key={tailor.id}><header><div><h3>{tailor.name}</h3><span>Assigned tailor</span></div><b>₹{tailorFinalized.toFixed(2)}</b></header><BillingPhaseCostForm orderId={id} stage="STITCHING" worker={tailor}/>{canAcceptOwnAmount && tailor.id === actor.id && entries.length ? <LaborCostForm orderId={id} stage="STITCHING" entries={entries.map(entry => ({ ...entry, amount: entry.amount.toString(), createdAt: entry.createdAt.toISOString() }))} canAdd={false} /> : null}{entries.length ? <div className="billing-entry-list">{entries.map((entry) => <div key={entry.id}><div><b>{entry.user.name}</b><span>{entry.responseNote ? `Correction requested: ${entry.responseNote}` : entry.note || "No note"}</span><small>{entry.createdAt.toLocaleString("en-IN")}</small></div><strong>₹{Number(entry.amount).toFixed(2)}</strong><em className={entry.isAccepted ? "approved" : "pending"}>{entry.isAccepted ? "Accepted · Finalized" : "Waiting for tailor"}</em><BillingCostControls orderId={id} costId={entry.id}/></div>)}</div> : <p className="muted">No amount proposed for this tailor.</p>}</article>; }) : <article className="billing-phase"><p className="muted">Assign at least one tailor from Production ownership before setting an amount.</p></article>}</section></main>;
}
