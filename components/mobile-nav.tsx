"use client";

export function MobileNav({ active, role }: { active: "dashboard" | "orders" | "scan" | "work" | "users"; role?: string }) {
  const coreItems = [
    { key: "dashboard", label: "Home", icon: "⌂", href: "/" },
    { key: "orders", label: "Orders", icon: "▤", href: "/orders" },
    { key: "scan", label: "Scan", icon: "▣", href: "/scan" },
    { key: "work", label: "My work", icon: "✓", href: "/my-work" },
  ] as const;
  const items = role === "ADMIN" ? [...coreItems, { key: "users" as const, label: "Admin", icon: "♙", href: "/admin/users" }] : coreItems;
  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); window.location.assign("/login"); }
  return <nav className={`mobile-nav ${role === "ADMIN" ? "admin-nav" : "worker-nav"}`} aria-label="Mobile navigation">{items.map((item) => <a key={item.key} href={item.href} className={active === item.key ? "active" : ""}><b>{item.icon}</b><span>{item.label}</span></a>)}<button className="mobile-logout" onClick={logout}><b>↪</b><span>Logout</span></button></nav>;
}
