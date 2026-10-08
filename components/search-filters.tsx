"use client";

import { FormEvent } from "react";

export type FilterField = { name: string; label: string; options: { value: string; label: string }[]; searchable?: boolean };

export function SearchFilters({ action, values = {}, fields = [], placeholder = "Search…", onApply }: { action?: string; values?: Record<string, string>; fields?: FilterField[]; placeholder?: string; onApply?: (values: Record<string, string>) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    if (!onApply) return;
    event.preventDefault();
    onApply(Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>);
  }

  return <form className="search-filters" role="search" action={action} method="get" onSubmit={submit} key={JSON.stringify(values)}>
    {Object.entries(values).filter(([name, value]) => value && name !== "q" && !fields.some(field => field.name === name)).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
    <label className="search-query"><span>Search</span><input type="search" name="q" defaultValue={values.q || ""} placeholder={placeholder} maxLength={120} /></label>
    {fields.map(field => <label key={field.name}><span>{field.label}</span>{field.searchable ? <>
      <input type="search" name={`${field.name}Label`} list={`${field.name}-options`} defaultValue={field.options.find(option => option.value === values[field.name])?.label || ""} placeholder={`Type ${field.label.toLowerCase()}`} onChange={event => {
        const option = field.options.find(item => item.label.toLowerCase() === event.currentTarget.value.trim().toLowerCase());
        const hidden = event.currentTarget.parentElement?.querySelector<HTMLInputElement>(`input[name="${field.name}"]`);
        if (hidden) hidden.value = option?.value || "";
      }} />
      <input type="hidden" name={field.name} defaultValue={values[field.name] || ""} />
      <datalist id={`${field.name}-options`}>{field.options.map(option => <option key={option.value} value={option.label} />)}</datalist>
    </> : <select name={field.name} defaultValue={values[field.name] || ""}><option value="">All {field.label.toLowerCase()}</option>{field.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>}</label>)}
    <button className="filter-apply" type="submit">Apply</button>
    {onApply ? <button className="filter-clear" type="button" onClick={event => { event.currentTarget.form?.reset(); onApply({}); }}>Clear</button> : <a className="filter-clear" href={action || "/"}>Clear</a>}
  </form>;
}
