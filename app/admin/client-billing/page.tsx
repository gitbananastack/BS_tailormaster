import { ClientBilling } from "@/components/client-billing";
import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function ClientBillingPage() {
  const actor = await currentUser();
  if (!actor || !["ADMIN", "ORDER_MANAGER"].includes(actor.role)) redirect("/login");
  const [orders, invoices] = await Promise.all([
    prisma.order.findMany({ select: { id: true, orderNumber: true, garmentName: true, customer: { select: { name: true, phone: true } }, items: { select: { id: true, itemName: true, sizeQuantities: { select: { quantity: true } } } } }, orderBy: { createdAt: "desc" } }),
    prisma.clientInvoice.findMany({ include: { order: { select: { orderNumber: true, garmentName: true, customer: { select: { name: true, phone: true } } } } }, orderBy: { createdAt: "desc" } }),
  ]);
  return <main className="client-billing-shell"><header className="admin-header"><div><a className="back-link" href="/">← Dashboard</a><p className="eyebrow">Accounts</p><h1>Client billing</h1><p className="muted">Create job-order invoices and share the branded PDF through WhatsApp.</p></div><div className="admin-header-actions">{actor.role === "ADMIN" ? <a className="text-button" href="/admin/company">Company details</a> : null}<a className="text-button" href="/orders">Job orders</a></div></header><ClientBilling orders={orders} initialInvoices={invoices.map((invoice) => ({ ...invoice, amount: invoice.amount.toString(), issueDate: invoice.issueDate.toISOString(), dueDate: invoice.dueDate?.toISOString() || null, createdAt: invoice.createdAt.toISOString(), updatedAt: invoice.updatedAt.toISOString() }))} /></main>;
}
