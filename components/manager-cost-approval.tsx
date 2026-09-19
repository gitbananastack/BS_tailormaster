"use client";

import { BillingCostControls } from "@/components/billing-cost-controls";

const labels: Record<string, string> = { CUTTING: "Cutting", STITCHING: "Stitching", QUALITY_CHECK: "Quality check", PACKING: "Packing", DELIVERY: "Delivery" };
type Cost = { id: string; stage: string; amount: string; note: string | null; isAccepted: boolean; responseNote?: string | null; user: { name: string } };

export function ManagerCostApproval({ orderId, costs }: { orderId: string; costs: Cost[] }) {
  return <section className="detail-section manager-cost-approval"><div className="section-heading"><div><p className="eyebrow">Phase cost</p><h2>Manager-proposed amount</h2></div><a className="text-button" href={`/orders/${orderId}/billing`}>Open billing summary →</a></div>{costs.length ? <div className="manager-cost-list">{costs.map((cost) => <article key={cost.id}><div><b>{cost.user.name} · {labels[cost.stage]}</b><span>{cost.responseNote ? `Correction requested: ${cost.responseNote}` : cost.note || "No note"}</span></div><strong>₹{cost.amount}</strong><em className={cost.isAccepted ? "approved" : "pending"}>{cost.isAccepted ? "Accepted · Finalized" : "Waiting for worker"}</em><BillingCostControls orderId={orderId} costId={cost.id} /></article>)}</div> : <p className="muted">Set this phase’s worker amount from the Billing screen.</p>}</section>;
}
