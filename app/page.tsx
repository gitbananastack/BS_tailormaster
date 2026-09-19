import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { MobileNav } from "@/components/mobile-nav";
import { LogoutButton } from "@/components/logout-button";

const roleLabels: Record<string, string> = { ADMIN: "Administrator", ORDER_MANAGER: "Order manager", CUTTING_OPERATOR: "Cutting operator", TAILOR: "Tailor", QC_INSPECTOR: "QC inspector", PACKING_STAFF: "Packing staff", DELIVERY_COORDINATOR: "Delivery coordinator" };
const freshCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
const pipeline = ["CUTTING", "STITCHING", "QUALITY_CHECK", "PACKING", "DELIVERY"] as const;
const stageLabels: Record<(typeof pipeline)[number], string> = { CUTTING: "Cutting", STITCHING: "Stitching", QUALITY_CHECK: "QC", PACKING: "Packing", DELIVERY: "Delivery" };

export default async function Home() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const canManage = ["ADMIN", "ORDER_MANAGER"].includes(user.role);
  const assignments = await prisma.orderAssignment.findMany({ where: { userId: user.id }, select: { orderId: true, stage: true } });
  const [orders, orderCount, activeBatches, completedBatches, workCandidates] = await Promise.all([
    prisma.order.findMany({ take: 3, orderBy: { createdAt: "desc" }, include: { customer: true, items: { include: { sizeQuantities: true } } } }),
    prisma.order.count(),
    prisma.productionBatch.count({ where: { status: { in: ["CREATED", "IN_PROGRESS", "ON_HOLD"] } } }),
    prisma.productionBatch.count({ where: { status: "COMPLETED" } }),
    prisma.order.findMany({ where: { id: { in: assignments.map((assignment) => assignment.orderId) }, status: { in: ["CREATED", "IN_PROGRESS", "ON_HOLD"] } }, include: { statusUpdates: { where: { status: "COMPLETED" }, orderBy: { createdAt: "desc" }, take: 1 } } }),
  ]);
  const myWork = workCandidates.filter((order) => assignments.some((assignment) => assignment.orderId === order.id && assignment.stage === order.currentStage));
  const newWork = myWork.filter((order) => order.createdAt >= freshCutoff || order.statusUpdates.some((update) => update.createdAt >= freshCutoff));
  const garmentsReceived = orders.flatMap((order) => order.items.flatMap((item) => item.sizeQuantities)).reduce((sum, size) => sum + size.quantity, 0);
  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><span>SF</span><div>StitchFlow<small>Production control</small></div></div>
        <nav aria-label="Main navigation">
          <a className="active" href="#dashboard">Dashboard</a>
          <a href="/orders">Orders</a>
          <a href="/my-work">My work bucket</a>
          <a href="/scan">Scan QR</a>
          {canManage ? <a href="/admin/productivity">Productivity</a> : null}
          {canManage ? <a href="#reports">Reports</a> : null}
          {user.role === "ADMIN" ? <a href="/admin/users">Administration</a> : null}
          {user.role === "ADMIN" ? <a href="/admin/monitoring">System monitoring</a> : null}
        </nav>
        <div className="sidebar-footer"><div className="profile"><b>{user.name}</b><small>{roleLabels[user.role]}</small></div><LogoutButton /></div>
      </aside>
      <section className="content" id="dashboard">
        <header><div><p className="eyebrow">Monday, 14 September</p><h1>Production overview</h1><p className="muted">See what is moving through your stitching center today.</p></div>{canManage ? <a className="primary" href="/orders/new">+ Create order</a> : null}</header>
        <section className="metrics" aria-label="Today’s production metrics">
          <article><p>Job orders</p><b>{orderCount}</b><small>All received orders</small></article>
          <article><p>Active batches</p><b>{activeBatches}</b><small>Ready or in production</small></article>
          <article><p>Completed batches</p><b>{completedBatches}</b><small>All-time completed</small></article>
          <article><p>Garments received</p><b>{garmentsReceived}</b><small>Across recent job orders</small></article>
        </section><MobileNav active="dashboard" role={user.role} />
        <section className="workspace">
          <a className={`my-work-card${newWork.length ? " has-new-work" : ""}`} href="/my-work"><div><p className="eyebrow">Your production queue</p><h2>My work bucket</h2><p>{myWork.length ? `${myWork.length} job${myWork.length === 1 ? "" : "s"} waiting for you` : "No jobs are waiting for you"}</p></div><div className="my-work-count"><b>{myWork.length}</b><span>{newWork.length ? `${newWork.length} new handoff${newWork.length === 1 ? "" : "s"}` : "Open bucket →"}</span></div></a>
          <article className="stage-card"><p className="eyebrow">Order visibility</p><h2>Open job orders</h2><div className="stage-counts"><span>Received <b>{orders.filter((order) => order.status === "CREATED").length}</b></span><span>In progress <b>{orders.filter((order) => order.status === "IN_PROGRESS").length}</b></span><span>On hold <b>{orders.filter((order) => order.status === "ON_HOLD").length}</b></span><span>Completed <b>{orders.filter((order) => order.status === "COMPLETED").length}</b></span></div></article>
        </section>
        <section className="orders" id="orders"><div className="section-heading"><div><p className="eyebrow">Latest received</p><h2>Recent job orders</h2></div><a className="text-button" href="/orders">View all orders →</a></div>
          <div className="batch-list">{orders.length ? orders.map((order) => { const quantity = order.items.flatMap((item) => item.sizeQuantities).reduce((sum, size) => sum + size.quantity, 0); const currentIndex = pipeline.indexOf(order.currentStage); return <a className="batch dashboard-order" href={`/orders/${order.id}`} key={order.id}><div className="batch-info"><b>{order.orderNumber}</b><span>{order.customer.name} · {order.processName || "Process not set"}</span><span>{order.garmentName} · {quantity} pieces</span></div><div className="order-card-pipeline dashboard-pipeline" aria-label={`Current stage: ${stageLabels[order.currentStage]}`}>{pipeline.map((stage, index) => { const done = index < currentIndex || (index === currentIndex && order.status === "COMPLETED"); const current = index === currentIndex && order.status !== "COMPLETED"; return <div className={done ? "done" : current ? "current" : ""} key={stage}><i>{done ? "✓" : index + 1}</i><span>{stageLabels[stage]}</span></div>; })}</div><div className="batch-progress"><span className="dashboard-order-state">{order.status.replace("_", " ")}</span></div><time>{order.createdAt.toLocaleDateString("en-IN")}</time></a>; }) : <p className="muted">No job orders have been created yet.</p>}</div>
        </section>
      </section>
    </main>
  );
}
