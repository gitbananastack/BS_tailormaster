import { hasAnyRole, hasRole } from "@/lib/roles";
import { ClientBilling } from "@/components/client-billing";
import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { appBaseUrl } from "@/lib/app-url";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function ClientBillingPage() {
  const actor = await currentUser();
  if (!actor || !hasAnyRole(actor, ["ADMIN", "ORDER_MANAGER"])) redirect("/login");
  const publicBaseUrl = appBaseUrl(await headers());
  const [orders, invoices] = await Promise.all([
    prisma.order.findMany({ select: { id: true, orderNumber: true, garmentName: true, customer: { select: { name: true, phone: true, address: true } }, items: { select: { id: true, itemName: true, designCode: true, sizeQuantities: { select: { quantity: true } } } } }, orderBy: { createdAt: "desc" } }),
    prisma.clientInvoice.findMany({ include: { order: { select: { id: true, orderNumber: true, garmentName: true, customer: { select: { name: true, phone: true } } } } }, orderBy: { createdAt: "desc" } }),
  ]);
  return <main className="client-billing-shell"><header className="admin-header"><div><a className="back-link" href="/">← Dashboard</a><p className="eyebrow">Accounts</p><h1>Client billing</h1><p className="muted">View, search, download, and share generated client bills.</p></div><div className="admin-header-actions">{hasRole(actor, "ADMIN") ? <a className="text-button" href="/admin/company">Company details</a> : null}<a className="text-button" href="/orders">Job orders</a><a className="primary" href="/admin/client-billing/new">＋ Create bill</a></div></header><ClientBilling mode="list" publicBaseUrl={publicBaseUrl} orders={orders} initialInvoices={invoices.map((invoice) => ({ ...invoice, amount: invoice.amount.toString(), subtotal: invoice.subtotal.toString(), gstPercent: invoice.gstPercent.toString(), gstAmount: invoice.gstAmount.toString(), issueDate: invoice.issueDate.toISOString(), dueDate: invoice.dueDate?.toISOString() || null, createdAt: invoice.createdAt.toISOString(), updatedAt: invoice.updatedAt.toISOString() }))} /></main>;
}
