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
import "./interactive-pipeline.css";
import "./cost-acceptance.css";
import "./public-tracking.css";
import "./mobile.css";
import "./sidebar-navigation.css";
import "./qc.css";
import "./qc-multiple-photos.css";
import "./qc-manager-gallery.css";
import "./dashboard-shortcut.css";

export const metadata: Metadata = {
  title: "StitchFlow | Production Control",
  description: "QR-based stitching center workflow management",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "StitchFlow" },
  icons: { icon: "/stitchflow-icon.svg", apple: "/stitchflow-icon.svg" },
};

export const viewport: Viewport = { themeColor: "#143b2d" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<DashboardShortcut /><PwaRegister /></body></html>;
}
