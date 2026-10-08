"use client";
import { usePwa } from "@/components/pwa-register";
export function ProviderFooter() {
  const { installed } = usePwa();
  return <footer className="provider-footer">Application provided by <a href="https://bananastack.in" target="_blank" rel="noopener noreferrer">bananastack.in ↗</a>{!installed && <a className="install-footer-link" href="/install">Install app</a>}</footer>;
}
