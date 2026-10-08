export function Pagination({ page, pages, total, basePath, filters = {} }: { page: number; pages: number; total: number; basePath: string; filters?: Record<string, string> }) {
  const href = (value: number) => `${basePath}?${new URLSearchParams({ ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)), page: String(value) })}`;
  return <nav className="pagination" aria-label="Pagination"><span>{total} records · Page {page} of {pages}</span><div>{page > 1 ? <a href={href(page - 1)} rel="prev">← Previous</a> : <span aria-disabled="true">← Previous</span>}{page < pages ? <a href={href(page + 1)} rel="next">Next →</a> : <span aria-disabled="true">Next →</span>}</div></nav>;
}
