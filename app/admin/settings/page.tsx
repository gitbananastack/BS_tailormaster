import { PhotoStorageSettings } from "@/components/photo-storage-settings";
import { currentAdmin } from "@/lib/current-user";
import { redirect } from "next/navigation";
export default async function SettingsPage() { if (!await currentAdmin()) redirect("/login"); return <main className="admin-shell"><header className="admin-header"><div><a className="back-link" href="/admin/monitoring">← System monitoring</a><p className="eyebrow">Administration</p><h1>Storage settings</h1><p className="muted">Configure where quality-control photo files are saved.</p></div></header><PhotoStorageSettings /></main>; }
