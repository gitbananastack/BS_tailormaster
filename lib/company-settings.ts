import { prisma } from "@/lib/prisma";

export const companySettingKeys = [
  "companyName",
  "companyAddress",
  "companyPhone",
  "companyEmail",
  "companyGstin",
  "companyBankDetails",
  "companyBankName",
  "companyBankAccountHolder",
  "companyBankAccountNumber",
  "companyBankIfsc",
  "companyBankBranch",
  "companyBankUpi",
  "companyInvoiceFooter",
] as const;

export type CompanySettings = {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyGstin: string;
  companyBankDetails: string;
  companyBankName: string;
  companyBankAccountHolder: string;
  companyBankAccountNumber: string;
  companyBankIfsc: string;
  companyBankBranch: string;
  companyBankUpi: string;
  companyInvoiceFooter: string;
};

function buildBankDetails(values: Map<string, string>) {
  const legacyBankDetails = values.get("companyBankDetails")?.trim();
  if (legacyBankDetails) return legacyBankDetails;

  return [
    values.get("companyBankName"),
    values.get("companyBankAccountHolder"),
    values.get("companyBankAccountNumber"),
    values.get("companyBankIfsc"),
    values.get("companyBankBranch"),
    values.get("companyBankUpi"),
  ]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(" • ");
}

export async function getCompanySettings(): Promise<CompanySettings> {
  const rows = await prisma.appSetting.findMany({ where: { key: { in: [...companySettingKeys] } } });
  const values = new Map(rows.map((row) => [row.key, row.value]));

  return {
    companyName: values.get("companyName") || "StitchFlow Production Center",
    companyAddress: values.get("companyAddress") || "",
    companyPhone: values.get("companyPhone") || "",
    companyEmail: values.get("companyEmail") || "",
    companyGstin: values.get("companyGstin") || "",
    companyBankDetails: buildBankDetails(values),
    companyBankName: values.get("companyBankName") || "",
    companyBankAccountHolder: values.get("companyBankAccountHolder") || "",
    companyBankAccountNumber: values.get("companyBankAccountNumber") || "",
    companyBankIfsc: values.get("companyBankIfsc") || "",
    companyBankBranch: values.get("companyBankBranch") || "",
    companyBankUpi: values.get("companyBankUpi") || "",
    companyInvoiceFooter: values.get("companyInvoiceFooter") || "Thank you for your business.",
  };
}
