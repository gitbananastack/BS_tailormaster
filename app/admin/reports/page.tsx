import { currentUser } from "@/lib/current-user";
import { hasAnyRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { monthRange, money } from "@/lib/reporting";
import { redirect } from "next/navigation";

export default async function ReportsPage() {
  const actor = await currentUser();
  if (!actor || !hasAnyRole(actor, ["ADMIN", "ORDER_MANAGER"])) redirect("/login");
  const current = monthRange();
  const [orders, bills] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: current.from, lt: current.to } } }),
    prisma.laborCostEntry.aggregate({ where: { stage: "STITCHING", createdAt: { gte: current.from, lt: current.to } }, _sum: { amount: true }, _count: { _all: true } }),
  ]);
  return <main className="reports-shell"><header className="reports-header"><div><a className="back-link" href="/">← Dashboard</a><p className="eyebrow">Business intelligence</p><h1>Reports</h1><p>Compare monthly performance, inspect payment status, and download detailed Excel workbooks.</p></div><span>{current.label}</span></header><section className="report-module-grid"><a href="/admin/reports/orders"><span className="report-module-icon">▤</span><div><p className="eyebrow">Sales &amp; operations</p><h2>Orders and payments</h2><p>Current versus previous month, custom periods, order details, invoice values, and payment status.</p></div><aside><b>{orders}</b><small>orders this month</small><strong>Open report →</strong></aside></a><a href="/admin/reports/tailors"><span className="report-module-icon">₹</span><div><p className="eyebrow">Workforce costs</p><h2>Tailor billing</h2><p>Review proposed and accepted tailor amounts by current month, previous month, or custom dates.</p></div><aside><b>{money(Number(bills._sum.amount || 0))}</b><small>{bills._count._all} billing entries</small><strong>Open report →</strong></aside></a></section></main>;
}
