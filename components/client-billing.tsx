"use client";

import { SearchFilters } from "@/components/search-filters";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type OrderItem = { designCode: string | null; id: string; itemName: string; sizeQuantities: { quantity: number }[] };
type Order = { id: string; orderNumber: string; garmentName: string; customer: { name: string; phone: string | null; address: string | null }; items: OrderItem[] };
type Invoice = { id: string; invoiceNumber: string; shareToken: string; amount: string; status: string; issueDate: string; dueDate: string | null; clientName: string | null; clientPhone: string | null; clientAddress?: string | null; clientGstin: string | null; gstPercent?: string; gstAmount?: string; notes?: string | null; lineItems?: unknown; order: { id: string; orderNumber: string; garmentName: string; customer: { name: string; phone: string | null } } };
type BillingLine = { key: string; description: string; quantity: string; rate: string; source: "design" | "custom" };

const money = (value: number) => value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const orderLines = (order?: Order): BillingLine[] => order?.items.map((item) => ({ key: item.id, description: item.designCode?.trim() || item.itemName, quantity: String(item.sizeQuantities.reduce((sum, size) => sum + size.quantity, 0) || 1), rate: "", source: "design" })) || [];
const savedLines = (invoice?: Invoice): BillingLine[] => Array.isArray(invoice?.lineItems) ? invoice.lineItems.flatMap((item, index) => item && typeof item === "object" && "description" in item && "quantity" in item && "rate" in item ? [{ key: `saved-${index}`, description: String(item.description), quantity: String(item.quantity), rate: String(item.rate), source: "custom" as const }] : []) : [];

