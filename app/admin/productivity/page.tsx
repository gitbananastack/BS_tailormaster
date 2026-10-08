import { Pagination } from "@/components/pagination";
import { ProductivityYearCharts } from "@/components/productivity-year-chart";
import { SearchFilters } from "@/components/search-filters";
import { currentUser } from "@/lib/current-user";
import { filterValues, ListParams, pageNumber } from "@/lib/list-filters";
import { prisma } from "@/lib/prisma";
import { hasAnyRole, hasScreenAccess, userRoles } from "@/lib/roles";
import { redirect } from "next/navigation";

const workerRoles = ["CUTTING_OPERATOR", "FUSING_OPERATOR", "TAILOR", "QC_INSPECTOR", "PACKING_STAFF", "DELIVERY_COORDINATOR"] as const;
const roleLabels: Record<string, string> = { CUTTING_OPERATOR: "Cutting", FUSING_OPERATOR: "Fusing", TAILOR: "Tailor", QC_INSPECTOR: "QC", PACKING_STAFF: "Packing", DELIVERY_COORDINATOR: "Delivery" };
const stageLabels: Record<string, string> = { CUTTING: "Cutting", FUSING: "Fusing", STITCHING: "Stitching", QUALITY_CHECK: "QC", PACKING: "Packing", DELIVERY: "Delivery" };
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type ProductivityParams = ListParams & { year?: string };

