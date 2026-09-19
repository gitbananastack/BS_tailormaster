"use client";

import { LaborCostForm } from "@/components/labor-cost-form";
import { ManagerCostApproval } from "@/components/manager-cost-approval";
import { OrderStatusUpdate } from "@/components/order-status-update";
import { QcInspection, type Inspection } from "@/components/qc-inspection";
import { useState } from "react";

const stages = ["CUTTING", "STITCHING", "QUALITY_CHECK", "PACKING", "DELIVERY"] as const;
const labels: Record<string, string> = { CUTTING: "Cutting", STITCHING: "Stitching", QUALITY_CHECK: "Quality check", PACKING: "Packing", DELIVERY: "Delivery" };
type Assignment = { stage: string; user: { name: string; role: string; phone?: string | null } };
type Update = { id: string; status: string; stage: string; comment: string | null; eta: string | null; createdAt: string; user: { name: string } };
type Cost = { id: string; stage: string; amount: string; note: string | null; isAccepted: boolean; responseNote: string | null; createdAt: string; user: { name: string } };
type ManagerContact = { name: string; phone: string | null } | null;
type Props = { orderId: string; orderNumber: string; currentStage: string; status: string; eta: string | null; assignments: Assignment[]; updates: Update[]; costs: Cost[]; canUpdate: boolean; canManage: boolean; managerContact: ManagerContact; qcInspection: Inspection; canInspectQc: boolean };

export function InteractivePipeline({ orderId, orderNumber, currentStage, status, eta, assignments, updates, costs, canUpdate, canManage, managerContact, qcInspection, canInspectQc }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const current = stages.indexOf(currentStage as typeof stages[number]);
  const assignment = assignments.find((item) => item.stage === open);
  const phaseIndex = open ? stages.indexOf(open as typeof stages[number]) : -1;
  const phaseUpdates = open ? updates.filter((update) => update.stage === open) : [];
  const phaseCosts = open ? costs.filter((cost) => cost.stage === open) : [];
  const phaseStatus = open === currentStage ? status : phaseIndex < current ? "COMPLETED" : "PENDING";
  const whatsappContact = canManage ? assignment?.user || null : managerContact;
  const whatsappNumber = whatsappContact?.phone?.replace(/\D/g, "");
  const whatsappHref = whatsappNumber ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hello ${whatsappContact?.name}, regarding job order ${orderNumber} — ${open ? labels[open] : labels[currentStage]} phase.`)}` : null;

  return <section className="interactive-pipeline">
    <div className="pipeline-title"><div><p className="eyebrow">Production pipeline</p><h2>Current: {labels[currentStage]}</h2></div><span className={`order-status ${status.toLowerCase()}`}>{status.replaceAll("_", " ")}</span></div>
    <div className="phase-buttons">{stages.map((stage, index) => { const item = assignments.find((entry) => entry.stage === stage); return <button type="button" key={stage} className={index < current ? "done" : index === current ? "current" : ""} onClick={() => setOpen(stage)}><i>{index < current ? "✓" : index + 1}</i><b>{labels[stage]}</b><small>{item?.user.name || "Not assigned"}</small></button>; })}</div>
    {open ? <div className="phase-modal" role="dialog" aria-modal="true" aria-label={`${labels[open]} phase details`} onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(null); }}><div className="phase-sheet">
      <button className="close-phase" type="button" onClick={() => setOpen(null)} aria-label="Close phase details">×</button>
      <div className="phase-worker"><div><p className="eyebrow">{labels[open]} phase</p><h2>{assignment?.user.name || "No worker assigned"}</h2><p className="muted">{assignment?.user.role?.replaceAll("_", " ") || "Assign a worker from Production ownership."}</p></div>{whatsappHref ? <a className="whatsapp-phase" href={whatsappHref} target="_blank" rel="noreferrer">WhatsApp {canManage ? "worker" : "manager"}</a> : null}</div>
      {open === currentStage ? <OrderStatusUpdate orderId={orderId} currentStatus={status} currentStage={currentStage} eta={eta} updates={phaseUpdates} canUpdate={canUpdate} /> : <section className="phase-status-panel"><div className="section-heading"><div><p className="eyebrow">Phase status</p><h2>{labels[open]}</h2></div><span className={`order-status ${phaseStatus.toLowerCase()}`}>{phaseStatus.replaceAll("_", " ")}</span></div><div className="status-history"><h3>Update history</h3>{phaseUpdates.length ? phaseUpdates.map((update) => <article key={update.id}><div><b>{update.status.replaceAll("_", " ")}</b><span>{update.user.name} · {new Date(update.createdAt).toLocaleString("en-IN")}</span></div>{update.eta ? <small>ETA: {new Date(update.eta).toLocaleString("en-IN")}</small> : null}{update.comment ? <p>{update.comment}</p> : null}</article>) : <p className="muted">No updates recorded for this phase.</p>}</div></section>}
      {open === "QUALITY_CHECK" && (canManage || canInspectQc) ? <QcInspection orderId={orderId} inspection={qcInspection} canInspect={canInspectQc} /> : null}
      {canManage ? <ManagerCostApproval orderId={orderId} costs={phaseCosts} /> : open === currentStage || phaseCosts.length > 0 ? <LaborCostForm orderId={orderId} stage={open} entries={phaseCosts.map(({ user: _user, stage: _stage, ...entry }) => entry)} canAdd={canUpdate} /> : null}
    </div></div> : null}
  </section>;
}
