"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type OrderItem = { id: string; itemName: string; sizeQuantities: { quantity: number }[] };
type Order = { id: string; orderNumber: string; garmentName: string; customer: { name: string; phone: string | null }; items: OrderItem[] };
type Invoice = { id: string; invoiceNumber: string; shareToken: string; amount: string; status: string; issueDate: string; dueDate: string | null; order: { orderNumber: string; garmentName: string; customer: { name: string; phone: string | null } } };
type BillingLine = { key: string; description: string; quantity: string; rate: string; source: "design" | "custom" };

const money = (value: number) => value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const orderLines = (order?: Order): BillingLine[] => order?.items.map((item) => ({ key: item.id, description: item.itemName, quantity: String(item.sizeQuantities.reduce((sum, size) => sum + size.quantity, 0) || 1), rate: "", source: "design" })) || [];

export function ClientBilling({ orders, initialInvoices }: { orders: Order[]; initialInvoices: Invoice[] }) {
  const router = useRouter();
  const [invoices, setInvoices] = useState(initialInvoices);
  const [orderId, setOrderId] = useState(orders[0]?.id || "");
  const [lines, setLines] = useState<BillingLine[]>(orderLines(orders[0]));
  const [gstPercent, setGstPercent] = useState("0");
  const [gstAmount, setGstAmount] = useState("0.00");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [updatingInvoice, setUpdatingInvoice] = useState<string | null>(null);
  const selectedOrder = useMemo(() => orders.find((order) => order.id === orderId), [orders, orderId]);
  const quantity = selectedOrder?.items.flatMap((item) => item.sizeQuantities).reduce((sum, size) => sum + size.quantity, 0) || 0;
  const subtotal = lines.reduce((sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.rate) || 0), 0);
  const total = subtotal + (Number(gstAmount) || 0);

  function selectOrder(nextId: string) { const next = orders.find((order) => order.id === nextId); setOrderId(nextId); setLines(orderLines(next)); setGstAmount("0.00"); setGstPercent("0"); }
  function updateLine(key: string, field: "description" | "quantity" | "rate", value: string) { setLines((current) => current.map((line) => line.key === key ? { ...line, [field]: value } : line)); }
  function addCustomLine() { setLines((current) => [...current, { key: crypto.randomUUID(), description: "", quantity: "1", rate: "", source: "custom" }]); }
  function removeLine(key: string) { setLines((current) => current.filter((line) => line.key !== key)); }
  function changeGstPercent(value: string) { setGstPercent(value); setGstAmount(((subtotal * (Number(value) || 0)) / 100).toFixed(2)); }

  async function createInvoice(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage("");
    const payloadLines = lines.filter((line) => line.description.trim()).map((line) => ({ description: line.description.trim(), quantity: Number(line.quantity), rate: Number(line.rate) }));
    const response = await fetch("/api/client-invoices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, lineItems: payloadLines, gstPercent, gstAmount, notes, dueDate }) });
    const text = await response.text(); let body: Invoice & { error?: string };
    try { body = JSON.parse(text); } catch { body = { error: "The server returned an invalid response." } as Invoice & { error?: string }; }
    if (response.ok) { setInvoices((current) => [body, ...current]); setLines(orderLines(selectedOrder)); setGstPercent("0"); setGstAmount("0.00"); setNotes(""); setDueDate(""); setMessage("Invoice created. It is ready to download or share."); router.refresh(); } else setMessage(body.error || "Unable to create invoice.");
    setSaving(false);
  }

  function pdfUrl(invoice: Invoice) { return `${window.location.origin}/api/client-invoices/public/${encodeURIComponent(invoice.shareToken)}/pdf`; }
  function shareWhatsApp(invoice: Invoice) { const phone = invoice.order.customer.phone?.replace(/\D/g, "") || ""; const text = `Hello ${invoice.order.customer.name}, invoice ${invoice.invoiceNumber} for job order ${invoice.order.orderNumber} is ready. Amount: INR ${Number(invoice.amount).toFixed(2)}. Download PDF: ${pdfUrl(invoice)}`; window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer"); }
  async function copyLink(invoice: Invoice) { await navigator.clipboard.writeText(pdfUrl(invoice)); setMessage("Invoice PDF link copied."); }
  async function updateStatus(invoiceId: string, status: string) {
    setUpdatingInvoice(invoiceId); setMessage("");
    const response = await fetch(`/api/client-invoices/${invoiceId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    const text = await response.text(); let body: { error?: string } = {};
    try { body = text ? JSON.parse(text) : {}; } catch { body = { error: "The server returned an invalid response." }; }
    if (response.ok) { setInvoices((current) => current.map((invoice) => invoice.id === invoiceId ? { ...invoice, status } : invoice)); setMessage(`Invoice marked as ${status.toLowerCase().replace("_", " ")}.`); router.refresh(); }
    else setMessage(body.error || "Unable to update invoice status.");
    setUpdatingInvoice(null);
  }

  return <div className="client-billing-layout"><section className="invoice-create-card"><div className="invoice-card-title"><div><p className="eyebrow">New client invoice</p><h2>Prepare a standard invoice</h2><p className="muted">Designs are loaded from the selected job order. Add rates, GST, or custom charges.</p></div><span>ITEMIZED</span></div><form onSubmit={createInvoice}><label>Job order<select required value={orderId} onChange={(event) => selectOrder(event.target.value)}>{orders.map((order) => <option key={order.id} value={order.id}>{order.orderNumber} · {order.customer.name} · {order.garmentName}</option>)}</select></label>{selectedOrder ? <div className="selected-invoice-order"><div><span>Customer</span><b>{selectedOrder.customer.name}</b></div><div><span>Total pieces</span><b>{quantity}</b></div><div><span>WhatsApp</span><b>{selectedOrder.customer.phone || "Not available"}</b></div></div> : null}<div className="billing-lines"><div className="billing-lines-head"><div><b>Invoice items</b><small>Enter the rate for each design code</small></div><button type="button" onClick={addCustomLine}>＋ Custom item</button></div><div className="billing-table-header"><span>Description / design code</span><span>Qty</span><span>Rate</span><span>Amount</span><span /></div>{lines.map((line) => <div className="billing-line" key={line.key}><label><span>Description</span><input required value={line.description} readOnly={line.source === "design"} onChange={(event) => updateLine(line.key, "description", event.target.value)} placeholder="Charge description" /></label><label><span>Qty</span><input required type="number" min="0.01" step="0.01" value={line.quantity} onChange={(event) => updateLine(line.key, "quantity", event.target.value)} /></label><label><span>Rate ₹</span><input required type="number" min="0" step="0.01" value={line.rate} onChange={(event) => updateLine(line.key, "rate", event.target.value)} placeholder="0.00" /></label><strong>₹{money((Number(line.quantity) || 0) * (Number(line.rate) || 0))}</strong><button className="remove-line" type="button" aria-label="Remove billing item" onClick={() => removeLine(line.key)}>×</button></div>)}{!lines.length ? <div className="billing-empty">No designs in this order. Add a custom billing item.</div> : null}</div><div className="invoice-bottom-grid"><div className="invoice-fields"><label>Due date <small>Optional</small><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label><label>Notes <small>Optional</small><textarea rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Payment terms or a note for the client" /></label></div><div className="invoice-totals"><div><span>Subtotal</span><b>₹{money(subtotal)}</b></div><label><span>GST rate (%)</span><input type="number" min="0" max="100" step="0.01" value={gstPercent} onChange={(event) => changeGstPercent(event.target.value)} /></label><label><span>GST amount (₹) <small>editable</small></span><input type="number" min="0" step="0.01" value={gstAmount} onChange={(event) => setGstAmount(event.target.value)} /></label><div className="grand-total"><span>Grand total</span><b>₹{money(total)}</b></div></div></div><div className="invoice-submit"><p aria-live="polite">{message}</p><button className="primary" disabled={saving || !orderId || !lines.length || total <= 0}>{saving ? "Generating…" : "Create invoice PDF"}</button></div></form></section><section className="invoice-history"><div className="section-heading"><div><p className="eyebrow">Client billing</p><h2>Generated invoices</h2></div><b>{invoices.filter((invoice) => ["DRAFT", "ISSUED"].includes(invoice.status)).length} pending</b></div><p className="billing-status-help">Managers and administrators can keep each bill updated from draft through payment.</p><div className="invoice-list">{invoices.map((invoice) => <article key={invoice.id}><div className="invoice-number"><span>{invoice.invoiceNumber}</span><b>{invoice.order.customer.name}</b><small>{invoice.order.orderNumber} · {new Date(invoice.issueDate).toLocaleDateString("en-IN")}</small></div><strong>₹{Number(invoice.amount).toFixed(2)}</strong><label className={`invoice-status-select ${invoice.status.toLowerCase()}`}><span>Status</span><select aria-label={`Status for ${invoice.invoiceNumber}`} value={invoice.status} disabled={updatingInvoice === invoice.id} onChange={(event) => updateStatus(invoice.id, event.target.value)}><option value="DRAFT">Draft</option><option value="ISSUED">Issued / pending</option><option value="PAID">Paid</option><option value="CANCELLED">Cancelled</option></select></label><div className="invoice-actions"><a href={`/api/client-invoices/public/${invoice.shareToken}/pdf`} target="_blank" rel="noreferrer">View PDF</a><button onClick={() => copyLink(invoice)}>Copy link</button><button className="whatsapp-invoice" disabled={!invoice.order.customer.phone || invoice.status === "CANCELLED"} onClick={() => shareWhatsApp(invoice)}>Share WhatsApp</button></div></article>)}{!invoices.length ? <div className="empty-invoices">No client invoices have been created yet.</div> : null}</div></section></div>;
}
