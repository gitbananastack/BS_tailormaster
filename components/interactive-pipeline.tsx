"use client";
import { userRoles } from "@/lib/roles";

import { LaborCostForm } from "@/components/labor-cost-form";
import { ManagerCostApproval } from "@/components/manager-cost-approval";
import { OrderStatusUpdate } from "@/components/order-status-update";
import { QcInspection, type Inspection } from "@/components/qc-inspection";
import { useState } from "react";

const stages = ["CUTTING", "FUSING", "STITCHING", "QUALITY_CHECK", "PACKING", "DELIVERY"] as const;
const labels: Record<string, string> = { CUTTING: "Cutting", FUSING: "Fusing", STITCHING: "Stitching", QUALITY_CHECK: "Quality check", PACKING: "Packing", DELIVERY: "Delivery" };
type Assignment = { stage: string; user: { id: string; name: string; role: string; roles?: unknown; phone?: string | null } };
type Update = { id: string; status: string; stage: string; comment: string | null; eta: string | null; createdAt: string; user: { id: string; name: string } };
type Cost = { id: string; userId: string; stage: string; amount: string; note: string | null; isAccepted: boolean; responseNote: string | null; createdAt: string; user: { id?: string; name: string } };
type ManagerContact = { name: string; phone: string | null } | null;
type Props = { actorId: string; orderId: string; orderNumber: string; designs: { code: string; name?: string }[]; currentStage: string; status: string; eta: string | null; assignments: Assignment[]; updates: Update[]; costs: Cost[]; canUpdate: boolean; canManage: boolean; managerContact: ManagerContact; qcInspection: Inspection; canInspectQc: boolean };

