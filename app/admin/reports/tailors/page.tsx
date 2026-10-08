import { ReportPeriodForm } from "@/components/report-period-form";
import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { hasAnyRole } from "@/lib/roles";
import { dateWhere, money, monthRange, percentChange, reportQuery, reportRange, type ReportSearchParams } from "@/lib/reporting";
import { redirect } from "next/navigation";

const signed = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;

export default async function TailorReportsPage({ searchParams }: { searchParams: Promise<ReportSearchParams> }) {
  const actor = await currentUser();
  if (!actor || !hasAnyRole(actor, ["ADMIN", "ORDER_MANAGER"])) redirect("/login");
  const params = await searchParams;
  const range = reportRange(params), current = monthRange(), previous = monthRange(-1);
  const include = { user: { select: { name: true } }, order: { select: { id: true, orderNumber: true, garmentName: true, customer: { select: { name: true } }, items: { select: { designCode: true } } } } };
  const [entries, currentEntries, previousEntries] = await Promise.all([
    prisma.laborCostEntry.findMany({ where: { stage: "STITCHING", createdAt: dateWhere(range) }, include, orderBy: { createdAt: "desc" } }),
    prisma.laborCostEntry.findMany({ where: { stage: "STITCHING", createdAt: dateWhere(current) }, include }),
    prisma.laborCostEntry.findMany({ where: { stage: "STITCHING", createdAt: dateWhere(previous) }, include }),
  ]);
  const summarize = (rows: typeof entries) => ({ entries: rows.length, proposed: rows.reduce((sum, row) => sum + Number(row.amount), 0), accepted: rows.filter(row => row.isAccepted).reduce((sum, row) => sum + Number(row.amount), 0), tailors: new Set(rows.map(row => row.userId)).size });
  const selected = summarize(entries), currentSummary = summarize(currentEntries), previousSummary = summarize(previousEntries);
  const change = percentChange(currentSummary.accepted, previousSummary.accepted);
  const query = reportQuery(range);
  return <main className="report-detail-shell"><header className="report-detail-header"><div><a className="back-link" href="/admin/reports">← Reports</a><p className="eyebrow">Tailor billing report</p><h1>Tailor billing and acceptance</h1><p>Review every Stitching amount proposed to a tailor and its acceptance status.</p></div><span>{range.label}</span></header><ReportPeriodForm action="/admin/reports/tailors" period={range.period} from={"fromText" in range ? range.fromText : undefined} to={"toText" in range ? range.toText : undefined} exportHref={`/api/reports/tailors/export?${query}`} /><section className="tailor-comparison"><div><p className="eyebrow">Accepted tailor billing</p><h2>{previous.label} vs {current.label}</h2></div><article><small>Previous month<b>{money(previousSummary.accepted)}</b></small><i>→</i><small>Current month<b>{money(currentSummary.accepted)}</b></small><strong className={change < 0 ? "negative" : "positive"}>{signed(change)}</strong></article></section><section className="report-summary"><article><span>Tailors in selection</span><b>{selected.tailors}</b></article><article><span>Billing entries</span><b>{selected.entries}</b></article><article><span>Proposed amount</span><b>{money(selected.proposed)}</b></article><article><span>Accepted amount</span><b>{money(selected.accepted)}</b></article></section><section className="report-table-card"><div className="report-table-heading"><div><p className="eyebrow">Tailor billing details</p><h2>{range.label}</h2></div><span>{entries.length} records</span></div><div className="report-table-scroll"><table><thead><tr><th>Date</th><th>Tailor</th><th>Order</th><th>Design number</th><th>Client</th><th>Garment</th><th>Amount</th><th>Billing status</th><th>Note</th></tr></thead><tbody>{entries.map(entry => <tr key={entry.id}><td>{entry.createdAt.toLocaleDateString("en-IN")}</td><td><b>{entry.user.name}</b></td><td><a href={`/orders/${entry.order.id}/billing`}>{entry.order.orderNumber}</a></td><td>{entry.order.items.map(item => item.designCode).filter(Boolean).join(" · ") || "—"}</td><td>{entry.order.customer.name}</td><td>{entry.order.garmentName}</td><td><b>{money(Number(entry.amount))}</b></td><td><span className={`payment-badge ${entry.isAccepted ? "paid" : "issued"}`}>{entry.isAccepted ? "Accepted" : "Pending acceptance"}</span></td><td>{entry.responseNote || entry.note || "—"}</td></tr>)}</tbody></table>{!entries.length ? <p className="report-empty">No tailor billing entries were created during this period.</p> : null}</div></section></main>;
}
