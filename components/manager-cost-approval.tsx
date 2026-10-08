"use client";

import { BillingCostControls } from "@/components/billing-cost-controls";

type Cost = { id: string; stage: string; amount: string; note: string | null; isAccepted: boolean; responseNote?: string | null; user: { name: string } };

export function ManagerCostApproval({ orderId, costs }: { orderId: string; costs: Cost[] }) {
  return <section className="detail-section manager-cost-approval"><div className="section-heading"><div><p className="eyebrow">Tailor amount</p><h2>Stitching cost proposal</h2></div><a className="text-button" href={`/orders/${orderId}/billing`}>Open tailor billing →</a></div>{costs.length ? <div className="manager-cost-list">{costs.map((cost) => <article key={cost.id}><div><b>{cost.user.name} · Tailor</b><span>{cost.responseNote ? `Correction requested: ${cost.responseNote}` : cost.note || "No note"}</span></div><strong>₹{cost.amount}</strong><em className={cost.isAccepted ? "approved" : "pending"}>{cost.isAccepted ? "Accepted · Finalized" : "Waiting for tailor"}</em><BillingCostControls orderId={orderId} costId={cost.id} /></article>)}</div> : <p className="muted">Set the tailor amount from the Billing screen.</p>}</section>;
}
