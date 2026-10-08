"use client";

import { DesignNumbers } from "@/components/design-numbers";
import { QrShare } from "@/components/qr-share";

export function QrLabel({ dataUrl, downloadUrl, orderNumber, garmentName, customerName, total, canPrint, items }: { dataUrl: string; downloadUrl: string; orderNumber: string; garmentName: string; customerName: string; total: number; canPrint: boolean; items: { designCode: string | null }[] }) {
  return <main className="label-page"><section className="qr-label"><div className="label-brand">STITCHFLOW <span>JOB TRACKING</span></div><img src={dataUrl} alt={`QR code for ${orderNumber}`} /><div className="label-content"><DesignNumbers items={items} prominent /><p>JOB ORDER</p><h1>{orderNumber}</h1><b>{garmentName}</b><span>{customerName}</span><strong>{total} garments</strong></div></section><div className="label-actions"><a className="text-button" href={`/orders`}>← All orders</a>{canPrint ? <div><QrShare dataUrl={dataUrl} downloadUrl={downloadUrl} orderNumber={orderNumber} /><button className="primary" onClick={() => window.print()}>Print QR label</button></div> : <span className="muted">View only</span>}</div></main>;
}
