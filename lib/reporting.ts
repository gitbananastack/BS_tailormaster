export type ReportSearchParams = Record<string, string | string[] | undefined>;
export type ReportPeriod = "current" | "previous" | "custom";

const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] || "" : value || "";
const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());

export function monthRange(offset = 0, now = new Date()) {
  const from = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const to = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
  return { from, to, label: from.toLocaleDateString("en-IN", { month: "long", year: "numeric" }) };
}

export function reportRange(params: ReportSearchParams, now = new Date()) {
  const requested = one(params.period);
  const period: ReportPeriod = requested === "previous" || requested === "custom" ? requested : "current";
  if (period === "previous") return { period, ...monthRange(-1, now) };
  if (period === "custom") {
    const fromText = one(params.from);
    const toText = one(params.to);
    if (validDate(fromText) && validDate(toText)) {
      const from = new Date(`${fromText}T00:00:00`);
      const to = new Date(`${toText}T00:00:00`);
      to.setDate(to.getDate() + 1);
      if (from < to) return { period, from, to, fromText, toText, label: `${from.toLocaleDateString("en-IN")} – ${new Date(to.getTime() - 1).toLocaleDateString("en-IN")}` };
    }
  }
  return { period: "current" as const, ...monthRange(0, now) };
}

export function reportQuery(range: ReturnType<typeof reportRange>) {
  const values = new URLSearchParams({ period: range.period });
  if (range.period === "custom" && "fromText" in range && range.fromText && range.toText) { values.set("from", range.fromText); values.set("to", range.toText); }
  return values.toString();
}

export const dateWhere = (range: { from: Date; to: Date }) => ({ gte: range.from, lt: range.to });
export const money = (value: number) => `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const percentChange = (current: number, previous: number) => previous === 0 ? (current === 0 ? 0 : 100) : ((current - previous) / previous) * 100;
