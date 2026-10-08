export function DesignNumbers({ items, prominent = false }: { items: { designCode?: string | null }[]; prominent?: boolean }) {
  const codes = [...new Set(items.map(item => item.designCode?.trim()).filter((code): code is string => !!code))];
  return <div className={`design-numbers${prominent ? " prominent" : ""}`}><span>Design {codes.length > 1 ? "numbers" : "number"}</span><strong>{codes.length ? codes.join(" · ") : "Not set"}</strong>{codes.length > 0 && items.some(item => !item.designCode?.trim()) && <small>Some designs need a number</small>}</div>;
}
