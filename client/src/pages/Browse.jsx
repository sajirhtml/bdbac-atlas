import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { DataTags, Loading, Missing, Notice, OrgName, Pager, Pips } from "../components/Ui.jsx";
import { fmt, NICHE_ORDER, platformLabel, RECORD_TYPE_LABEL } from "../format.js";
import { apiUrl, useApi, useSummary } from "../hooks.js";

const HAS = [["reads", "Raw reads"], ["assembly", "An assembly"], ["long_reads", "Long reads"],
  ["usable", "Ready to analyse"], ["district", "District known"], ["publication", "Linked paper"],
  ["ast", "Lab AST results"]];
const LABELS = { has: Object.fromEntries(HAS), record_type: RECORD_TYPE_LABEL };

function Group({ title, children }) {
  return <fieldset className="filter-group"><legend>{title}</legend>{children}</fieldset>;
}

function Check({ checked, onChange, children, count }) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>{children}</span>{count !== undefined && <small>{fmt(count)}</small>}
    </label>
  );
}

export default function Browse() {
  const { data: summary } = useSummary();
  const [sp, setSp] = useSearchParams();
  const get = (k) => (sp.get(k) || "").split(",").filter(Boolean);
  const [q, setQ] = useState(sp.get("q") || "");
  const [years, setYears] = useState({ min: sp.get("year_min") || "", max: sp.get("year_max") || "" });
  useEffect(() => { setQ(sp.get("q") || ""); setYears({ min: sp.get("year_min") || "", max: sp.get("year_max") || "" }); }, [sp]);

  const filters = {
    organism: get("organism"), niche: get("niche"), division: get("division"),
    record_type: get("record_type"), has: get("has"), project: sp.get("project") || "",
    year_min: sp.get("year_min") || "", year_max: sp.get("year_max") || "", q: sp.get("q") || "",
  };
  const params = { ...filters, sort: sp.get("sort") || "", page: sp.get("page") || "1", limit: 25 };
  const { data, error, loading, slow } = useApi("/api/samples", params);

  const update = (patch, keepPage = false) => {
    const next = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(patch)) {
      if (v === "" || v === undefined || (Array.isArray(v) && !v.length)) next.delete(k);
      else next.set(k, Array.isArray(v) ? v.join(",") : String(v));
    }
    if (!keepPage) next.delete("page");
    setSp(next);
  };
  const toggle = (key, value) => {
    const cur = get(key);
    update({ [key]: cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value] });
  };

  const orgBySlug = Object.fromEntries((summary?.organisms || []).map((o) => [o.slug, o]));
  const facets = summary?.facets;
  const niches = facets ? [...facets.niches].sort((a, b) => NICHE_ORDER.indexOf(a.k) - NICHE_ORDER.indexOf(b.k)) : [];

  const chips = [];
  for (const key of ["organism", "niche", "division", "record_type", "has"]) {
    for (const v of get(key)) {
      const label = key === "organism" ? orgBySlug[v]?.name || v : LABELS[key]?.[v] || v;
      chips.push({ key: `${key}:${v}`, label, remove: () => toggle(key, v) });
    }
  }
  if (filters.q) chips.push({ key: "q", label: `“${filters.q}”`, remove: () => update({ q: "" }) });
  if (filters.project) chips.push({ key: "project", label: filters.project, remove: () => update({ project: "" }) });
  if (filters.year_min || filters.year_max) chips.push({ key: "years", label: `${filters.year_min || "…"} to ${filters.year_max || "…"}`, remove: () => update({ year_min: "", year_max: "" }) });

  const csvParams = { ...filters };
  return (
    <div className="browse">
      <aside className="filters" aria-label="Filters">
        <form onSubmit={(e) => { e.preventDefault(); update({ q }); }} className="search small">
          <label htmlFor="q" className="sr-only">Search</label>
          <input id="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Accession, isolate, host…" />
          <button type="submit">Search</button>
        </form>
        <Group title="Organism">
          {(summary?.organisms || []).map((o) => (
            <Check key={o.slug} checked={get("organism").includes(o.slug)} onChange={() => toggle("organism", o.slug)} count={o.counts.samples}>
              <OrgName org={o} />
            </Check>))}
        </Group>
        <Group title="Sequence data">
          {Object.entries(RECORD_TYPE_LABEL).map(([k, label]) => (
            <Check key={k} checked={get("record_type").includes(k)} onChange={() => toggle("record_type", k)}
                   count={facets?.record_types.find((r) => r.k === k)?.n}>{label}</Check>))}
          {HAS.map(([k, label]) => (
            <Check key={k} checked={get("has").includes(k)} onChange={() => toggle("has", k)}>{label}</Check>))}
        </Group>
        <Group title="Source">
          {niches.map((n) => (
            <Check key={n.k} checked={get("niche").includes(n.k)} onChange={() => toggle("niche", n.k)} count={n.n}>{n.k}</Check>))}
        </Group>
        <Group title="Division">
          {(facets?.divisions || []).filter((d) => d.k).map((d) => (
            <Check key={d.k} checked={get("division").includes(d.k)} onChange={() => toggle("division", d.k)} count={d.n}>{d.k}</Check>))}
        </Group>
        <Group title="Collection year">
          <div className="years-input" onBlur={() => update({ year_min: years.min, year_max: years.max })}>
            <input inputMode="numeric" aria-label="From year" placeholder={facets?.year_min ?? "from"} value={years.min}
                   onChange={(e) => setYears({ ...years, min: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
            <span>to</span>
            <input inputMode="numeric" aria-label="To year" placeholder={facets?.year_max ?? "to"} value={years.max}
                   onChange={(e) => setYears({ ...years, max: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
          </div>
        </Group>
      </aside>

      <section className="results" aria-live="polite">
        <div className="results-head">
          <h1>{data ? `${fmt(data.total)} samples` : "Samples"}</h1>
          <label className="sort">Sort by{" "}
            <select value={sp.get("sort") || "completeness"} onChange={(e) => update({ sort: e.target.value === "completeness" ? "" : e.target.value })}>
              <option value="completeness">Most facts known</option>
              <option value="year_desc">Newest first</option>
              <option value="accession">Accession</option>
            </select>
          </label>
        </div>
        {chips.length > 0 && (
          <p className="chips">
            {chips.map((c) => <button key={c.key} className="chip" onClick={c.remove} aria-label={`Remove filter ${c.label}`}>{c.label} <span aria-hidden="true">×</span></button>)}
            <button className="link-button" onClick={() => setSp(new URLSearchParams())}>Clear all</button>
          </p>
        )}
        {loading && !data && <Loading slow={slow} what="samples" />}
        {error && <Notice kind="error" title="Could not load samples.">{error.message} Check that the API is running and that VITE_API_URL is correct.</Notice>}
        {data && (
          <>
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Accession</th><th>Organism</th><th>Isolate</th><th>Host</th><th>Source</th><th>Place</th>
                  <th className="num">Year</th><th>Sequence data</th><th>Facts known</th></tr></thead>
                <tbody>
                  {data.items.map((d) => (
                    <tr key={d._id} className={loading ? "stale" : ""}>
                      <td><Link to={`/sample/${d._id}`} className="acc">{d._id}</Link></td>
                      <td><OrgName org={orgBySlug[d.organism_slug] || { name: d.organism_group }} /></td>
                      <td>{d.isolate_name || <Missing>none</Missing>}</td>
                      <td>{d.host_name ? <i>{d.host_name}</i> : <Missing>unknown</Missing>}</td>
                      <td>{d.source_niche && d.source_niche !== "Unknown" ? d.source_niche : <Missing>unknown</Missing>}
                        {d.sample_material ? <span className="muted"> ({d.sample_material})</span> : null}</td>
                      <td>{d.district ? `${d.district}${d.division && d.division !== d.district ? `, ${d.division}` : ""}` : d.division || <Missing>country only</Missing>}</td>
                      <td className="num">{d.collection_year || <Missing>none</Missing>}</td>
                      <td><DataTags reads={d.has_raw_reads} assembly={d.has_assembly} />
                        {d.platforms?.length ? <span className="muted"> {d.platforms.map(platformLabel).join(", ")}</span> : null}</td>
                      <td><Pips score={d.completeness} /></td>
                    </tr>
                  ))}
                  {!data.items.length && <tr><td colSpan="9" className="empty">No samples match these filters. Remove one to widen the search.</td></tr>}
                </tbody>
              </table>
            </div>
            <Pager page={data.page} pages={data.pages} onPage={(p) => update({ page: p }, true)} />
            {data.total > 0 && <p className="muted"><a href={apiUrl("/api/samples.csv", csvParams)}>Download these {fmt(Math.min(data.total, 50000))} rows as CSV</a></p>}
          </>
        )}
      </section>
    </div>
  );
}