export default async function ProductivityPage({ searchParams }: { searchParams: Promise<ProductivityParams> }) {
  const params = await searchParams;
  const filters = filterValues(params);
  const actor = await currentUser();
  if (!actor) redirect("/login");
  if (!hasScreenAccess(actor, "PRODUCTIVITY")) redirect("/");

  const now = new Date();
  const currentYear = now.getFullYear();
  const requestedYear = Number(params.year);
  const year = requestedYear === currentYear - 1 ? currentYear - 1 : currentYear;
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);
  const recentStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const openStatuses = ["CREATED", "IN_PROGRESS", "ON_HOLD"] as const;

  const [workers, recentOrders, yearlyOrders, paidInvoices, costs, stageGroups, reworkCount] = await Promise.all([
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true, role: true, roles: true }, orderBy: { name: "asc" } }),
    prisma.order.findMany({ where: { OR: [{ status: { in: [...openStatuses] } }, { createdAt: { gte: recentStart } }, { statusUpdates: { some: { createdAt: { gte: recentStart } } } }] }, include: { items: { include: { sizeQuantities: true } }, assignments: true, statusUpdates: { orderBy: { createdAt: "asc" } } } }),
    prisma.order.findMany({ where: { createdAt: { gte: yearStart, lt: yearEnd } }, select: { createdAt: true } }),
    prisma.clientInvoice.findMany({ where: { status: "PAID", issueDate: { gte: yearStart, lt: yearEnd } }, select: { issueDate: true, amount: true } }),
    prisma.laborCostEntry.findMany({ where: { stage: "STITCHING", createdAt: { gte: recentStart } }, select: { userId: true, amount: true, isAccepted: true } }),
    prisma.order.groupBy({ by: ["currentStage"], where: { status: { in: [...openStatuses] } }, _count: { _all: true } }),
    prisma.qcInspection.count({ where: { result: "REWORK_REQUIRED", updatedAt: { gte: recentStart } } }),
  ]);

  const rows = workers.filter(worker => hasAnyRole(worker, workerRoles)).map(worker => {
    const active = recentOrders.filter(order => openStatuses.includes(order.status as typeof openStatuses[number]) && order.assignments.some(assignment => assignment.userId === worker.id && assignment.stage === order.currentStage));
    const completions = recentOrders.flatMap(order => order.statusUpdates.filter(update => update.userId === worker.id && update.status === "COMPLETED" && update.createdAt >= recentStart).map(update => ({ order, update })));
    const completedPieces = completions.reduce((sum, item) => sum + item.order.items.flatMap(line => line.sizeQuantities).reduce((qty, line) => qty + line.quantity, 0), 0);
    const durations = completions.map(({ order, update }) => { const start = order.statusUpdates.find(candidate => candidate.stage === update.stage && candidate.status === "IN_PROGRESS" && candidate.createdAt <= update.createdAt); return start ? update.createdAt.getTime() - start.createdAt.getTime() : null; }).filter((value): value is number => value !== null);
    const workerCosts = costs.filter(cost => cost.userId === worker.id);
    return { ...worker, active: active.length, completedJobs: completions.length, completedPieces, averageHours: durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length / 3600000 : null, approved: workerCosts.filter(cost => cost.isAccepted).reduce((sum, cost) => sum + Number(cost.amount), 0) };
  });

  const monthly = months.map((label, month) => ({ label, orders: yearlyOrders.filter(order => order.createdAt.getMonth() === month).length, payments: paidInvoices.filter(invoice => invoice.issueDate.getMonth() === month).reduce((sum, invoice) => sum + Number(invoice.amount), 0) }));
  const recentCreatedOrders = recentOrders.filter(order => order.createdAt >= recentStart);
  const completedOrders = recentCreatedOrders.filter(order => order.status === "COMPLETED").length;
  const overdueOrders = recentOrders.filter(order => order.dueDate && order.dueDate < now && !["COMPLETED", "CANCELLED"].includes(order.status)).length;
  const onHoldOrders = recentOrders.filter(order => order.status === "ON_HOLD").length;
  const completionRate = recentCreatedOrders.length ? Math.round(completedOrders / recentCreatedOrders.length * 100) : 0;
  const totalActive = rows.reduce((sum, row) => sum + row.active, 0);
  const totalPieces = rows.reduce((sum, row) => sum + row.completedPieces, 0);
  const totalApproved = rows.reduce((sum, row) => sum + row.approved, 0);
  const busiestStage = [...stageGroups].sort((a, b) => b._count._all - a._count._all)[0];
  const topWorker = [...rows].sort((a, b) => b.completedPieces - a.completedPieces)[0];
  const filteredRows = rows.filter(row => (!filters.q || row.name.toLowerCase().includes(filters.q.toLowerCase())) && (!filters.role || userRoles(row).some(role => role === filters.role)));
  const pages = Math.max(1, Math.ceil(filteredRows.length / 8));
  const page = pageNumber(params.page, filteredRows.length, 8);

  return <main className="productivity-shell"><header className="productivity-header"><div><a className="back-link" href="/">← Dashboard</a><p className="eyebrow">Productivity monitoring</p><h1>Operations productivity</h1><p className="muted">Monitor output, workload, delays, quality rework, orders, and payments.</p></div><div className="productivity-header-actions"><a className="text-button" href="/orders">View orders</a>{hasAnyRole(actor, ["ADMIN"]) ? <a className="primary" href="/admin/users">Manage access</a> : null}</div></header>
    <nav className="productivity-tabs" aria-label="Productivity sections"><a className="active" href="#overview">Overview</a><a href="#annual-trend">Annual trend</a><a href="#monitoring">Monitoring</a><a href="#team">Team performance</a></nav>
    <section className="productivity-summary" id="overview"><article><span>Active assignments</span><b>{totalActive}</b><small>Current worker workload</small></article><article><span>Completed pieces</span><b>{totalPieces}</b><small>Last 30 days</small></article><article><span>Completion rate</span><b>{completionRate}%</b><small>{completedOrders} completed orders</small></article><article><span>Accepted earnings</span><b>₹{totalApproved.toFixed(2)}</b><small>Last 30 days</small></article></section>
    <section className="year-filter" id="annual-trend"><div><p className="eyebrow">Chart period</p><b>Choose activity year</b></div><div><a className={year === currentYear ? "active" : ""} href={`/admin/productivity?year=${currentYear}`}>{currentYear}</a><a className={year === currentYear - 1 ? "active" : ""} href={`/admin/productivity?year=${currentYear - 1}`}>{currentYear - 1}</a></div></section>
    <ProductivityYearCharts year={year} points={monthly} />
    <section className="monitoring-section" id="monitoring"><div className="productivity-title"><div><p className="eyebrow">Attention required</p><h2>Productivity monitoring</h2></div><span>Operational signals updated from live order data</span></div><div className="monitoring-grid"><article className={overdueOrders ? "warning" : "good"}><span>Overdue orders</span><b>{overdueOrders}</b><small>{overdueOrders ? "Review due dates and unblock work" : "No active orders are overdue"}</small></article><article className={onHoldOrders ? "warning" : "good"}><span>Orders on hold</span><b>{onHoldOrders}</b><small>{onHoldOrders ? "Follow up on hold reasons" : "No orders are currently on hold"}</small></article><article className={reworkCount ? "warning" : "good"}><span>QC rework</span><b>{reworkCount}</b><small>Rework decisions in the last 30 days</small></article><article><span>Largest open queue</span><b>{busiestStage?._count._all || 0}</b><small>{busiestStage ? `${stageLabels[busiestStage.currentStage]} needs the most attention` : "No open production queue"}</small></article></div><div className="improvement-grid"><article><i>1</i><div><b>Balance the workflow</b><p>{busiestStage ? `Move available staff toward ${stageLabels[busiestStage.currentStage]} where ${busiestStage._count._all} orders are waiting.` : "The production pipeline currently has no open work."}</p></div></article><article><i>2</i><div><b>Protect due dates</b><p>{overdueOrders ? `Prioritize the ${overdueOrders} overdue order${overdueOrders === 1 ? "" : "s"} before assigning new work.` : "Due-date performance is healthy; continue reviewing upcoming commitments daily."}</p></div></article><article><i>3</i><div><b>Reduce rework</b><p>{reworkCount ? `Review comments on ${reworkCount} QC rework case${reworkCount === 1 ? "" : "s"} and share repeated defects with tailors.` : "No recent QC rework is waiting for corrective action."}</p></div></article><article><i>4</i><div><b>Recognize output</b><p>{topWorker?.completedPieces ? `${topWorker.name} completed the highest recent output at ${topWorker.completedPieces} pieces.` : "Completion data will identify the strongest output as work is closed."}</p></div></article></div></section>
    <section id="team"><SearchFilters action="/admin/productivity" values={{ ...filters, year: String(year) }} placeholder="Worker name" fields={[{ name: "role", label: "Role", options: Object.entries(roleLabels).map(([value, label]) => ({ value, label })) }]} /><p className="result-count">{filteredRows.length} matching workers · performance for last 30 days</p><section className="productivity-table"><div className="productivity-title"><div><p className="eyebrow">Current team</p><h2>Individual performance</h2></div><span>Average turnaround uses In progress → Completed stage updates</span></div><div className="productivity-head"><span>Worker</span><span>Pending jobs</span><span>Completed jobs</span><span>Completed pieces</span><span>Avg. stage time</span><span>Accepted earnings</span></div>{filteredRows.slice((page - 1) * 8, page * 8).map(row => <article key={row.id}><div><b>{row.name}</b><small>{userRoles(row).map(role => roleLabels[role] || role.replaceAll("_", " ")).join(" · ")}</small></div><b>{row.active}</b><b>{row.completedJobs}</b><b>{row.completedPieces}</b><b>{row.averageHours === null ? "—" : `${row.averageHours.toFixed(1)} hr`}</b><b className="approved-earnings">₹{row.approved.toFixed(2)}</b></article>)}</section>{!filteredRows.length && <p className="filter-empty">No workers match these filters.</p>}<Pagination page={page} pages={pages} total={filteredRows.length} basePath="/admin/productivity" filters={{ ...filters, year: String(year) }} /></section>
  </main>;
}
