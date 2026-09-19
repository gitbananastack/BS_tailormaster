"use client";
import { useEffect, useState } from "react";

export function PhotoStorageSettings() {
  const [folder, setFolder] = useState("public/uploads/qc"); const [publicUrl, setPublicUrl] = useState("/uploads/qc"); const [message, setMessage] = useState(""); const [saving, setSaving] = useState(false);
  useEffect(() => { fetch("/api/admin/photo-storage").then((response) => response.json()).then((data) => { if (data.folder) { setFolder(data.folder); setPublicUrl(data.publicUrl); } }); }, []);
  async function save() { setSaving(true); const response = await fetch("/api/admin/photo-storage", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ folder, publicUrl }) }); const data = await response.json(); setMessage(response.ok ? "Photo storage configuration saved." : data.error || "Unable to save configuration."); setSaving(false); }
  return <section className="detail-section storage-settings"><div className="section-heading"><div><p className="eyebrow">Quality-control photos</p><h2>File storage configuration</h2></div></div><p className="muted">Photos will be saved as files in this folder. The database will store only their relative file location.</p><div className="storage-form"><label>Server folder<input value={folder} onChange={(event) => setFolder(event.target.value)} /></label><label>Public URL path<input value={publicUrl} onChange={(event) => setPublicUrl(event.target.value)} /></label><div><p aria-live="polite">{message}</p><button className="primary" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save photo storage"}</button></div></div></section>;
}