export function ClientBilling({ orders, initialInvoices, mode = "list", editingInvoice, publicBaseUrl }: { orders: Order[]; initialInvoices: Invoice[]; mode?: "list" | "create"; editingInvoice?: Invoice; publicBaseUrl?: string }) {
  const router = useRouter();
  const [invoices, setInvoices] = useState(initialInvoices);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [invoicePage, setInvoicePage] = useState(1);
  const filteredInvoices = invoices.filter(invoice => (!filters.q || [invoice.invoiceNumber, invoice.order.orderNumber, invoice.order.garmentName, invoice.clientName || invoice.order.customer.name, invoice.clientGstin || ""].join(" ").toLowerCase().includes(filters.q.trim().toLowerCase())) && (!filters.orderId || invoice.order.id === filters.orderId) && (!filters.status || invoice.status === filters.status));
  const invoicePages = Math.max(1, Math.ceil(filteredInvoices.length / 5));
  const currentPage = Math.min(invoicePage, invoicePages);
  const initialOrder = orders.find(order => order.id === editingInvoice?.order.id) || orders[0];
  const [orderId, setOrderId] = useState(initialOrder?.id || "");
  const [orderQuery, setOrderQuery] = useState(initialOrder?.orderNumber || "");
  const [orderMenuOpen, setOrderMenuOpen] = useState(false);
  const [lines, setLines] = useState<BillingLine[]>(editingInvoice ? savedLines(editingInvoice) : orderLines(initialOrder));
  const [gstPercent, setGstPercent] = useState(editingInvoice?.gstPercent || "0");
  const [gstAmount, setGstAmount] = useState(editingInvoice?.gstAmount || "0.00");
  const [notes, setNotes] = useState(editingInvoice?.notes || "");
  const [dueDate, setDueDate] = useState(editingInvoice?.dueDate?.slice(0, 10) || "");
  const [clientName, setClientName] = useState(editingInvoice?.clientName || initialOrder?.customer.name || "");
  const [clientPhone, setClientPhone] = useState(editingInvoice?.clientPhone || initialOrder?.customer.phone || "");
  const [clientAddress, setClientAddress] = useState(editingInvoice?.clientAddress || initialOrder?.customer.address || "");
  const [clientGstin, setClientGstin] = useState(editingInvoice?.clientGstin || "");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [updatingInvoice, setUpdatingInvoice] = useState<string | null>(null);
  const selectedOrder = useMemo(() => orders.find((order) => order.id === orderId), [orders, orderId]);
  const matchingOrders = useMemo(() => {
    const query = orderQuery.trim().toLowerCase();
    return orders.filter((order) => !query || [order.orderNumber, order.customer.name, order.garmentName].join(" ").toLowerCase().includes(query)).slice(0, 12);
  }, [orders, orderQuery]);
  const quantity = selectedOrder?.items.flatMap((item) => item.sizeQuantities).reduce((sum, size) => sum + size.quantity, 0) || 0;
  const subtotal = lines.reduce((sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.rate) || 0), 0);
  const total = subtotal + (Number(gstAmount) || 0);

  function selectOrder(nextId: string) { const next = orders.find((order) => order.id === nextId); setOrderId(nextId); setOrderQuery(next?.orderNumber || ""); setOrderMenuOpen(false); setLines(orderLines(next)); setGstAmount("0.00"); setGstPercent("0"); setClientName(next?.customer.name || ""); setClientPhone(next?.customer.phone || ""); setClientAddress(next?.customer.address || ""); setClientGstin(""); }
  function searchOrder(value: string) { setOrderQuery(value); setOrderMenuOpen(true); if (value !== selectedOrder?.orderNumber) { setOrderId(""); setLines([]); setClientName(""); setClientPhone(""); setClientAddress(""); setClientGstin(""); } }
  function updateLine(key: string, field: "description" | "quantity" | "rate", value: string) { setLines((current) => current.map((line) => line.key === key ? { ...line, [field]: value } : line)); }
  function addCustomLine() { setLines((current) => [...current, { key: crypto.randomUUID(), description: "", quantity: "1", rate: "", source: "custom" }]); }
  function removeLine(key: string) { setLines((current) => current.filter((line) => line.key !== key)); }
  function changeGstPercent(value: string) { setGstPercent(value); setGstAmount(((subtotal * (Number(value) || 0)) / 100).toFixed(2)); }

  async function createInvoice(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage("");
    const payloadLines = lines.filter((line) => line.description.trim()).map((line) => ({ description: line.description.trim(), quantity: Number(line.quantity), rate: Number(line.rate) }));
    const response = await fetch(editingInvoice ? `/api/client-invoices/${editingInvoice.id}` : "/api/client-invoices", { method: editingInvoice ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, clientName, clientPhone, clientAddress, clientGstin, lineItems: payloadLines, gstPercent, gstAmount, notes, dueDate }) });
    const text = await response.text(); let body: Invoice & { error?: string };
    try { body = JSON.parse(text); } catch { body = { error: "The server returned an invalid response." } as Invoice & { error?: string }; }
    if (response.ok) { if (editingInvoice) { router.push("/admin/client-billing"); router.refresh(); return; } setInvoices((current) => [body, ...current]); setLines(orderLines(selectedOrder)); setGstPercent("0"); setGstAmount("0.00"); setNotes(""); setDueDate(""); setMessage("Invoice created. It is ready to download or share."); router.refresh(); } else setMessage(body.error || `Unable to ${editingInvoice ? "update" : "create"} invoice.`);
    setSaving(false);
  }

  function pdfUrl(invoice: Invoice) { return `${(publicBaseUrl || window.location.origin).replace(/\/$/, "")}/api/client-invoices/public/${encodeURIComponent(invoice.shareToken)}/pdf`; }
  function shareWhatsApp(invoice: Invoice) { const phone = (invoice.clientPhone || invoice.order.customer.phone)?.replace(/\D/g, "") || ""; const text = `Hello ${invoice.clientName || invoice.order.customer.name}, invoice ${invoice.invoiceNumber} for job order ${invoice.order.orderNumber} is ready. Amount: INR ${Number(invoice.amount).toFixed(2)}. Download PDF: ${pdfUrl(invoice)}`; window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer"); }
  async function copyLink(invoice: Invoice) {
    const url = pdfUrl(invoice);
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(url);
      else {
        const field = document.createElement("textarea");
        field.value = url; field.readOnly = true; field.style.position = "fixed"; field.style.opacity = "0";
        document.body.appendChild(field); field.select();
        const copied = document.execCommand("copy"); document.body.removeChild(field);
        if (!copied) throw new Error("Copy command was rejected");
      }
      setMessage("Invoice PDF link copied.");
    } catch {
      setMessage(`Copy was blocked by this browser. Open the PDF and copy this URL: ${url}`);
    }
  }
  async function updateStatus(invoiceId: string, status: string) {
    setUpdatingInvoice(invoiceId); setMessage("");
    const response = await fetch(`/api/client-invoices/${invoiceId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    const text = await response.text(); let body: { error?: string } = {};
    try { body = text ? JSON.parse(text) : {}; } catch { body = { error: "The server returned an invalid response." }; }
    if (response.ok) { setInvoices((current) => current.map((invoice) => invoice.id === invoiceId ? { ...invoice, status } : invoice)); setMessage(`Invoice marked as ${status.toLowerCase().replace("_", " ")}.`); router.refresh(); }
    else setMessage(body.error || "Unable to update invoice status.");
    setUpdatingInvoice(null);
  }

  return <div className={`client-billing-layout billing-${mode}-mode`}><section className="invoice-create-card"><div className="invoice-card-title"><div><p className="eyebrow">{editingInvoice ? "Edit client invoice" : "New client invoice"}</p><h2>{editingInvoice ? `Update ${editingInvoice.invoiceNumber}` : "Prepare a standard invoice"}</h2><p className="muted">Designs are loaded from the selected job order. Add rates, GST, or custom charges.</p></div><span>ITEMIZED</span></div><form onSubmit={createInvoice}><div className="order-combobox"><label htmlFor="billing-order-search">Job order</label><div className="order-combobox-control"><span aria-hidden="true">⌕</span><input id="billing-order-search" type="search" role="combobox" aria-expanded={orderMenuOpen} aria-controls="billing-order-options" aria-autocomplete="list" autoComplete="off" value={orderQuery} onChange={(event) => searchOrder(event.target.value)} onFocus={() => setOrderMenuOpen(true)} onBlur={() => window.setTimeout(() => setOrderMenuOpen(false), 150)} placeholder="Type order number or client name" /><button type="button" aria-label="Show job orders" onClick={() => setOrderMenuOpen((open) => !open)}>⌄</button></div>{orderMenuOpen ? <div className="order-combobox-options" id="billing-order-options" role="listbox">{matchingOrders.map((order) => <button type="button" role="option" aria-selected={order.id === orderId} key={order.id} onMouseDown={(event) => event.preventDefault()} onClick={() => selectOrder(order.id)}><span><b>{order.orderNumber}</b><small>{order.customer.name}</small></span><em>{order.garmentName}</em>{order.id === orderId ? <i>✓</i> : null}</button>)}{!matchingOrders.length ? <p>No matching job orders found.</p> : null}</div> : null}<small className="order-search-help">Search by job order number, client, or garment.</small></div>
{selectedOrder ? <section className="client-detail-preview"><div className="client-preview-heading"><div><p className="eyebrow">Bill to preview</p><h3>Client details</h3></div><span>Edit before generating</span></div><div className="client-preview-fields"><label>Client name<input required value={clientName} onChange={(event) => setClientName(event.target.value)} /></label><label>WhatsApp / phone<input value={clientPhone} onChange={(event) => setClientPhone(event.target.value)} placeholder="Client contact number" /></label><label className="client-address-field">Billing address<textarea rows={2} value={clientAddress} onChange={(event) => setClientAddress(event.target.value)} placeholder="Client billing address" /></label><label>Client GSTIN<input value={clientGstin} onChange={(event) => setClientGstin(event.target.value.toUpperCase())} maxLength={30} placeholder="e.g. 29ABCDE1234F1Z5" /></label><div className="client-order-summary"><span>Job order</span><b>{selectedOrder.orderNumber}</b><span>Total pieces</span><b>{quantity}</b></div></div></section> : null}<div className="billing-lines"><div className="billing-lines-head"><div><b>Invoice items</b><small>Enter the rate for each design number</small></div><button type="button" onClick={addCustomLine}>＋ Custom item</button></div><div className="billing-table-header"><span>Design number</span><span>Qty</span><span>Rate</span><span>Amount</span><span /></div>{lines.map((line) => <div className="billing-line" key={line.key}><label><span>Description</span><input required value={line.description} readOnly={line.source === "design"} onChange={(event) => updateLine(line.key, "description", event.target.value)} placeholder="Charge description" /></label><label><span>Qty</span><input required type="number" min="0.01" step="0.01" value={line.quantity} onChange={(event) => updateLine(line.key, "quantity", event.target.value)} /></label><label><span>Rate ₹</span><input required type="number" min="0" step="0.01" value={line.rate} onChange={(event) => updateLine(line.key, "rate", event.target.value)} placeholder="0.00" /></label><strong>₹{money((Number(line.quantity) || 0) * (Number(line.rate) || 0))}</strong><button className="remove-line" type="button" aria-label="Remove billing item" onClick={() => removeLine(line.key)}>×</button></div>)}{!lines.length ? <div className="billing-empty">No designs in this order. Add a custom billing item.</div> : null}</div><div className="invoice-bottom-grid"><div className="invoice-fields"><label>Due date <small>Optional</small><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label><label>Notes <small>Optional</small><textarea rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Payment terms or a note for the client" /></label></div><div className="invoice-totals"><div><span>Subtotal</span><b>₹{money(subtotal)}</b></div><label><span>GST rate (%)</span><input type="number" min="0" max="100" step="0.01" value={gstPercent} onChange={(event) => changeGstPercent(event.target.value)} /></label><label><span>GST amount (₹) <small>editable</small></span><input type="number" min="0" step="0.01" value={gstAmount} onChange={(event) => setGstAmount(event.target.value)} /></label><div className="grand-total"><span>Grand total</span><b>₹{money(total)}</b></div></div></div><div className="invoice-submit"><p aria-live="polite">{message}</p><button className="primary" disabled={saving || !orderId || !clientName.trim() || !lines.length || total <= 0}>{saving ? "Saving…" : editingInvoice ? "Save bill changes" : "Create invoice PDF"}</button></div></form></section><section className="invoice-history"><div className="section-heading"><div><p className="eyebrow">Client billing</p><h2>Generated invoices</h2></div><b>{invoices.filter((invoice) => ["DRAFT", "ISSUED"].includes(invoice.status)).length} pending</b></div><p className="billing-status-help">Managers and administrators can keep each bill updated from draft through payment.</p><SearchFilters values={filters} placeholder="Invoice or customer" fields={[{ name: "orderId", label: "Job order", searchable: true, options: orders.map(order => ({ value: order.id, label: order.orderNumber })) }, { name: "status", label: "Status", options: [{ value: "DRAFT", label: "Draft" }, { value: "ISSUED", label: "Issued / pending" }, { value: "PAID", label: "Paid" }, { value: "CANCELLED", label: "Cancelled" }] }]} onApply={values => { setFilters(values); setInvoicePage(1); }} /><div className="invoice-list">{filteredInvoices.slice((currentPage - 1) * 5, currentPage * 5).map((invoice) => <article key={invoice.id}><div className="invoice-number"><span>{invoice.invoiceNumber}</span><b>{invoice.clientName || invoice.order.customer.name}</b><small>{invoice.order.orderNumber}{invoice.clientGstin ? ` · GSTIN ${invoice.clientGstin}` : ""} · {new Date(invoice.issueDate).toLocaleDateString("en-IN")}</small></div><strong>₹{Number(invoice.amount).toFixed(2)}</strong><label className={`invoice-status-select ${invoice.status.toLowerCase()}`}><span>Status</span><select aria-label={`Status for ${invoice.invoiceNumber}`} value={invoice.status} disabled={updatingInvoice === invoice.id} onChange={(event) => updateStatus(invoice.id, event.target.value)}><option value="DRAFT">Draft</option><option value="ISSUED">Issued / pending</option><option value="PAID">Paid</option><option value="CANCELLED">Cancelled</option></select></label><div className="invoice-actions"><a href={`/admin/client-billing/${invoice.id}/edit`}>Edit bill</a><a href={`/api/client-invoices/public/${invoice.shareToken}/pdf`} target="_blank" rel="noreferrer">View PDF</a><button type="button" onClick={() => void copyLink(invoice)}>Copy link</button><button className="whatsapp-invoice" disabled={!(invoice.clientPhone || invoice.order.customer.phone) || invoice.status === "CANCELLED"} onClick={() => shareWhatsApp(invoice)}>Share WhatsApp</button></div></article>)}{!filteredInvoices.length ? <div className="empty-invoices">No invoices match these filters.</div> : null}</div><nav className="pagination" aria-label="Invoice pages"><span>{filteredInvoices.length} invoices · Page {currentPage} of {invoicePages}</span><div><button disabled={currentPage === 1} onClick={() => setInvoicePage(currentPage - 1)}>← Previous</button><button disabled={currentPage === invoicePages} onClick={() => setInvoicePage(currentPage + 1)}>Next →</button></div></nav></section></div>;
}
