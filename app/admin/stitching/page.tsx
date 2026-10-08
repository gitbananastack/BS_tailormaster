import { Pagination } from "@/components/pagination";
import { SearchFilters } from "@/components/search-filters";
import { currentUser } from "@/lib/current-user";
import { pageNumber } from "@/lib/list-filters";
import { prisma } from "@/lib/prisma";
import { hasAnyRole } from "@/lib/roles";
import { redirect } from "next/navigation";

type StitchingParams = { q?: string; tailor?: string; status?: string; page?: string };
const statusOptions = [{ value: "QUEUED", label: "Queued" }, { value: "IN_PROGRESS", label: "In progress" }, { value: "ON_HOLD", label: "On hold" }, { value: "COMPLETED", label: "Completed" }, { value: "CANCELLED", label: "Cancelled" }];
function stitchingStatus(order: { currentStage: string; statusUpdates: { status: string; user: { id: string } }[] }, userId: string) { if (["QUALITY_CHECK", "PACKING", "DELIVERY"].includes(order.currentStage)) return "COMPLETED"; if (order.currentStage !== "STITCHING") return "QUEUED"; return order.statusUpdates.find(update => update.user.id === userId)?.status || "QUEUED"; }
function label(value: string) { return value.replaceAll("_", " ").toLowerCase(); }

export default async function StitchingAssignmentsPage({ searchParams }: { searchParams: Promise<StitchingParams> }) {
  const actor = await currentUser();
  if (!actor) redirect("/login?next=%2Fadmin%2Fstitching");
  if (!hasAnyRole(actor, ["ADMIN", "ORDER_MANAGER"])) redirect("/");
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 120) : "";
  const tailor = typeof params.tailor === "string" ? params.tailor : "";
  const status = statusOptions.some(option => option.value === params.status) ? params.status! : "";
  const assignments = await prisma.orderAssignment.findMany({
    where: { stage: "STITCHING", ...(tailor ? { userId: tailor } : {}), ...(q ? { OR: [{ user: { name: { contains: q } } }, { order: { orderNumber: { contains: q } } }, { order: { garmentName: { contains: q } } }, { order: { customer: { name: { contains: q } } } }, { order: { items: { some: { designCode: { contains: q } } } } }] } : {}) },
    include: { user: { select: { id: true, name: true } }, order: { include: { customer: { select: { name: true } }, items: { include: { sizeQuantities: true } }, statusUpdates: { where: { stage: "STITCHING" }, include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } } } } },
    orderBy: { assignedAt: "desc" },
  });
  const tailors = await prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true, role: true, roles: true }, orderBy: { name: "asc" } });
  const tailorOptions = tailors.filter(user => user.role === "TAILOR" || (Array.isArray(user.roles) && user.roles.includes("TAILOR")));
  const rows = assignments.map(assignment => ({ ...assignment, stitchingStatus: stitchingStatus(assignment.order, assignment.userId) })).filter(assignment => !status || assignment.stitchingStatus === status);
  const active = rows.filter(row => ["IN_PROGRESS", "ON_HOLD"].includes(row.stitchingStatus)).length;
  const completed = rows.filter(row => row.stitchingStatus === "COMPLETED").length;
  const assignedTailors = new Set(rows.map(row => row.userId)).size;
  const page = pageNumber(params.page, rows.length, 6);
  const pages = Math.max(1, Math.ceil(rows.length / 6));
  const visible = rows.slice((page - 1) * 6, page * 6);
  const filters = { q, tailor, status };
  return <main className="stitching-board-shell">
    <header className="stitching-board-header"><div><a className="back-link" href="/">← Dashboard</a><p className="eyebrow">Stitching control</p><h1>Tailor status &amp; history</h1><p className="muted">Track every stitching assignment by tailor and design number.</p></div><a className="primary" href="/orders">View all orders</a></header>
    <section className="stitching-summary" aria-label="Stitching assignment summary"><article><span>Assigned tailors</span><b>{assignedTailors}</b></article><article><span>Active stitching</span><b>{active}</b></article><article><span>Completed assignments</span><b>{completed}</b></article></section>
    <SearchFilters action="/admin/stitching" values={filters} placeholder="Design number, tailor, order or customer" fields={[{ name: "tailor", label: "Tailor", options: tailorOptions.map(item => ({ value: item.id, label: item.name })) }, { name: "status", label: "Status", options: statusOptions }]} />
    <p className="result-count">{rows.length} matching stitching assignments</p>
    <section className="stitching-assignment-list">{visible.length ? visible.map(assignment => {
      const designNumbers = [...new Set(assignment.order.items.map(item => item.designCode?.trim()).filter((code): code is string => !!code))];
      const quantity = assignment.order.items.flatMap(item => item.sizeQuantities).reduce((sum, item) => sum + item.quantity, 0);
      const tailorUpdates = assignment.order.statusUpdates.filter(update => update.user.id === assignment.userId);
      return <article className="stitching-assignment-card" key={assignment.id}>
        <div className="stitching-card-main"><div className="stitching-card-top"><div><span className="design-priority-label">Design number</span><h2>{designNumbers.length ? designNumbers.join(" · ") : "Not set"}</h2></div><span className={`stitching-state ${assignment.stitchingStatus.toLowerCase()}`}>{label(assignment.stitchingStatus)}</span></div><div className="tailor-identity"><span aria-hidden="true">{assignment.user.name.slice(0, 1).toUpperCase()}</span><div><small>Assigned tailor</small><b>{assignment.user.name}</b></div></div><dl className="stitching-order-facts"><div><dt>Order</dt><dd>{assignment.order.orderNumber}</dd></div><div><dt>Garment</dt><dd>{assignment.order.garmentName}</dd></div><div><dt>Customer</dt><dd>{assignment.order.customer.name}</dd></div><div><dt>Quantity</dt><dd>{quantity} pieces</dd></div><div><dt>Assigned</dt><dd>{assignment.assignedAt.toLocaleString("en-IN")}</dd></div><div><dt>ETA</dt><dd>{assignment.order.estimatedCompletion?.toLocaleString("en-IN") || "Not set"}</dd></div></dl><a className="stitching-open-order" href={`/orders/${assignment.orderId}`}>Open order details →</a></div>
        <div className="stitching-history"><div className="stitching-history-title"><p className="eyebrow">Stitching history</p><h3>{tailorUpdates.length} updates</h3></div>{tailorUpdates.length ? <ol>{tailorUpdates.map(update => <li key={update.id}><i className={update.status.toLowerCase()} aria-hidden="true" /><div><b>{label(update.status)}</b><span>{update.user.name} · {update.createdAt.toLocaleString("en-IN")}</span>{update.eta ? <small>ETA: {update.eta.toLocaleString("en-IN")}</small> : null}{update.comment ? <p>{update.comment}</p> : null}</div></li>)}</ol> : <div className="stitching-empty-history"><span>○</span><p>No stitching updates recorded yet.</p></div>}</div>
      </article>;
    }) : <article className="empty-orders"><h2>No stitching assignments found</h2><p>Try clearing the filters or assign a tailor to the Stitching stage of an order.</p></article>}</section>
    <Pagination page={page} pages={pages} total={rows.length} basePath="/admin/stitching" filters={filters} />
  </main>;
}
