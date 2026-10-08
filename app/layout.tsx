import { ProviderFooter } from "@/components/provider-footer";
import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/pwa-register";
import { DashboardShortcut } from "@/components/dashboard-shortcut";
import "./styles.css";
import "./form.css";
import "./auth.css";
import "./admin.css";
import "./orders.css";
import "./dashboard.css";
import "./label.css";
import "./detail-actions.css";
import "./scan.css";
import "./scan-library.css";
import "./scan-upload.css";
import "./status.css";
import "./assignment.css";
import "./logout.css";
import "./mobile-logout.css";
import "./status-update.css";
import "./order-pipeline.css";
import "./work-bucket.css";
import "./manager-notes.css";
import "./billing.css";
import "./whatsapp.css";
import "./monitoring.css";
import "./productivity.css";
import "./reports.css";
import "./report-charts.css";
import "./interactive-pipeline.css";
import "./cost-acceptance.css";
import "./public-tracking.css";
import "./mobile.css";
import "./sidebar-navigation.css";
import "./sidebar-profile.css";
import "./qc.css";
import "./qc-multiple-photos.css";
import "./qc-manager-gallery.css";
import "./dashboard-shortcut.css";
import "./company-settings.css";
import "./client-billing.css";
import "./dashboard-billing.css";
import "./billing-status.css";
import "./dashboard-refresh.css";
import "./list-controls.css";
import "./scan-experience.css";
import "./pwa.css";
import "./material-cost.css";
import "./stitching-board.css";

export const metadata: Metadata = {
  title: "StitchFlow | Production Control",
  description: "QR-based stitching center workflow management",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "StitchFlow" },
  icons: { icon: "/stitchflow-icon.svg", apple: "/icons/stitchflow-180.png" },
};

export const viewport: Viewport = { themeColor: "#143b2d", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><PwaRegister>{children}<ProviderFooter /><DashboardShortcut /></PwaRegister></body></html>;
}
