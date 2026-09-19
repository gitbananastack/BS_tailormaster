import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { EditOrderForm } from "@/components/edit-order-form";

export default async function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  if (!await currentUser()) redirect("/login");
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id }, include: { customer: true, items: { include: { sizeQuantities: true } }, rawMaterials: true } });
  if (!order) notFound();
  return <main className="form-shell"><EditOrderForm order={{ ...order, receivedDate: order.receivedDate?.toISOString() || null, inwardValue: order.inwardValue?.toString() || null, items: order.items, rawMaterials: order.rawMaterials.map((line) => ({ ...line, panna: line.panna?.toString() || null, quantity: line.quantity.toString() })) }} /></main>;
}
