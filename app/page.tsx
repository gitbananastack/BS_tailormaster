import { ProductionCharts } from "@/components/production-charts";
import { hasAnyRole, hasRole, hasScreenAccess, userRoles } from "@/lib/roles";
import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { MobileNav } from "@/components/mobile-nav";
import { LogoutButton } from "@/components/logout-button";
import { SidebarProfile } from "@/components/sidebar-profile";

const roleLabels: Record<string, string> = { ADMIN: "Administrator", ORDER_MANAGER: "Order manager", CUTTING_OPERATOR: "Cutting operator", FUSING_OPERATOR: "Fusing operator", TAILOR: "Tailor", QC_INSPECTOR: "QC inspector", PACKING_STAFF: "Packing staff", DELIVERY_COORDINATOR: "Delivery coordinator" };

const pipeline = ["CUTTING", "FUSING", "STITCHING", "QUALITY_CHECK", "PACKING", "DELIVERY"] as const;
const stageLabels: Record<(typeof pipeline)[number], string> = { CUTTING: "Cutting", FUSING: "Fusing", STITCHING: "Stitching", QUALITY_CHECK: "QC", PACKING: "Packing", DELIVERY: "Delivery" };

export default async function Home() {
  const freshCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dashboardCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const user = await currentUser();
  if (!user) redirect("/login");
  const canManage = hasAnyRole(user, ["ADMIN", "ORDER_MANAGER"]);
  const canViewProductivity = hasScreenAccess(user, "PRODUCTIVITY");
  const assignments = await prisma.orderAssignment.findMany({ where: { userId: user.id }, select: { orderId: true, stage: true } });
  const orderCount = await prisma.order.count({ where: { createdAt: { gte: dashboardCutoff } } });
  const [stageGroups, statusGroups, quantities, activeBatches, completedBatches, workCandidates, pendingBills, reworkCount] = await Promise.all([
    prisma.order.groupBy({ by: ["currentStage"], where: { createdAt: { gte: dashboardCutoff }, status: { in: ["CREATED", "IN_PROGRESS", "ON_HOLD"] } }, _count: true }),
    prisma.order.groupBy({ by: ["status"], where: { createdAt: { gte: dashboardCutoff } }, _count: true }),
    prisma.orderSizeQuantity.aggregate({ where: { orderItem: { order: { createdAt: { gte: dashboardCutoff } } } }, _sum: { quantity: true } }),
    prisma.productionBatch.count({ where: { order: { createdAt: { gte: dashboardCutoff } }, status: { in: ["CREATED", "IN_PROGRESS", "ON_HOLD"] } } }),
    prisma.productionBatch.count({ where: { order: { createdAt: { gte: dashboardCutoff } }, status: "COMPLETED" } }),
    prisma.order.findMany({ where: { createdAt: { gte: dashboardCutoff }, id: { in: assignments.map((assignment) => assignment.orderId) }, status: { in: ["CREATED", "IN_PROGRESS", "ON_HOLD"] } }, include: { qcInspection: { select: { result: true, reworkStage: true, reworkTailorIds: true } }, statusUpdates: { where: { status: "COMPLETED" }, orderBy: { createdAt: "desc" }, take: 1 } } }),
    canManage ? prisma.clientInvoice.count({ where: { issueDate: { gte: dashboardCutoff }, status: { in: ["DRAFT", "ISSUED"] } } }) : Promise.resolve(0),
    prisma.qcInspection.count({ where: { result: "REWORK_REQUIRED", updatedAt: { gte: dashboardCutoff } } }),
  ]);
  const myWork = workCandidates.filter((order) => { const selected = order.qcInspection?.result === "REWORK_REQUIRED" && order.qcInspection.reworkStage === "STITCHING" && Array.isArray(order.qcInspection.reworkTailorIds) ? order.qcInspection.reworkTailorIds.filter((item): item is string => typeof item === "string") : []; return assignments.some((assignment) => assignment.orderId === order.id && assignment.stage === order.currentStage) && (!selected.length || selected.includes(user.id)); });
  const newWork = myWork.filter((order) => order.createdAt >= freshCutoff || order.statusUpdates.some((update) => update.createdAt >= freshCutoff));
  const garmentsReceived = quantities._sum.quantity || 0;
  const onHoldCount = statusGroups.find(group => group.status === "ON_HOLD")?._count || 0;
  return (
    <main className="shell dashboard-shell">
      <aside className="sidebar">
        <div className="brand"><span>SF</span><div>StitchFlow<small>Production control</small></div></div>
        <nav aria-label="Main navigation">
          <a className="active" href="#dashboard">Dashboard</a>
          <a href="/orders">Orders</a>
          <a href="/my-work">My work bucket</a>
          <a href="/scan">Scan QR</a>
          {canManage ? <a href="/admin/stitching">Stitching status</a> : null}
          {canViewProductivity ? <a href="/admin/productivity">Productivity</a> : null}
          {canManage ? <a href="/admin/client-billing">Client billing</a> : null}
          {canManage ? <a href="/admin/reports">Reports</a> : null}
          {hasRole(user, "ADMIN") ? <a href="/admin/users">Administration</a> : null}
          {hasRole(user, "ADMIN") ? <a href="/admin/company">Company details</a> : null}
          {hasRole(user, "ADMIN") ? <a href="/admin/monitoring">System monitoring</a> : null}
        </nav>
        <div className="sidebar-footer"><SidebarProfile name={user.name} username={user.email} phone={user.phone} roles={userRoles(user).map(role => roleLabels[role])} /><LogoutButton /></div>
      </aside>
      <section className="content" id="dashboard">
        <header><div><p className="eyebrow">{new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata" }).format(new Date())}</p><h1>Production overview</h1><p className="muted">Rolling 30-day production and billing activity.</p></div>{canManage ? <a className="primary" href="/orders/new">+ Create order</a> : null}</header>
        <section className="metrics" aria-label="Today’s production metrics">
          <article><p>Job orders</p><b>{orderCount}</b><small>Received in last 30 days</small></article>
          <article><p>Active batches</p><b>{activeBatches}</b><small>Ready or in production</small></article>
          <article><p>Completed batches</p><b>{completedBatches}</b><small>Completed for recent orders</small></article>
          <article><p>Garments received</p><b>{garmentsReceived}</b><small>Received in last 30 days</small></article>
          {canManage ? <a className={`billing-metric${pendingBills ? " has-pending" : ""}`} href="/admin/client-billing"><p>Pending bills</p><b>{pendingBills}</b><small>{pendingBills ? "Draft or awaiting payment →" : "No pending client bills"}</small></a> : null}
        </section><MobileNav active="dashboard" role={user.role} />
        <ProductionCharts stages={pipeline.map((stage, index) => ({ label: stageLabels[stage], count: stageGroups.find(group => group.currentStage === stage)?._count || 0, color: ["#398c79", "#c08b47", "#5778c5", "#b18bdb", "#e7ad50", "#48a5ac"][index] }))} statuses={[{ key: "CREATED", label: "Received", color: "#a2b8c5" }, { key: "IN_PROGRESS", label: "In progress", color: "#398c79" }, { key: "ON_HOLD", label: "On hold", color: "#e7ad50" }, { key: "COMPLETED", label: "Completed", color: "#5778c5" }, { key: "CANCELLED", label: "Cancelled", color: "#d48282" }].map(item => ({ ...item, count: statusGroups.find(group => group.status === item.key)?._count || 0 }))} />
        <section className="dashboard-focus"><a className={`my-work-visual${newWork.length ? " has-new-work" : ""}`} href="/my-work"><span className="focus-art" aria-hidden="true"><i>✓</i><b>{myWork.length}</b></span><div><p className="eyebrow">Your production queue</p><h2>My work bucket</h2><span>{myWork.length ? `${myWork.length} jobs waiting · ${newWork.length} new handoffs` : "You have no work waiting right now"}</span><strong>Open my work →</strong></div></a><div className="dashboard-action-grid"><a href="/scan"><i className="action-icon scan-icon" aria-hidden="true">▣</i><div><b>Scan QR</b><span>Open a job instantly</span></div><strong>→</strong></a>{canViewProductivity ? <a href="/admin/productivity"><i className="action-icon productivity-icon" aria-hidden="true">▥</i><div><b>Productivity</b><span>Trends and team output</span></div><strong>→</strong></a> : null}{canManage ? <a href="/admin/client-billing"><i className="action-icon billing-icon" aria-hidden="true">₹</i><div><b>Billing</b><span>{pendingBills} pending bills</span></div><strong>→</strong></a> : null}{canManage ? <a href="/admin/reports"><i className="action-icon reports-icon" aria-hidden="true">◫</i><div><b>Reports</b><span>Orders, payments and tailors</span></div><strong>→</strong></a> : null}</div></section>
        <section className="dashboard-signals" aria-label="Operational attention"><article className={onHoldCount ? "needs-attention" : "healthy"}><span className="signal-icon" aria-hidden="true">Ⅱ</span><div><small>On hold</small><b>{onHoldCount}</b><p>{onHoldCount ? "Needs manager attention" : "Production is flowing"}</p></div></article><article className={reworkCount ? "needs-attention" : "healthy"}><span className="signal-icon" aria-hidden="true">↻</span><div><small>QC rework</small><b>{reworkCount}</b><p>{reworkCount ? "Review corrective work" : "No recent rework"}</p></div></article><article className="healthy"><span className="signal-icon" aria-hidden="true">◆</span><div><small>Completion</small><b>{completedBatches}</b><p>Completed in the 30-day view</p></div></article></section>
      </section>
    </main>
  );
}
