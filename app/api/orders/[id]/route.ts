import { hasAnyRole } from "@/lib/roles";
import { currentUser } from "@/lib/current-user";
import { orderSchema } from "@/lib/order-validation";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor) return Response.json({ error: "Sign in to update an order." }, { status: 401 });
  if (!hasAnyRole(actor, ["ADMIN", "ORDER_MANAGER"])) return Response.json({ error: "Only an administrator or order manager can edit order details." }, { status: 403 });
  const parsed = orderSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message || "Invalid order information." }, { status: 400 });
  const { id } = await params;
  const data = parsed.data;
  const existingCustomer = await prisma.customer.findFirst({ where: { name: data.customer.name } });
  const customer = existingCustomer
    ? await prisma.customer.update({ where: { id: existingCustomer.id }, data: { phone: data.customer.phone || null, address: data.customer.address || null } })
    : await prisma.customer.create({ data: { name: data.customer.name, phone: data.customer.phone || null, address: data.customer.address || null } });
  try {
    const order = await prisma.order.update({ where: { id }, data: { orderNumber: data.orderNumber, customerId: customer.id, garmentName: data.garmentName, issueNumber: data.issueNumber || null, processName: data.processName, salesOrderNumber: data.salesOrderNumber || null, productionManager: data.productionManager || null, receivedDate: data.receivedDate ? new Date(data.receivedDate) : null, inwardValue: data.inwardValue ?? null, items: { deleteMany: {}, create: data.items.map(item => ({ itemName: item.itemName, designCode: item.designCode, color: item.color || null, clientOrderReference: item.clientOrderReference || null, sizeQuantities: { create: item.sizeQuantities } })) }, rawMaterials: { deleteMany: {}, create: data.rawMaterials.map((material) => ({ ...material, itemCode: material.itemCode || null, color: material.color || null, panna: material.panna ?? null })) } }, include: { items: { include: { sizeQuantities: true } }, rawMaterials: true } });
    return Response.json(order);
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return Response.json({ error: "This job-order number already exists." }, { status: 409 });
    return Response.json({ error: "Unable to update the order." }, { status: 500 });
  }
}
