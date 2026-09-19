"use client";

import { useMemo, useState } from "react";

const sizes = [38, 40, 42, 44, 46, 48, 50];
const blankMaterial = () => ({ itemCode: "", itemName: "", color: "", panna: "", quantity: "", unit: "m" });

export function OrderIntakeForm() {
  const [sizeQuantities, setSizeQuantities] = useState<Record<number, string>>({ 38: "", 40: "", 42: "", 44: "", 46: "", 48: "", 50: "" });
  const [materials, setMaterials] = useState([blankMaterial()]);
  const [message, setMessage] = useState<string | null>(null);
  const total = useMemo(() => Object.values(sizeQuantities).reduce((sum, quantity) => sum + (Number(quantity) || 0), 0), [sizeQuantities]);

  async function submit(formData: FormData) {
    setMessage(null);
    const payload = {
      customer: { name: String(formData.get("customerName") || ""), phone: String(formData.get("phone") || ""), address: String(formData.get("address") || "") },
      orderNumber: String(formData.get("orderNumber") || ""), issueNumber: String(formData.get("issueNumber") || ""), processName: String(formData.get("processName") || ""), salesOrderNumber: String(formData.get("salesOrderNumber") || ""), productionManager: String(formData.get("productionManager") || ""), receivedDate: String(formData.get("receivedDate") || ""), inwardValue: formData.get("inwardValue") ? Number(formData.get("inwardValue")) : undefined, garmentName: String(formData.get("garmentName") || ""), color: String(formData.get("color") || ""), clientOrderReference: String(formData.get("clientOrderReference") || ""),
      sizeQuantities: sizes.map((size) => ({ size, quantity: Number(sizeQuantities[size]) || 0 })),
      rawMaterials: materials.filter((item) => item.itemName.trim()).map((item) => ({ ...item, panna: item.panna ? Number(item.panna) : undefined, quantity: Number(item.quantity) || 0 })),
    };
    const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const body = await response.json();
    if (response.ok) window.location.assign(`/orders/${body.id}/label`);
    else setMessage(body.error || "Unable to save order.");
  }

  return <form action={submit} className="intake-form">
    <section><div className="form-heading"><div><p className="eyebrow">Client document</p><h1>Create job order</h1></div><a href="/" className="text-button">← Back to dashboard</a></div>
      <div className="form-grid"><label>Client name<input name="customerName" required placeholder="e.g. Abdul Rehman M. Mulla" /></label><label>Contact number<input name="phone" inputMode="tel" /></label><label className="wide">Address<textarea name="address" rows={2} /></label></div>
    </section>
    <section><h2>Job order details</h2><div className="form-grid"><label>Job order no.<input name="orderNumber" required placeholder="e.g. JOS47513" /></label><label>Issue no.<input name="issueNumber" placeholder="e.g. RME 46327" /></label><label>Process name<input name="processName" required defaultValue="Cut to Pack" /></label><label>Sales order no.<input name="salesOrderNumber" placeholder="e.g. HSO 8436" /></label><label>Production manager<input name="productionManager" /></label><label>Date received<input name="receivedDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label><label>Inward value<input name="inwardValue" type="number" min="0" step="0.01" placeholder="e.g. 11817.00" /></label></div></section>
    <section><div className="section-heading"><div><p className="eyebrow">Finish</p><h2>Finished garment quantities</h2></div><b className="quantity-total">Total: {total}</b></div><div className="form-grid item-details"><label>Item name<input name="garmentName" required placeholder="e.g. RADO 34" /></label><label>Color<input name="color" placeholder="e.g. 34" /></label><label>Client order ref.<input name="clientOrderReference" /></label></div><div className="size-grid">{sizes.map((size) => <label key={size}>Size {size}<input type="number" min="0" value={sizeQuantities[size]} onChange={(event) => setSizeQuantities({ ...sizeQuantities, [size]: event.target.value })} /></label>)}</div></section>
    <section><div className="section-heading"><div><p className="eyebrow">Raw</p><h2>Raw-material inward</h2></div><button type="button" className="text-button" onClick={() => setMaterials([...materials, blankMaterial()])}>+ Add material</button></div><div className="materials">{materials.map((item, index) => <div className="material-row" key={index}><input aria-label="Item code" placeholder="Item code" value={item.itemCode} onChange={(event) => { const next = [...materials]; next[index].itemCode = event.target.value; setMaterials(next); }} /><input aria-label="Item name" placeholder="Item name" value={item.itemName} onChange={(event) => { const next = [...materials]; next[index].itemName = event.target.value; setMaterials(next); }} /><input aria-label="Color" placeholder="Color" value={item.color} onChange={(event) => { const next = [...materials]; next[index].color = event.target.value; setMaterials(next); }} /><input aria-label="Panna" placeholder="Panna" type="number" min="0" step="0.01" value={item.panna} onChange={(event) => { const next = [...materials]; next[index].panna = event.target.value; setMaterials(next); }} /><input aria-label="Quantity" placeholder="Quantity" type="number" min="0" step="0.01" value={item.quantity} onChange={(event) => { const next = [...materials]; next[index].quantity = event.target.value; setMaterials(next); }} /><input aria-label="Unit" placeholder="Unit" value={item.unit} onChange={(event) => { const next = [...materials]; next[index].unit = event.target.value; setMaterials(next); }} /></div>)}</div></section>
    <div className="form-actions"><p aria-live="polite">{message}</p><button className="primary" type="submit">Save job order</button></div>
  </form>;
}
