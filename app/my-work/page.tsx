import { DesignNumbers } from "@/components/design-numbers";
import { SearchFilters } from "@/components/search-filters";
import { Pagination } from "@/components/pagination";
import { ListParams, filterValues, orderFilters, orderFilterFields, pageNumber } from "@/lib/list-filters";
import { MobileNav } from "@/components/mobile-nav";
import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

const labels: Record<string, string> = { CUTTING: "Cutting", FUSING: "Fusing", STITCHING: "Stitching", QUALITY_CHECK: "Quality check", PACKING: "Packing", DELIVERY: "Delivery" };


export default async function MyWorkPage({ searchParams }: { searchParams: Promise<ListParams> }) {
  const params = await searchParams;
  const filters = filterValues(params);
  const freshCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const user = await currentUser();
  if (!user) redirect("/login");
  const assignments = await prisma.orderAssignment.findMany({ where: { userId: user.id }, select: { orderId: true, stage: true } });
  const orders = await prisma.order.findMany({ where: { AND: [orderFilters(params)], id: { in: assignments.map((assignment) => assignment.orderId) }, status: { in: ["CREATED", "IN_PROGRESS", "ON_HOLD"] } }, include: { customer: true, qcInspection: { select: { result: true, reworkStage: true, reworkTailorIds: true } }, items: { include: { sizeQuantities: true } }, statusUpdates: { where: { status: "COMPLETED" }, orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: { updatedAt: "desc" } });
  const work = orders.filter((order) => { const selected = order.qcInspection?.result === "REWORK_REQUIRED" && order.qcInspection.reworkStage === "STITCHING" && Array.isArray(order.qcInspection.reworkTailorIds) ? order.qcInspection.reworkTailorIds.filter((item): item is string => typeof item === "string") : []; return assignments.some((assignment) => assignment.orderId === order.id && assignment.stage === order.currentStage) && (!selected.length || selected.includes(user.id)); });
  const newCount = work.filter((order) => order.createdAt >= freshCutoff || order.statusUpdates.some((update) => update.createdAt >= freshCutoff)).length;
  const pages = Math.max(1, Math.ceil(work.length / 6));
  const page = pageNumber(params.page, work.length, 6);
  return <main className="orders-shell"><header className="orders-header work-header"><div><a className="back-link" href="/">← Dashboard</a><p className="eyebrow">Assigned production</p><h1>My work bucket</h1><p className="muted">Jobs waiting for you at their active production stage.</p></div><div className="work-summary"><div><span>Waiting for you</span><b>{work.length}</b></div><div className={newCount ? "new-work-count" : ""}><span>New handoffs</span><b>{newCount}</b></div></div></header><SearchFilters action="/my-work" values={filters} fields={orderFilterFields.map(field => field.name === "status" ? { ...field, options: field.options.filter(option => ["CREATED", "IN_PROGRESS", "ON_HOLD"].includes(option.value)) } : field)} placeholder="Design number, order or customer" /><p className="result-count">{work.length} matching jobs</p><section className="work-list">{work.length ? work.slice((page - 1) * 6, page * 6).map((order) => { const quantity = order.items.flatMap((item) => item.sizeQuantities).reduce((sum, line) => sum + line.quantity, 0); const isNew = order.createdAt >= freshCutoff || order.statusUpdates.some((update) => update.createdAt >= freshCutoff); return <a className={`work-card${isNew ? " is-new" : ""}`} href={`/orders/${order.id}`} key={order.id}>{isNew ? <span className="new-job-badge">New handoff</span> : null}<div className="work-card-head"><div><DesignNumbers items={order.items} /><span className="order-number">{order.orderNumber}</span><h2>{order.garmentName}</h2><p>{order.customer.name}</p></div><span className={`order-status ${order.status.toLowerCase()}`}>{order.status.replace("_", " ")}</span></div><div className="work-stage"><span>YOUR CURRENT TASK</span><b>{labels[order.currentStage]}</b><i>→</i><small>Open job to update progress</small></div><div className="work-card-meta"><span><small>Quantity</small><b>{quantity} pieces</b></span><span><small>Due / ETA</small><b>{order.estimatedCompletion ? order.estimatedCompletion.toLocaleDateString("en-IN") : "Not set"}</b></span><span><small>Received</small><b>{order.createdAt.toLocaleDateString("en-IN")}</b></span></div></a>; }) : <article className="empty-orders"><h2>No matching jobs</h2><p>Try clearing filters. New work appears when the previous stage is completed.</p></article>}</section><Pagination page={page} pages={pages} total={work.length} basePath="/my-work" filters={filters} /><MobileNav active="work" /></main>;
}
