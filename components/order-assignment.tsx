"use client";

import { hasRole } from "@/lib/roles";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const stages = [
  { value: "CUTTING", label: "Cutting", role: "CUTTING_OPERATOR" },
  { value: "FUSING", label: "Fusing", role: "FUSING_OPERATOR" },
  { value: "STITCHING", label: "Stitching", role: "TAILOR" },
  { value: "QUALITY_CHECK", label: "Quality check", role: "QC_INSPECTOR" },
  { value: "PACKING", label: "Packing", role: "PACKING_STAFF" },
  { value: "DELIVERY", label: "Delivery", role: "DELIVERY_COORDINATOR" },
] as const;

type Staff = { id: string; name: string; role: string; roles?: unknown };
type Assignment = { stage: string; userId?: string; user: Staff };

export function OrderAssignment({ orderId, staff, assignments, canAssign }: { orderId: string; staff: Staff[]; assignments: Assignment[]; canAssign: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [tailorQuery, setTailorQuery] = useState("");
  const allTailors = useMemo(() => staff.filter(user => hasRole(user, "TAILOR")), [staff]);
  const assignedTailors = assignments.filter(item => item.stage === "STITCHING").map(item => item.user);
  const visibleTailors = allTailors
    .filter(user => user.name.toLowerCase().includes(tailorQuery.trim().toLowerCase()))
    .sort((a, b) => Number(assignedTailors.some(item => item.id === b.id)) - Number(assignedTailors.some(item => item.id === a.id)) || a.name.localeCompare(b.name));

  async function assign(stage: string, userId: string) {
    if (!userId) return;
    setSaving(`${stage}-${userId}`); setMessage("");
    const response = await fetch(`/api/orders/${orderId}/assignments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage, userId }) });
    const body = await response.json();
    if (response.ok) { setMessage(stage === "STITCHING" ? "Tailor added." : "Assignment saved."); router.refresh(); }
    else setMessage(body.error || "Unable to save assignment.");
    setSaving(null);
  }

  async function remove(stage: string, userId: string) {
    setSaving(`${stage}-${userId}`); setMessage("");
    const response = await fetch(`/api/orders/${orderId}/assignments`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage, userId }) });
    const body = await response.json();
    if (response.ok) { setMessage("Tailor removed."); router.refresh(); }
    else setMessage(body.error || "Unable to remove assignment.");
    setSaving(null);
  }

  return <section className="detail-section assignment-section">
    <div className="section-heading"><div><p className="eyebrow">Production ownership</p><h2>Assign shop-floor staff</h2></div><p className="assignment-message" aria-live="polite">{message}</p></div>
    <div className="assignment-list">{stages.map(stage => {
      const current = assignments.filter(item => item.stage === stage.value).map(item => item.user);
      const available = staff.filter(user => hasRole(user, stage.role));
      if (stage.value === "STITCHING") return <div className="assignment-row stitching-assignment-row" key={stage.value}>
        <div className="assignment-stage-label"><b>Stitching</b><span>Select one or more tailors for this work order</span></div>
        <div className="tailor-picker">
          <div className="tailor-picker-heading"><div><b>Assigned tailors</b><span>{assignedTailors.length} selected</span></div>{assignedTailors.length ? <button type="button" onClick={() => setTailorQuery("")}>View all</button> : null}</div>
          <div className="assigned-tailor-chips">{assignedTailors.length ? assignedTailors.map(tailor => <span key={tailor.id}>{tailor.name}{canAssign ? <button type="button" disabled={!!saving} aria-label={`Remove ${tailor.name}`} onClick={() => remove("STITCHING", tailor.id)}>×</button> : null}</span>) : <p>No tailors assigned yet.</p>}</div>
          {canAssign ? <details className="tailor-picker-menu" open={allTailors.length <= 10}>
            <summary>＋ Add or manage tailors <small>{allTailors.length} available</small></summary>
            <div className="tailor-picker-panel">
              <label className="tailor-search"><span aria-hidden="true">⌕</span><input type="search" value={tailorQuery} onChange={event => setTailorQuery(event.target.value)} placeholder="Search tailor by name" /></label>
              <div className="tailor-option-list" role="group" aria-label="Available tailors">{visibleTailors.map(tailor => {
                const selected = assignedTailors.some(item => item.id === tailor.id);
                const busy = saving === `STITCHING-${tailor.id}`;
                return <label className={selected ? "selected" : ""} key={tailor.id}><input type="checkbox" checked={selected} disabled={!!saving} onChange={() => selected ? remove("STITCHING", tailor.id) : assign("STITCHING", tailor.id)} /><span className="tailor-avatar" aria-hidden="true">{tailor.name.slice(0, 1).toUpperCase()}</span><span className="tailor-option-name"><b>{tailor.name}</b><small>{busy ? "Updating…" : selected ? "Assigned to this order" : "Available"}</small></span><i>{selected ? "✓" : "+"}</i></label>;
              })}{!visibleTailors.length ? <p className="tailor-no-results">No tailors match “{tailorQuery}”.</p> : null}</div>
            </div>
          </details> : null}
        </div>
      </div>;
      const assigned = current[0];
      return <div className="assignment-row" key={stage.value}><div><b>{stage.label}</b><span>{assigned ? `Assigned to ${assigned.name}` : `No ${stage.label.toLowerCase()} staff assigned`}</span></div>{canAssign ? <select value={assigned?.id || ""} onChange={event => assign(stage.value, event.target.value)} disabled={saving?.startsWith(stage.value)}><option value="">Select {stage.label} staff</option>{available.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</select> : <span className="assignment-view">{assigned?.name || "Unassigned"}</span>}</div>;
    })}</div>
  </section>;
}
