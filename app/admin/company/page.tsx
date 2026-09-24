import { CompanySettingsForm } from "@/components/company-settings-form";
import { getCompanySettings } from "@/lib/company-settings";
import { currentAdmin } from "@/lib/current-user";
import { redirect } from "next/navigation";

export default async function CompanySettingsPage() {
  if (!await currentAdmin()) redirect("/login");

  return (
    <main className="admin-shell">
      <header className="admin-header company-header">
        <div className="header-copy">
          <a className="back-link" href="/">← Dashboard</a>
          <p className="eyebrow">Administration</p>
          <h1>Company and invoice details</h1>
          <p className="muted">These details appear automatically on every client invoice PDF.</p>
        </div>

        <a className="text-button primary-link" href="/admin/client-billing">
          Client billing →
        </a>
      </header>

      <CompanySettingsForm initial={await getCompanySettings()} />
    </main>
  );
}
