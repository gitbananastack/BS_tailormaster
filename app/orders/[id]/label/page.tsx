import { hasAnyRole } from "@/lib/roles";
import { QrLabel } from "@/components/qr-label";
import { currentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import QRCode from "qrcode";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { appBaseUrl } from "@/lib/app-url";

export default async function OrderLabelPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser();
  if (!actor) redirect("/login");
  const canPrint = hasAnyRole(actor, ["ADMIN", "ORDER_MANAGER"]);
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id }, include: { customer: true, items: { include: { sizeQuantities: true } } } });
  if (!order) notFound();
  const total = order.items.flatMap((item) => item.sizeQuantities).reduce((sum, line) => sum + line.quantity, 0);
  const trackingUrl = `${appBaseUrl(await headers())}/track/${encodeURIComponent(order.qrToken || order.orderNumber)}`;
  const dataUrl = await QRCode.toDataURL(trackingUrl, { width: 560, margin: 1, errorCorrectionLevel: "M", color: { dark: "#143b2d", light: "#fffefa" } });
  return <QrLabel items={order.items} dataUrl={dataUrl} downloadUrl={`/api/orders/${order.id}/qr?token=${encodeURIComponent(order.qrToken || "")}`} orderNumber={order.orderNumber} garmentName={order.garmentName} customerName={order.customer.name} total={total} canPrint={canPrint} />;
}
