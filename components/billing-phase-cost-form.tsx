"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function BillingPhaseCostForm({ orderId, stage, worker }: { orderId: string; stage: string; worker: { id: string; name: string } | null }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!worker || !amount) return;
    setSaving(true); setMessage("");
    try {
      const response = await fetch(`/api/orders/${orderId}/labor-costs`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage, userId: worker.id, amount, note }) });
      const text = await response.text();
      let body: { error?: string } = {};
      if (text) { try { body = JSON.parse(text); } catch { body = {}; } }
      if (!response.ok) { setMessage(body.error || `Unable to save amount (server returned ${response.status}).`); return; }
      setMessage("Amount sent to worker for acceptance."); setAmount(""); setNote(""); router.refresh();
    } catch { setMessage("Unable to contact the application. Please try again."); }
    finally { setSaving(false); }
  }

  return <div className="billing-proposal-form"><b>{worker ? `Set amount for ${worker.name}` : "Assign a worker before setting a cost"}</b><input type="number" min="0.01" step="0.01" placeholder="Amount ₹" value={amount} onChange={(event) => setAmount(event.target.value)} /><input placeholder="Note (optional)" value={note} onChange={(event) => setNote(event.target.value)} /><button className="primary" disabled={!worker || !amount || saving} onClick={submit}>{saving ? "Sending…" : "Send for acceptance"}</button>{message ? <small aria-live="polite">{message}</small> : null}</div>;
}
