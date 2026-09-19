"use client";

import { FormEvent, useState } from "react";

type User = { id: string; name: string; email: string; phone: string | null; role: string; isActive: boolean; createdAt: string };
const roleLabels: Record<string, string> = { ADMIN: "Administrator", ORDER_MANAGER: "Order manager", CUTTING_OPERATOR: "Cutting operator", TAILOR: "Tailor", QC_INSPECTOR: "QC inspector", PACKING_STAFF: "Packing staff", DELIVERY_COORDINATOR: "Delivery coordinator" };

export function UserManagement({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.get("name"), username: form.get("username"), phone: form.get("phone"), password: form.get("password"), role: form.get("role") }) });
    const body = await response.json();
    if (response.ok) { setUsers([body, ...users]); formElement.reset(); setMessage("Staff account created."); }
    else setMessage(body.error || "Unable to create account.");
    setSaving(false);
  }

  async function updateUser(user: User, change: { isActive?: boolean; role?: string; phone?: string | null; password?: string }) {
    const response = await fetch(`/api/admin/users/${user.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(change) });
    const body = await response.json();
    if (response.ok) setUsers(users.map((item) => item.id === user.id ? body : item));
    else setMessage(body.error || "Unable to update account.");
  }

  async function resetPassword(user: User) {
    const password = window.prompt(`Set a new password for ${user.name}. It must contain at least 8 characters.`);
    if (!password) return;
    if (password.length < 8) { setMessage("Password must contain at least 8 characters."); return; }
    await updateUser(user, { password });
    setMessage("Password updated.");
  }

  async function updatePhone(user: User) {
    const phone = window.prompt(`WhatsApp number for ${user.name} (include country code, for example 919876543210).`, user.phone || "");
    if (phone === null) return;
    if (phone && phone.replace(/\D/g, "").length < 7) { setMessage("Enter a valid phone number including country code."); return; }
    await updateUser(user, { phone: phone || null });
    setMessage("WhatsApp number updated.");
  }

  return <div className="admin-layout"><section className="new-user-card"><p className="eyebrow">New staff member</p><h2>Create user account</h2><p className="muted">Give each operator only the access needed for their workstation.</p><form onSubmit={createUser} className="user-form"><label>Full name<input name="name" required placeholder="e.g. Basheer" /></label><label>Username<input name="username" required minLength={3} placeholder="e.g. basheer" /></label><label>WhatsApp number<input name="phone" inputMode="tel" placeholder="e.g. 919876543210" /></label><label>Password<input name="password" type="password" required minLength={8} placeholder="Minimum 8 characters" /></label><label>Role<select name="role" defaultValue="TAILOR">{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button className="primary" disabled={saving}>{saving ? "Creating…" : "Create account"}</button><p className="admin-message" aria-live="polite">{message}</p></form></section><section className="users-card"><div className="section-heading"><div><p className="eyebrow">Access control</p><h2>Users and permissions</h2></div><b className="quantity-total">{users.filter((user) => user.isActive).length} active</b></div><div className="users-table"><div className="table-head"><span>Name</span><span>Role</span><span>Status</span><span>Action</span></div>{users.map((user) => <div className="user-row" key={user.id}><div><b>{user.name}</b><small>{user.email}{user.phone ? ` · WhatsApp ${user.phone}` : " · No WhatsApp number"}</small></div><select aria-label={`Role for ${user.name}`} value={user.role} onChange={(event) => updateUser(user, { role: event.target.value })}>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><span><i className={user.isActive ? "status active" : "status inactive"}>{user.isActive ? "Active" : "Disabled"}</i></span><div className="user-actions"><button className="table-action" onClick={() => updatePhone(user)}>WhatsApp no.</button><button className="table-action" onClick={() => resetPassword(user)}>Reset password</button><button className="table-action" onClick={() => updateUser(user, { isActive: !user.isActive })}>{user.isActive ? "Disable" : "Enable"}</button></div></div>)}</div></section></div>;
}
