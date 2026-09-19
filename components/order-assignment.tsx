"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const stages = [{ value: "CUTTING", label: "Cutting", role: "CUTTING_OPERATOR" }, { value: "STITCHING", label: "Stitching", role: "TAILOR" }, { value: "QUALITY_CHECK", label: "Quality check", role: "QC_INSPECTOR" }, { value: "PACKING", label: "Packing", role: "PACKING_STAFF" }, { value: "DELIVERY", label: "Delivery", role: "DELIVERY_COORDINATOR" }] as const;
type Staff = { id: string; name: string; role: string };
type Assignment = { stage: string; user: Staff };

export function OrderAssignment({ orderId, staff, assignments, canAssign }: { orderId: string; staff: Staff[]; assignments: Assignment[]; canAssign: boolean }) {
  const router = useRouter(); const [message, setMessage] = useState(""); const [saving, setSaving] = useState<string | null>(null);
  async function assign(stage: string, userId: string) { if (!userId) return; setSaving(stage); setMessage(""); const response = await fetch(`/api/orders/${orderId}/assignments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage, userId }) }); const body = await response.json(); if (response.ok) { setMessage("Assignment saved."); router.refresh(); } else setMessage(body.error || "Unable to save assignment."); setSaving(null); }
  return <section className="detail-section assignment-section"><div className="section-heading"><div><p className="eyebrow">Production ownership</p><h2>Assign shop-floor staff</h2></div><p className="assignment-message" aria-live="polite">{message}</p></div><div className="assignment-list">{stages.map((stage) => { const current = assignments.find((item) => item.stage === stage.value)?.user; const available = staff.filter((user) => user.role === stage.role); return <div className="assignment-row" key={stage.value}><div><b>{stage.label}</b><span>{current ? `Assigned to ${current.name}` : `No ${stage.label.toLowerCase()} staff assigned`}</span></div>{canAssign ? <select value={current?.id || ""} onChange={(event) => assign(stage.value, event.target.value)} disabled={saving === stage.value}><option value="">Select {stage.label} staff</option>{available.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select> : <span className="assignment-view">{current?.name || "Unassigned"}</span>}</div>; })}</div></section>;
}