export function InteractivePipeline({ actorId, orderId, orderNumber, designs, currentStage, status, eta, assignments, updates, costs, canUpdate, canManage, managerContact, qcInspection, canInspectQc }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const current = stages.indexOf(currentStage as typeof stages[number]);
  const reworkTailorIds = qcInspection?.result === "REWORK_REQUIRED" && qcInspection.reworkStage === "STITCHING" && Array.isArray(qcInspection.reworkTailorIds) ? qcInspection.reworkTailorIds.filter((item): item is string => typeof item === "string") : [];
  const phaseAssignments = assignments.filter((item) => item.stage === open && (open !== "STITCHING" || !reworkTailorIds.length || reworkTailorIds.includes(item.user.id)));
  const assignment = phaseAssignments[0];
  const phaseIndex = open ? stages.indexOf(open as typeof stages[number]) : -1;
  const phaseUpdates = open ? updates.filter((update) => update.stage === open && (open !== "STITCHING" || !reworkTailorIds.length || (reworkTailorIds.includes(update.user.id) && (!qcInspection?.updatedAt || new Date(update.createdAt) >= new Date(qcInspection.updatedAt))))) : [];
  const actorUpdate = open === "STITCHING" ? phaseUpdates.find(update => update.user.id === actorId) : null;
  const visibleUpdates = open === "STITCHING" && !canManage ? phaseUpdates.filter(update => update.user.id === actorId) : phaseUpdates;
  const phaseCosts = open ? costs.filter((cost) => cost.stage === open) : [];
  const actorCosts = phaseCosts.filter(cost => cost.userId === actorId);
  const phaseStatus = open === currentStage ? status : phaseIndex < current ? "COMPLETED" : "PENDING";
  const whatsappContacts = canManage ? phaseAssignments.map(item => item.user) : managerContact ? [managerContact] : [];
  const whatsappLinks = whatsappContacts.map(contact => { const number = contact.phone?.replace(/\D/g, ""); return { contact, href: number ? `https://wa.me/${number}?text=${encodeURIComponent(`Hello ${contact.name}, regarding job order ${orderNumber} — ${open ? labels[open] : labels[currentStage]} phase.`)}` : null }; });

  return <section className="interactive-pipeline">
    <div className="pipeline-title"><div><p className="eyebrow">Production pipeline</p><h2>Current: {labels[currentStage]}</h2></div><span className={`order-status ${status.toLowerCase()}`}>{status.replaceAll("_", " ")}</span></div>
    <div className="phase-buttons">{stages.map((stage, index) => { const workers = assignments.filter((entry) => entry.stage === stage); return <button type="button" key={stage} className={index < current ? "done" : index === current ? "current" : ""} onClick={() => setOpen(stage)}><i>{index < current ? "✓" : index + 1}</i><b>{labels[stage]}</b><small>{workers.length ? workers.map(item => item.user.name).join(" · ") : "Not assigned"}</small></button>; })}</div>
    {open ? <div className="phase-modal" role="dialog" aria-modal="true" aria-label={`${labels[open]} phase details`} onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(null); }}><div className="phase-sheet">
      <button className="close-phase" type="button" onClick={() => setOpen(null)} aria-label="Close phase details">×</button>
      <div className="phase-worker"><div><p className="eyebrow">{labels[open]} phase</p><h2>{phaseAssignments.length ? phaseAssignments.map(item => item.user.name).join(" · ") : "No worker assigned"}</h2><p className="muted">{phaseAssignments.length > 1 ? `${phaseAssignments.length} tailors assigned` : (assignment ? userRoles(assignment.user).map(role => role.replaceAll("_", " ")).join(" · ") : null) || "Assign a worker from Production ownership."}</p></div><div className="whatsapp-phase-list">{whatsappLinks.map(({ contact, href }) => href ? <a className="whatsapp-phase" href={href} target="_blank" rel="noreferrer" key={contact.name}>WhatsApp {contact.name}</a> : <span key={contact.name}>{contact.name}: no phone</span>)}</div></div>
      {open === "STITCHING" && phaseAssignments.length ? <section className="tailor-progress-board"><div className="section-heading"><div><p className="eyebrow">Individual progress</p><h2>{phaseAssignments.length} assigned tailors</h2></div><span>Order advances after all complete</span></div><div className="tailor-progress-grid">{phaseAssignments.map(item => { const workerUpdates = phaseUpdates.filter(update => update.user.id === item.user.id); const latest = workerUpdates[0]; const workerStatus = current > stages.indexOf("STITCHING") ? "COMPLETED" : latest?.status || "QUEUED"; return <article key={item.user.id}><div className="tailor-progress-head"><span>{item.user.name.slice(0, 1).toUpperCase()}</span><div><b>{item.user.name}</b><small>{workerUpdates.length} updates</small></div><em className={`order-status ${workerStatus.toLowerCase()}`}>{workerStatus.replaceAll("_", " ")}</em></div>{latest ? <p>{latest.comment || `Last updated ${new Date(latest.createdAt).toLocaleString("en-IN")}`}</p> : <p>No progress update yet.</p>}</article>; })}</div></section> : null}
      {open === currentStage ? <OrderStatusUpdate orderId={orderId} currentStatus={open === "STITCHING" ? actorUpdate?.status || "CREATED" : status} currentStage={currentStage} eta={open === "STITCHING" ? actorUpdate?.eta || eta : eta} updates={visibleUpdates} canUpdate={canUpdate} completionLabel={open === "STITCHING" ? "Completed — my stitching is done" : undefined} /> : <section className="phase-status-panel"><div className="section-heading"><div><p className="eyebrow">Phase status</p><h2>{labels[open]}</h2></div><span className={`order-status ${phaseStatus.toLowerCase()}`}>{phaseStatus.replaceAll("_", " ")}</span></div><div className="status-history"><h3>Update history</h3>{phaseUpdates.length ? phaseUpdates.map((update) => <article key={update.id}><div><b>{update.status.replaceAll("_", " ")}</b><span>{update.user.name} · {new Date(update.createdAt).toLocaleString("en-IN")}</span></div>{update.eta ? <small>ETA: {new Date(update.eta).toLocaleString("en-IN")}</small> : null}{update.comment ? <p>{update.comment}</p> : null}</article>) : <p className="muted">No updates recorded for this phase.</p>}</div></section>}
      {open === "QUALITY_CHECK" && (canManage || canInspectQc) ? <QcInspection orderId={orderId} inspection={qcInspection} canInspect={canInspectQc} designs={designs} tailors={assignments.filter(item => item.stage === "STITCHING").map(item => ({ id: item.user.id, name: item.user.name }))} /> : null}
      {open === "STITCHING" ? <>{canManage ? <ManagerCostApproval orderId={orderId} costs={phaseCosts} /> : null}{actorCosts.length ? <LaborCostForm orderId={orderId} stage={open} entries={actorCosts.map(({ user: _user, stage: _stage, userId: _userId, ...entry }) => entry)} canAdd={canUpdate} /> : !canManage && (open === currentStage || phaseCosts.length > 0) ? <LaborCostForm orderId={orderId} stage={open} entries={[]} canAdd={canUpdate} /> : null}</> : null}
    </div></div> : null}
  </section>;
}
