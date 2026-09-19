"use client";

import { useState } from "react";

export function QrShare({ dataUrl, downloadUrl, orderNumber }: { dataUrl: string; downloadUrl: string; orderNumber: string }) {
  const [message, setMessage] = useState("");
  function download() {
    const link = document.createElement("a");
    link.href = dataUrl; link.download = `${orderNumber}-qr.png`;
    document.body.appendChild(link); link.click(); link.remove();
  }
  async function share() {
    const url = new URL(downloadUrl, window.location.origin).toString();
    const text = `StitchFlow QR label for job order ${orderNumber}. Download the original QR image: ${url}`;
    try {
      const [metadata, encodedImage] = dataUrl.split(",");
      if (!encodedImage) throw new Error("QR image unavailable");
      const binary = window.atob(encodedImage);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      const blob = new Blob([bytes], { type: metadata.match(/data:(.*?);/)?.[1] || "image/png" });
      const file = new File([blob], `${orderNumber}-qr.png`, { type: "image/png" });
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        try {
          await navigator.share({ title: `QR label — ${orderNumber}`, text, files: [file] });
          setMessage("QR label shared.");
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") { setMessage("Sharing cancelled."); return; }
        }
      }
      download();
      window.open(`https://wa.me/?text=${encodeURIComponent(`${text} The QR image has also been downloaded; attach it to this message if needed.`)}`, "_blank", "noopener,noreferrer");
      setMessage("QR downloaded. Attach it in the WhatsApp window.");
    } catch {
      download();
      setMessage("QR image downloaded. Attach it in WhatsApp.");
    }
  }
  async function copyUrl() { const url = new URL(downloadUrl, window.location.origin).toString(); await navigator.clipboard.writeText(url); setMessage("Download link copied."); }
  return <span className="qr-share"><button className="whatsapp-share" onClick={share}>Share QR via WhatsApp</button><button className="qr-link-button" onClick={() => void copyUrl()}>Copy download link</button>{message ? <small aria-live="polite">{message}</small> : null}</span>;
}
