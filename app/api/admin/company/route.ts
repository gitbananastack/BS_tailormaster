import { companySettingKeys, getCompanySettings } from "@/lib/company-settings";
import { currentAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  companyName: z.string().trim().max(4000),
  companyAddress: z.string().trim().max(4000).default(""),
  companyPhone: z.string().trim().max(4000).default(""),
  companyEmail: z.string().trim().max(4000).default(""),
  companyGstin: z.string().trim().max(4000).default(""),
  companyBankDetails: z.string().trim().max(4000).default(""),
  companyBankName: z.string().trim().max(500).default(""),
  companyBankAccountHolder: z.string().trim().max(500).default(""),
  companyBankAccountNumber: z.string().trim().max(500).default(""),
  companyBankIfsc: z.string().trim().max(500).default(""),
  companyBankBranch: z.string().trim().max(500).default(""),
  companyBankUpi: z.string().trim().max(500).default(""),
  companyInvoiceFooter: z.string().trim().max(4000).default("Thank you for your business."),
});

export async function GET() {
  if (!await currentAdmin()) return Response.json({ error: "Administrator access required." }, { status: 403 });
  return Response.json(await getCompanySettings());
}

export async function PUT(request: Request) {
  if (!await currentAdmin()) return Response.json({ error: "Administrator access required." }, { status: 403 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success || !parsed.data.companyName.trim()) {
    return Response.json({ error: "Enter a valid company name and details." }, { status: 400 });
  }

  const payload = {
    ...parsed.data,
    companyBankDetails:
      parsed.data.companyBankDetails.trim() ||
      [
        parsed.data.companyBankName,
        parsed.data.companyBankAccountHolder,
        parsed.data.companyBankAccountNumber,
        parsed.data.companyBankIfsc,
        parsed.data.companyBankBranch,
        parsed.data.companyBankUpi,
      ]
        .filter((value) => Boolean(value && value.trim()))
        .join(" • "),
  };

  await prisma.$transaction(
    companySettingKeys.map((key) =>
      prisma.appSetting.upsert({
        where: { key },
        create: { key, value: payload[key] },
        update: { value: payload[key] },
      }),
    ),
  );

  return Response.json(payload);
}
