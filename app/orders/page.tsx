import { DesignNumbers } from "@/components/design-numbers";
import { SearchFilters } from "@/components/search-filters";
import { ListParams, filterValues, orderFilters, orderFilterFields, pageNumber } from "@/lib/list-filters";
import { Pagination } from "@/components/pagination";
import { hasAnyRole } from "@/lib/roles";
import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { MobileNav } from "@/components/mobile-nav";

const pipeline = ["CUTTING", "FUSING", "STITCHING", "QUALITY_CHECK", "PACKING", "DELIVERY"] as const;
const stageLabels: Record<(typeof pipeline)[number], string> = { CUTTING: "Cutting", FUSING: "Fusing", STITCHING: "Stitching", QUALITY_CHECK: "QC", PACKING: "Packing", DELIVERY: "Delivery" };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<ListParams> }) {
  const params = await searchParams;
  const filters = filterValues(params);
  const user = await currentUser();
  if (!user) redirect("/login");
  const canManage = hasAnyRole(user, ["ADMIN", "ORDER_MANAGER"]);
  const where = { AND: [orderFilters(params), canManage ? {} : { assignments: { some: { userId: user.id } } }] };
  const [total, ready, progress] = await Promise.all([prisma.order.count({ where }), prisma.order.count({ where: { ...where, status: "CREATED" } }), prisma.order.count({ where: { ...where, status: "IN_PROGRESS" } })]);
  const pages = Math.max(1, Math.ceil(total / 6));
  const page = pageNumber(params.page, total, 6);
  const orders = await prisma.order.findMany({ where, take: 6, skip: (page - 1) * 6, include: { customer: true, items: { include: { sizeQuantities: true } }, batches: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
  const heading = canManage ? "Job orders" : "My assigned orders";
  const description = canManage ? "Every client order received by the stitching center." : "Only job orders assigned to you are shown here.";
  return <><main className="orders-shell compact-orders"><header className="orders-header"><div><p className="eyebrow">{canManage ? "Order control" : "Assigned production"}</p><h1>{heading}</h1><p className="muted">{description}</p></div>{canManage ? <a href="/orders/new" className="primary">+ Create job order</a> : <a href="/my-work" className="primary">View my active work</a>}</header><section className="orders-summary"><article><span>{canManage ? "Total job orders" : "Assigned to me"}</span><b>{total}</b></article><article><span>Ready for production</span><b>{ready}</b></article><article><span>In progress</span><b>{progress}</b></article></section><SearchFilters action="/orders" values={filters} fields={orderFilterFields} placeholder="Design number, order or customer" /><p className="result-count">{total} matching orders</p><section className="orders-list">{orders.length === 0 ? <div className="empty-orders"><h2>{canManage ? "No matching orders" : "No orders assigned to you"}</h2><p>{canManage ? "Try changing or clearing your search and filters." : "Your assigned orders will appear here."}</p>{canManage ? <a className="primary" href="/orders/new">Create job order</a> : null}</div> : orders.map((order) => { const total = order.items.flatMap((item) => item.sizeQuantities).reduce((sum, size) => sum + size.quantity, 0); const currentIndex = pipeline.indexOf(order.currentStage); return <a className="order-card" href={`/orders/${order.id}`} key={order.id}><div className="order-card-top"><div><DesignNumbers items={order.items} /><p className="order-number">{order.orderNumber}</p><h2>{order.garmentName}</h2><p>{order.customer.name} · {order.processName || "Process not set"}</p></div><span className={`order-status ${order.status.toLowerCase()}`}>{order.status.replace("_", " ")}</span></div><div className="order-card-pipeline" aria-label={`Current stage: ${stageLabels[order.currentStage]}`}>{pipeline.map((stage, index) => { const done = index < currentIndex || (index === currentIndex && order.status === "COMPLETED"); const current = index === currentIndex && order.status !== "COMPLETED"; return <div className={done ? "done" : current ? "current" : ""} key={stage}><i>{done ? "✓" : index + 1}</i><span>{stageLabels[stage]}</span></div>; })}</div><div className="order-card-meta"><span><b>{total}</b> garments</span><span>{order.items[0]?.color ? `Color ${order.items[0].color}` : "No color"}</span><span>{order.receivedDate ? order.receivedDate.toLocaleDateString("en-IN") : "Date not set"}</span><strong>View order →</strong></div></a>; })}</section><Pagination page={page} pages={pages} total={total} basePath="/orders" filters={filters} /></main><MobileNav active="orders" /></>;
}
