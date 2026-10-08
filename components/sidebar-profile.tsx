"use client";

import { useEffect, useState } from "react";

export function SidebarProfile({ name, username, phone, roles }: { name: string; username: string; phone: string | null; roles: string[] }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  return <><button className="sidebar-profile-button" type="button" onClick={() => setOpen(true)} aria-haspopup="dialog"><span>{initials || "U"}</span><div><b>{name}</b><small>View profile</small></div><i aria-hidden="true">›</i></button>{open ? <div className="profile-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}><section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-title"><button className="profile-modal-close" type="button" onClick={() => setOpen(false)} aria-label="Close profile">×</button><header><span>{initials || "U"}</span><div><p>Signed-in profile</p><h2 id="profile-title">{name}</h2></div></header><dl><div><dt>Username</dt><dd>{username}</dd></div><div><dt>Mobile / WhatsApp</dt><dd>{phone || "Not provided"}</dd></div></dl><div className="profile-role-list"><small>Assigned roles</small><div>{roles.map(role => <span key={role}>{role}</span>)}</div></div></section></div> : null}</>;
}
