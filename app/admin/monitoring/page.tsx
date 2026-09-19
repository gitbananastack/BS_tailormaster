import { AdminMonitoring } from "@/components/admin-monitoring";
import { currentAdmin } from "@/lib/current-user";
import { redirect } from "next/navigation";

export default async function MonitoringPage() {
  if (!await currentAdmin()) redirect("/login");
  return <AdminMonitoring />;
}
