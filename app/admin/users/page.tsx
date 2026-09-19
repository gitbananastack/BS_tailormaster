import { currentAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { UserManagement } from "@/components/user-management";
import { LogoutButton } from "@/components/logout-button";

export default async function UsersPage() {
  const admin = await currentAdmin();
  if (!admin) redirect("/login");
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, createdAt: true }, orderBy: { createdAt: "desc" } });
  return <main className="admin-shell"><header className="admin-header"><div><p className="eyebrow">Administration</p><h1>User management</h1><p className="muted">Create staff accounts and control their system access.</p></div><div className="admin-header-actions"><a href="/admin/monitoring" className="text-button">System monitoring</a><a href="/" className="text-button">← Dashboard</a><LogoutButton /></div></header><UserManagement initialUsers={users.map((user) => ({ ...user, createdAt: user.createdAt.toISOString() }))} /></main>;
}
