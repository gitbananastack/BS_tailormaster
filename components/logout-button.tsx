"use client";

export function LogoutButton() {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
  }
  return <button className="logout-button" onClick={logout}><span aria-hidden="true">↪</span> Logout</button>;
}
