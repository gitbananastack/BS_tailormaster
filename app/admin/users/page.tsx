import { currentAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { UserManagement } from "@/components/user-management";
import { LogoutButton } from "@/components/logout-button";

export default async function UsersPage() {
  const admin = await currentAdmin();
  if (!admin) redirect("/login");
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, phone: true, role: true, roles: true, screenAccess: true, isActive: true, createdAt: true }, orderBy: { createdAt: "desc" } });
  return <main className="admin-shell"><header className="admin-header"><div><p className="eyebrow">Administration</p><h1>User management</h1><p className="muted">Create staff accounts and control their system access.</p></div><div className="admin-header-actions"><a href="/admin/client-billing" className="text-button">Client billing</a><a href="/admin/company" className="text-button">Company details</a><a href="/admin/monitoring" className="text-button">System monitoring</a><a href="/" className="text-button">← Dashboard</a><LogoutButton /></div></header><UserManagement initialUsers={users.map((user) => ({ ...user, createdAt: user.createdAt.toISOString() }))} /></main>;
}
