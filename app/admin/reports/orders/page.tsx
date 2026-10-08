import { ReportPeriodForm } from "@/components/report-period-form";
import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { hasAnyRole } from "@/lib/roles";
import { dateWhere, money, monthRange, percentChange, reportQuery, reportRange, type ReportSearchParams } from "@/lib/reporting";
import { redirect } from "next/navigation";

const paymentLabel: Record<string, string> = { DRAFT: "Draft", ISSUED: "Payment pending", PAID: "Paid", CANCELLED: "Cancelled" };
const signed = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;

export default async function OrderReportsPage({ searchParams }: { searchParams: Promise<ReportSearchParams> }) {
  const actor = await currentUser();
  if (!actor || !hasAnyRole(actor, ["ADMIN", "ORDER_MANAGER"])) redirect("/login");
  const params = await searchParams;
  const range = reportRange(params);
  const current = monthRange();
  const previous = monthRange(-1);
  const include = { customer: { select: { name: true } }, items: { select: { designCode: true, sizeQuantities: { select: { quantity: true } } } }, clientInvoices: { orderBy: { issueDate: "desc" as const }, select: { invoiceNumber: true, amount: true, status: true }, take: 1 } };
  const [orders, currentOrders, previousOrders] = await Promise.all([
    prisma.order.findMany({ where: { createdAt: dateWhere(range) }, include, orderBy: { createdAt: "desc" } }),
    prisma.order.findMany({ where: { createdAt: dateWhere(current) }, include, orderBy: { createdAt: "desc" } }),
    prisma.order.findMany({ where: { createdAt: dateWhere(previous) }, include, orderBy: { createdAt: "desc" } }),
  ]);
  const summarize = (rows: typeof orders) => ({ count: rows.length, pieces: rows.reduce((sum, order) => sum + order.items.flatMap(item => item.sizeQuantities).reduce((qty, size) => qty + size.quantity, 0), 0), billed: rows.reduce((sum, order) => sum + Number(order.clientInvoices[0]?.amount || 0), 0), paid: rows.filter(order => order.clientInvoices[0]?.status === "PAID").reduce((sum, order) => sum + Number(order.clientInvoices[0]?.amount || 0), 0) });
  const selectedSummary = summarize(orders), currentSummary = summarize(currentOrders), previousSummary = summarize(previousOrders);
  const query = reportQuery(range);
  return <main className="report-detail-shell"><header className="report-detail-header"><div><a className="back-link" href="/admin/reports">← Reports</a><p className="eyebrow">Orders report</p><h1>Orders and payment status</h1><p>View monthly order movement and reconcile client billing.</p></div><span>{range.label}</span></header><ReportPeriodForm action="/admin/reports/orders" period={range.period} from={"fromText" in range ? range.fromText : undefined} to={"toText" in range ? range.toText : undefined} exportHref={`/api/reports/orders/export?${query}`} /><section className="comparison-panel"><div className="comparison-heading"><div><p className="eyebrow">Month comparison</p><h2>{previous.label} vs {current.label}</h2></div><small>Comparison always uses full calendar months</small></div><div className="comparison-grid"><Comparison label="Orders" previous={previousSummary.count} current={currentSummary.count} format={String} /><Comparison label="Garments" previous={previousSummary.pieces} current={currentSummary.pieces} format={String} /><Comparison label="Billed value" previous={previousSummary.billed} current={currentSummary.billed} format={money} /><Comparison label="Paid value" previous={previousSummary.paid} current={currentSummary.paid} format={money} /></div></section><section className="report-summary"><article><span>Orders in selection</span><b>{selectedSummary.count}</b></article><article><span>Total garments</span><b>{selectedSummary.pieces}</b></article><article><span>Invoice value</span><b>{money(selectedSummary.billed)}</b></article><article><span>Paid amount</span><b>{money(selectedSummary.paid)}</b></article></section><section className="report-table-card"><div className="report-table-heading"><div><p className="eyebrow">Order details</p><h2>{range.label}</h2></div><span>{orders.length} records</span></div><div className="report-table-scroll"><table><thead><tr><th>Date</th><th>Order</th><th>Design number</th><th>Client</th><th>Pieces</th><th>Stage</th><th>Order status</th><th>Invoice</th><th>Amount</th><th>Payment</th></tr></thead><tbody>{orders.map(order => { const invoice = order.clientInvoices[0]; const quantity = order.items.flatMap(item => item.sizeQuantities).reduce((sum, size) => sum + size.quantity, 0); return <tr key={order.id}><td>{order.createdAt.toLocaleDateString("en-IN")}</td><td><a href={`/orders/${order.id}`}>{order.orderNumber}</a></td><td>{order.items.map(item => item.designCode).filter(Boolean).join(" · ") || "—"}</td><td>{order.customer.name}</td><td>{quantity}</td><td>{order.currentStage.replaceAll("_", " ")}</td><td><span className={`report-badge ${order.status.toLowerCase()}`}>{order.status.replaceAll("_", " ")}</span></td><td>{invoice?.invoiceNumber || "Not billed"}</td><td>{invoice ? money(Number(invoice.amount)) : "—"}</td><td><span className={`payment-badge ${(invoice?.status || "unbilled").toLowerCase()}`}>{invoice ? paymentLabel[invoice.status] : "Not billed"}</span></td></tr>; })}</tbody></table>{!orders.length ? <p className="report-empty">No orders were created during this period.</p> : null}</div></section></main>;
}

function Comparison({ label, previous, current, format }: { label: string; previous: number; current: number; format: (value: number) => string }) {
  const change = percentChange(current, previous);
  const max = Math.max(previous, current, 1);
  const icon: Record<string, string> = { Orders: "▤", Garments: "♢", "Billed value": "₹", "Paid value": "✓" };
  return <article className="comparison-chart-card"><header><span className="comparison-icon" aria-hidden="true">{icon[label]}</span><div><span>{label}</span><strong className={change < 0 ? "negative" : "positive"}>{signed(change)}</strong></div></header><div className="comparison-bars" role="img" aria-label={`${label}: previous month ${format(previous)}, current month ${format(current)}`}><div><label>Previous</label><span><i className="previous-bar" style={{ width: `${previous / max * 100}%` }} /></span><b>{format(previous)}</b></div><div><label>Current</label><span><i className="current-bar" style={{ width: `${current / max * 100}%` }} /></span><b>{format(current)}</b></div></div></article>;
}
