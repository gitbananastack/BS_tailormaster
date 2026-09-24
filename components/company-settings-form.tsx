"use client";

import type { CompanySettings } from "@/lib/company-settings";
import { useState } from "react";

export function CompanySettingsForm({ initial }: { initial: CompanySettings }) {
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function update(key: keyof CompanySettings, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setMessage("");

    const payload = {
      ...values,
      companyBankDetails: [
        values.companyBankName,
        values.companyBankAccountHolder,
        values.companyBankAccountNumber,
        values.companyBankIfsc,
        values.companyBankBranch,
        values.companyBankUpi,
      ]
        .filter((value) => Boolean(value && value.trim()))
        .join(" • "),
    };

    const response = await fetch("/api/admin/company", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await response.json();
    setMessage(response.ok ? "Company and invoice details saved." : body.error || "Unable to save company details.");
    setSaving(false);
  }

  return (
    <section className="company-settings-card">
      <div className="company-section">
        <div className="company-section-header">
          <div>
            <p className="company-section-kicker">Company profile</p>
            <h2>Business details</h2>
          </div>
        </div>

        <div className="company-form-grid">
          <label>
            Company name
            <input value={values.companyName} onChange={(event) => update("companyName", event.target.value)} />
          </label>

          <label>
            GSTIN / Tax number
            <input value={values.companyGstin} onChange={(event) => update("companyGstin", event.target.value)} />
          </label>

          <label>
            Phone
            <input value={values.companyPhone} onChange={(event) => update("companyPhone", event.target.value)} />
          </label>

          <label>
            Email
            <input type="email" value={values.companyEmail} onChange={(event) => update("companyEmail", event.target.value)} />
          </label>

          <label className="company-wide">
            Company address
            <textarea rows={3} value={values.companyAddress} onChange={(event) => update("companyAddress", event.target.value)} />
          </label>
        </div>
      </div>

      <div className="company-section">
        <div className="company-section-header">
          <div>
            <p className="company-section-kicker">Payments</p>
            <h2>Bank details</h2>
          </div>
          <span>These details will appear on invoices and payout notes.</span>
        </div>

        <div className="company-form-grid">
          <label>
            Bank name
            <input value={values.companyBankName} onChange={(event) => update("companyBankName", event.target.value)} placeholder="HDFC Bank" />
          </label>

          <label>
            Account holder name
            <input value={values.companyBankAccountHolder} onChange={(event) => update("companyBankAccountHolder", event.target.value)} placeholder="StitchFlow Production Center" />
          </label>

          <label>
            Account number
            <input value={values.companyBankAccountNumber} onChange={(event) => update("companyBankAccountNumber", event.target.value)} placeholder="123456789012" />
          </label>

          <label>
            IFSC code
            <input value={values.companyBankIfsc} onChange={(event) => update("companyBankIfsc", event.target.value)} placeholder="HDFC0001234" />
          </label>

          <label>
            Branch name
            <input value={values.companyBankBranch} onChange={(event) => update("companyBankBranch", event.target.value)} placeholder="Koramangala" />
          </label>

          <label>
            UPI ID
            <input value={values.companyBankUpi} onChange={(event) => update("companyBankUpi", event.target.value)} placeholder="stitchflow@upi" />
          </label>
        </div>
      </div>

      <div className="company-section">
        <div className="company-section-header">
          <div>
            <p className="company-section-kicker">Invoice</p>
            <h2>Footer message</h2>
          </div>
        </div>

        <div className="company-form-grid">
          <label className="company-wide">
            Invoice footer
            <textarea rows={3} value={values.companyInvoiceFooter} onChange={(event) => update("companyInvoiceFooter", event.target.value)} />
          </label>
        </div>
      </div>

      <div className="company-save-row">
        <p aria-live="polite">{message}</p>
        <button className="primary" disabled={saving || !values.companyName.trim()} onClick={save}>
          {saving ? "Saving…" : "Save company details"}
        </button>
      </div>
    </section>
  );
}
