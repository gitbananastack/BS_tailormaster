"use client";

import { scanQuery } from "@/lib/scan-value";
import { useEffect, useRef, useState } from "react";

type Scanner = { start: (cameraConfig: { facingMode: string }, config: { fps: number; qrbox: { width: number; height: number } }, onSuccess: (value: string) => void, onFailure?: () => void) => Promise<void>; stop: () => Promise<void>; clear: () => Promise<void> };

export function QrScanner() {
  const lookupBusy = useRef(false);
  const [finding, setFinding] = useState(false);
  const scanner = useRef<Scanner | null>(null);
  const [message, setMessage] = useState("Ready to scan a printed StitchFlow QR label.");
  const [manualValue, setManualValue] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => () => { if (scanner.current) scanner.current.stop().then(() => scanner.current?.clear()).catch(() => undefined); }, []);

  async function lookup(value: string) {
    if (lookupBusy.current) return;
    lookupBusy.current = true;
    setFinding(true);
    try {
      const query = scanQuery(value);
      setMessage("Finding your order…");
      if (scanner.current) { await scanner.current.stop().catch(() => undefined); await scanner.current.clear().catch(() => undefined); scanner.current = null; }
      setStarted(false);
      const response = await fetch(`/api/scan?${query}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to find this job order.");
      window.location.assign(`/orders/${encodeURIComponent(body.id)}/status`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to open the order. Please try again."); }
    finally { lookupBusy.current = false; setFinding(false); }
  }

  async function startCamera() {
    if (started) return;
    if (!window.isSecureContext) {
      setMessage("Phone camera scanning requires HTTPS. For local testing, scan the printed QR with Google Lens to open its IP-based tracking page, or enter the job-order number below.");
      return;
    }
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const reader = new Html5Qrcode("qr-reader") as unknown as Scanner;
      scanner.current = reader; setStarted(true); setMessage("Camera active. Hold the QR label inside the frame.");
      await reader.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } }, (decodedText) => void lookup(decodedText));
    } catch { setStarted(false); setMessage("Camera access was unavailable. Allow camera permission in browser settings and use the HTTPS application URL."); }
  }

  return <main className="scan-shell"><a href="/" className="back-link">← Dashboard</a><div className="scan-heading"><p className="eyebrow">Shop-floor action</p><h1>Scan job-order QR</h1><p className="muted">Use the camera on the HTTPS application, or use Google Lens with the printed QR during local testing.</p></div><section className="scanner-card"><div className="camera-frame"><div id="qr-reader" /></div><p className="scan-message" aria-live="polite">{message}</p><div className="scan-actions"><button className="primary" onClick={startCamera} disabled={started || finding}>{started ? "Scanner active" : "Open camera scanner"}</button></div><small className="scan-help">QR photo upload has been removed. Google Lens can open the read-only tracking URL directly.</small></section><section className="manual-scan"><p className="eyebrow">Manual fallback</p><h2>Enter job-order number</h2><form onSubmit={event => { event.preventDefault(); void lookup(manualValue); }}><input aria-label="Job-order number or QR value" value={manualValue} onChange={(event) => setManualValue(event.target.value)} placeholder="e.g. JOS47513" /><button className="text-button" type="submit" disabled={finding}>{finding ? "Finding order…" : "Open order →"}</button></form></section></main>;
}
