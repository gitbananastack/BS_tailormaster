type MonthPoint = { label: string; orders: number; payments: number };

function Bars({ points, value, format }: { points: MonthPoint[]; value: (point: MonthPoint) => number; format: (amount: number) => string }) {
  const max = Math.max(1, ...points.map(value));
  return <div className="year-bars">{points.map(point => { const amount = value(point); return <div className="year-bar" key={point.label}><div className="year-bar-value">{format(amount)}</div><div className="year-bar-track"><i style={{ height: `${Math.max(amount ? 5 : 0, amount / max * 100)}%` }} /></div><span>{point.label}</span></div>; })}</div>;
}

export function ProductivityYearCharts({ year, points }: { year: number; points: MonthPoint[] }) {
  const money = (value: number) => value >= 100000 ? `₹${(value / 100000).toFixed(1)}L` : value >= 1000 ? `₹${(value / 1000).toFixed(0)}k` : `₹${value.toFixed(0)}`;
  return <section className="year-chart-section"><div className="productivity-title"><div><p className="eyebrow">Annual trend</p><h2>Orders and payments · {year}</h2></div><span>Paid client invoices are grouped by invoice issue month</span></div><div className="year-chart-grid"><article><div className="chart-label"><span className="chart-swatch orders-swatch" />Orders received</div><Bars points={points} value={point => point.orders} format={String} /></article><article><div className="chart-label"><span className="chart-swatch payments-swatch" />Payments received</div><Bars points={points} value={point => point.payments} format={money} /></article></div></section>;
}
