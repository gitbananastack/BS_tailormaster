"use client";

import { SearchFilters } from "@/components/search-filters";
import { userRoles, userScreens } from "@/lib/roles";
import { FormEvent, useState } from "react";

type User = { id: string; name: string; email: string; phone: string | null; role: string; roles?: unknown; screenAccess?: unknown; isActive: boolean; createdAt: string };
const roleLabels: Record<string, string> = { ADMIN: "Administrator", ORDER_MANAGER: "Order manager", CUTTING_OPERATOR: "Cutting operator", FUSING_OPERATOR: "Fusing operator", TAILOR: "Tailor", QC_INSPECTOR: "QC inspector", PACKING_STAFF: "Packing staff", DELIVERY_COORDINATOR: "Delivery coordinator" };

export function UserManagement({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const [filters, setFilters] = useState<Record<string, string>>({});
  const filteredUsers = users.filter(user => (!filters.q || [user.name, user.email, user.phone || ""].join(" ").toLowerCase().includes(filters.q.trim().toLowerCase())) && (!filters.role || userRoles(user).some(role => role === filters.role)) && (!filters.status || user.isActive === (filters.status === "active")));
  const pages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const currentPage = Math.min(page, pages);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.get("name"), username: form.get("username"), phone: form.get("phone"), password: form.get("password"), roles: form.getAll("roles"), screenAccess: form.getAll("screenAccess") }) });
    const body = await response.json();
    if (response.ok) { setUsers(current => [body, ...current]); setPage(1); formElement.reset(); setMessage("Staff account created."); }
    else setMessage(body.error || "Unable to create account.");
    setSaving(false);
  }

  async function updateUser(user: User, change: { isActive?: boolean; roles?: string[]; screenAccess?: string[]; phone?: string | null; password?: string }) {
    const response = await fetch(`/api/admin/users/${user.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(change) });
    const body = await response.json();
    if (response.ok) { setUsers(current => current.map((item) => item.id === user.id ? body : item)); setMessage("Account updated."); return true; }
    setMessage(body.error || "Unable to update account."); return false;
  }

  async function resetPassword(user: User) {
    const password = window.prompt(`Set a new password for ${user.name}. It must contain at least 8 characters.`);
    if (!password) return;
    if (password.length < 8) { setMessage("Password must contain at least 8 characters."); return; }
    if (await updateUser(user, { password })) setMessage("Password updated.");
  }

  async function updatePhone(user: User) {
    const phone = window.prompt(`WhatsApp number for ${user.name} (include country code, for example 919876543210).`, user.phone || "");
    if (phone === null) return;
    if (phone && phone.replace(/\D/g, "").length < 7) { setMessage("Enter a valid phone number including country code."); return; }
    if (await updateUser(user, { phone: phone || null })) setMessage("WhatsApp number updated.");
  }

  return <div className="admin-layout"><section className="new-user-card"><p className="eyebrow">New staff member</p><h2>Create user account</h2><p className="muted">Select all the work this login can do, then grant any additional screen access.</p><form onSubmit={createUser} className="user-form"><label>Full name<input name="name" required placeholder="e.g. Basheer" /></label><label>Username<input name="username" required minLength={3} placeholder="e.g. basheer" /></label><label>WhatsApp number<input name="phone" inputMode="tel" placeholder="e.g. 919876543210" /></label><label>Password<input name="password" type="password" required minLength={8} placeholder="Minimum 8 characters" /></label><fieldset className="role-options"><legend>Roles — select one or more</legend>{Object.entries(roleLabels).map(([value, label]) => <label key={value}><input type="checkbox" name="roles" value={value} defaultChecked={value === "TAILOR"} />{label}</label>)}</fieldset><fieldset className="role-options screen-access-options"><legend>Additional screen access</legend><label><input type="checkbox" name="screenAccess" value="PRODUCTIVITY" />Productivity monitoring</label><small>Administrators and order managers receive this access automatically.</small></fieldset><button className="primary" disabled={saving}>{saving ? "Creating…" : "Create account"}</button><p className="admin-message" aria-live="polite">{message}</p></form></section><section className="users-card"><div className="section-heading"><div><p className="eyebrow">Access control</p><h2>Users and permissions</h2></div><b className="quantity-total">{users.filter((user) => user.isActive).length} active</b></div><SearchFilters values={filters} placeholder="Name, username or phone" fields={[{ name: "role", label: "Role", options: Object.entries(roleLabels).map(([value, label]) => ({ value, label })) }, { name: "status", label: "Status", options: [{ value: "active", label: "Active" }, { value: "disabled", label: "Disabled" }] }]} onApply={values => { setFilters(values); setPage(1); }} />{!filteredUsers.length && <p className="filter-empty">No users match these filters.</p>}<div className="users-table"><div className="table-head"><span>Name</span><span>Roles &amp; access</span><span>Status</span><span>Action</span></div>{filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((user) => <div className="user-row" key={user.id}><div><b>{user.name}</b><small>{user.email}{user.phone ? ` · WhatsApp ${user.phone}` : " · No WhatsApp number"}</small></div><div className="user-permission-stack"><RoleEditor user={user} onSave={(roles) => updateUser(user, { roles })} /><ScreenAccessEditor user={user} onSave={(screenAccess) => updateUser(user, { screenAccess })} /></div><span><i className={user.isActive ? "status active" : "status inactive"}>{user.isActive ? "Active" : "Disabled"}</i></span><div className="user-actions"><button className="table-action" onClick={() => updatePhone(user)}>WhatsApp no.</button><button className="table-action" onClick={() => resetPassword(user)}>Reset password</button><button className="table-action" onClick={() => updateUser(user, { isActive: !user.isActive })}>{user.isActive ? "Disable" : "Enable"}</button></div></div>)}</div><nav className="pagination" aria-label="User pages"><span>{filteredUsers.length} people · Page {currentPage} of {pages}</span><div><button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>← Previous</button><button disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Next →</button></div></nav></section></div>;
}

function ScreenAccessEditor({ user, onSave }: { user: User; onSave: (screenAccess: string[]) => Promise<boolean> }) {
  const [enabled, setEnabled] = useState(userScreens(user).includes("PRODUCTIVITY"));
  const [saving, setSaving] = useState(false);
  const saved = userScreens(user).includes("PRODUCTIVITY");
  return <div className="screen-access-editor"><label><input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} />Productivity tab</label><button className="table-action" disabled={enabled === saved || saving} onClick={async () => { setSaving(true); await onSave(enabled ? ["PRODUCTIVITY"] : []); setSaving(false); }}>{saving ? "Saving…" : "Save access"}</button></div>;
}

function RoleEditor({ user, onSave }: { user: User; onSave: (roles: string[]) => Promise<boolean> }) {
  const [selected, setSelected] = useState<string[]>(userRoles(user));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const changed = JSON.stringify([...selected].sort()) !== JSON.stringify([...userRoles(user)].sort());
  return <fieldset className="role-options" disabled={saving}><legend>Roles for {user.name}</legend>{Object.entries(roleLabels).map(([value, label]) => <label key={value}><input type="checkbox" checked={selected.includes(value)} onChange={event => setSelected(current => event.target.checked ? [...current, value] : current.filter(role => role !== value))} />{label}</label>)}<button className="table-action" disabled={!changed || !selected.length || saving} onClick={async () => {
    setSaving(true); setError("");
    try { if (!await onSave(selected)) setError("Roles were not saved. See the account message."); }
    catch { setError("Unable to save roles. Please try again."); }
    finally { setSaving(false); }
  }}>{saving ? "Saving…" : "Save roles"}</button>{!selected.length && <small>Select at least one role.</small>}<small role="status">{error}</small></fieldset>;
}
