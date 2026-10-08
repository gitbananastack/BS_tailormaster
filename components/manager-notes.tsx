"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Note = { id: string; stage: string; message: string; createdAt: string; author: { name: string } };
const labels: Record<string, string> = { CUTTING: "Cutting", FUSING: "Fusing", STITCHING: "Stitching", QUALITY_CHECK: "Quality check", PACKING: "Packing", DELIVERY: "Delivery" };

export function ManagerNotes({ orderId, currentStage, notes, canManage }: { orderId: string; currentStage: string; notes: Note[]; canManage: boolean }) {
  const router = useRouter(); const [stage, setStage] = useState(currentStage); const [message, setMessage] = useState(""); const [feedback, setFeedback] = useState(""); const [saving, setSaving] = useState(false);
  async function send() { setSaving(true); setFeedback(""); const response = await fetch(`/api/orders/${orderId}/manager-notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage, message }) }); const body = await response.json(); if (response.ok) { setMessage(""); setFeedback("Instruction sent to the selected worker."); router.refresh(); } else setFeedback(body.error || "Unable to send instruction."); setSaving(false); }
  return <section className="detail-section manager-notes"><div className="section-heading"><div><p className="eyebrow">Manager instructions</p><h2>{canManage ? "Send a note to a worker" : "Instructions for your stage"}</h2></div></div>{canManage ? <div className="manager-note-form"><label>Send to stage<select value={stage} onChange={(event) => setStage(event.target.value)}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="manager-note-message">Instruction / note<textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={2} placeholder="Write the instruction for this worker…" /></label><div><p aria-live="polite">{feedback}</p><button className="primary" type="button" onClick={send} disabled={saving || !message.trim()}>{saving ? "Sending…" : "Send instruction"}</button></div></div> : null}<div className="manager-note-list">{notes.length ? notes.map((note) => <article key={note.id}><span>{labels[note.stage]}</span><p>{note.message}</p><small>From {note.author.name} · {new Date(note.createdAt).toLocaleString("en-IN")}</small></article>) : <p className="muted">No manager instructions for your assigned stage.</p>}</div></section>;
}
