import { ClientBilling } from "@/components/client-billing";
import { hasAnyRole } from "@/lib/roles";
import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";

export default async function EditClientBillPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor || !hasAnyRole(actor, ["ADMIN", "ORDER_MANAGER"])) redirect("/login");
  const { id } = await params;
  const [orders, invoice] = await Promise.all([
    prisma.order.findMany({ select: { id: true, orderNumber: true, garmentName: true, customer: { select: { name: true, phone: true, address: true } }, items: { select: { id: true, itemName: true, designCode: true, sizeQuantities: { select: { quantity: true } } } } }, orderBy: { createdAt: "desc" } }),
    prisma.clientInvoice.findUnique({ where: { id }, include: { order: { select: { id: true, orderNumber: true, garmentName: true, customer: { select: { name: true, phone: true } } } } } }),
  ]);
  if (!invoice) notFound();
  const editableInvoice = { ...invoice, amount: invoice.amount.toString(), subtotal: invoice.subtotal.toString(), gstPercent: invoice.gstPercent.toString(), gstAmount: invoice.gstAmount.toString(), issueDate: invoice.issueDate.toISOString(), dueDate: invoice.dueDate?.toISOString() || null, createdAt: invoice.createdAt.toISOString(), updatedAt: invoice.updatedAt.toISOString() };

  return <main className="client-billing-shell create-bill-shell">
    <header className="admin-header"><div><a className="back-link" href="/admin/client-billing">← Billing view</a><p className="eyebrow">Client billing</p><h1>Edit bill</h1><p className="muted">Update invoice {invoice.invoiceNumber}. Saved changes appear in the existing PDF link.</p></div></header>
    <ClientBilling mode="create" orders={orders} initialInvoices={[]} editingInvoice={editableInvoice} />
  </main>;
}
