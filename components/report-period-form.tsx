import type { ReportPeriod } from "@/lib/reporting";

export function ReportPeriodForm({ action, period, from, to, exportHref }: { action: string; period: ReportPeriod; from?: string; to?: string; exportHref: string }) {
  return <form className="report-period-form" action={action} method="get">
    <label>Report period<select name="period" defaultValue={period}><option value="current">Current month</option><option value="previous">Previous month</option><option value="custom">Custom dates</option></select></label>
    <label>From<input name="from" type="date" defaultValue={from || ""} /></label>
    <label>To<input name="to" type="date" defaultValue={to || ""} /></label>
    <button className="primary" type="submit">View report</button>
    <a className="report-export" href={exportHref}>⇩ Export Excel</a>
  </form>;
}
