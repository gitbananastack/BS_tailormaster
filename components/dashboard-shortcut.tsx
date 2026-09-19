"use client";

import { usePathname } from "next/navigation";

const screensWithDashboardLink = new Set([
  "/",
  "/login",
  "/scan",
  "/my-work",
  "/orders/new",
  "/admin/users",
  "/admin/monitoring",
  "/admin/productivity",
]);

export function DashboardShortcut() {
  const pathname = usePathname();
  if (screensWithDashboardLink.has(pathname) || pathname.startsWith("/track/")) return null;

  return <a className="dashboard-shortcut" href="/" aria-label="Return to dashboard"><span aria-hidden="true">⌂</span> Dashboard</a>;
}
