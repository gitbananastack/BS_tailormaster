import { ClientBilling } from "@/components/client-billing";
import { hasAnyRole } from "@/lib/roles";
import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function CreateClientBillPage() {
  const actor = await currentUser();
  if (!actor || !hasAnyRole(actor, ["ADMIN", "ORDER_MANAGER"])) redirect("/login");
  const orders = await prisma.order.findMany({ select: { id: true, orderNumber: true, garmentName: true, customer: { select: { name: true, phone: true, address: true } }, items: { select: { id: true, itemName: true, designCode: true, sizeQuantities: { select: { quantity: true } } } } }, orderBy: { createdAt: "desc" } });

  return <main className="client-billing-shell create-bill-shell">
    <header className="admin-header"><div><a className="back-link" href="/admin/client-billing">← Billing view</a><p className="eyebrow">Client billing</p><h1>Create bill</h1><p className="muted">Select a job order, review the client details, and prepare the invoice.</p></div></header>
    <ClientBilling mode="create" orders={orders} initialInvoices={[]} />
  </main>;
}
