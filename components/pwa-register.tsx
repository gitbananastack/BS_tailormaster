"use client";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type PwaState = { installed: boolean; canInstall: boolean; secure: boolean; install: () => Promise<void>; message: string };
const PwaContext = createContext<PwaState>({ installed: false, canInstall: false, secure: true, install: async () => {}, message: "" });
export const usePwa = () => useContext(PwaContext);
export function PwaRegister({ children }: { children: ReactNode }) {
 const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
 const [installed, setInstalled] = useState(false);
 const [offline, setOffline] = useState(false);
 const [secure, setSecure] = useState(true);
 const [message, setMessage] = useState("");
 const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
 useEffect(() => {
  const display = window.matchMedia("(display-mode: standalone)");
  const checkInstalled = () => setInstalled(display.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
  checkInstalled(); setSecure(window.isSecureContext); setOffline(!navigator.onLine);
  const offer = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
  const completed = () => { setInstalled(true); setPrompt(null); setMessage("StitchFlow has been added to your home screen."); };
  const online = () => setOffline(false); const disconnected = () => setOffline(true);
  window.addEventListener("beforeinstallprompt", offer); window.addEventListener("appinstalled", completed);
  window.addEventListener("online", online); window.addEventListener("offline", disconnected); display.addEventListener("change", checkInstalled);
  let mounted = true;
  if ("serviceWorker" in navigator && window.isSecureContext) {
   navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then(registration => {
    if (!mounted) return;
    if (registration.waiting) setWaiting(registration.waiting);
    registration.addEventListener("updatefound", () => { const worker = registration.installing; worker?.addEventListener("statechange", () => { if (mounted && worker.state === "installed" && navigator.serviceWorker.controller) setWaiting(worker); }); });
   }).catch(() => { if (mounted) setMessage("App setup could not finish. Refresh while connected and try again."); });
  }
  return () => { mounted = false; window.removeEventListener("beforeinstallprompt", offer); window.removeEventListener("appinstalled", completed); window.removeEventListener("online", online); window.removeEventListener("offline", disconnected); display.removeEventListener("change", checkInstalled); };
 }, []);
 async function install() {
  if (!prompt) return;
  try { await prompt.prompt(); const choice = await prompt.userChoice; setMessage(choice.outcome === "accepted" ? "Installation requested. Look for StitchFlow on your home screen." : "You can install StitchFlow later from this page."); }
  catch { setMessage("Use your browser’s Install app or Add to Home screen option."); }
  finally { setPrompt(null); }
 }
 function update() { if (!waiting) return; navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true }); waiting.postMessage({ type: "ACTIVATE_UPDATE" }); }
 return <PwaContext.Provider value={{ installed, canInstall: !!prompt, secure, install, message }}>{children}{offline ? <div className="pwa-notice" role="status">You’re offline. Reconnect before saving work.</div> : waiting ? <div className="pwa-notice" role="status"><span>App update ready. Save your work first.</span><button onClick={update}>Update & reload</button></div> : null}</PwaContext.Provider>;
}
