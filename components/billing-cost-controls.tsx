"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function BillingCostControls({ orderId, costId }: { orderId: string; costId: string }) {
  const router = useRouter(); const [saving, setSaving] = useState(false);
  async function patch(data: object) { setSaving(true); await fetch(`/api/orders/${orderId}/labor-costs/${costId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); setSaving(false); router.refresh(); }
  async function edit() { const value = window.prompt("Update amount (₹)"); if (value && Number(value) > 0) await patch({ amount: Number(value) }); }
  async function remove() { if (!window.confirm("Remove this cost entry?")) return; setSaving(true); await fetch(`/api/orders/${orderId}/labor-costs/${costId}`, { method: "DELETE" }); setSaving(false); router.refresh(); }
  return <div className="billing-controls"><button disabled={saving} onClick={edit}>Edit amount</button><button disabled={saving} onClick={remove}>Remove</button></div>;
}
