import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loading, Notice, OrgName, Pager } from "../components/Ui.jsx";
import { fmt } from "../format.js";
import { useApi, useSummary } from "../hooks.js";

export default function Projects() {
  const { data: summary } = useSummary();
  const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState(sp.get("q") || "");
  const page = sp.get("page") || "1";
  const { data, error, loading, slow } = useApi("/api/projects", { q: sp.get("q") || "", page, limit: 20 });
  const orgBySlug = Object.fromEntries((summary?.organisms || []).map((o) => [o.slug, o]));
  const go = (patch) => { const n = new URLSearchParams(sp); for (const [k, v] of Object.entries(patch)) v ? n.set(k, v) : n.delete(k); setSp(n); };

  return (
    <section className="section">
      <h1>Projects</h1>
      <p className="lede">A project is the study a group of samples was submitted under. A few large projects supply most of the records, so check the project before drawing conclusions from a subset.</p>
      <form className="search small" onSubmit={(e) => { e.preventDefault(); go({ q, page: "" }); }}>
        <label htmlFor="pq" className="sr-only">Search projects</label>
        <input id="pq" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Accession, title or submitter" />
        <button type="submit">Search</button>
      </form>
      {loading && !data && <Loading slow={slow} what="projects" />}
      {error && <Notice kind="error" title="Could not load projects.">{error.message}</Notice>}
      {data && (<>
        <p className="muted">{fmt(data.total)} projects</p>
        <ul className="project-list">
          {data.items.map((p) => (
            <li key={p._id}>
              <Link to={`/projects/${p._id}`} className="acc">{p._id}</Link>
              <strong>{p.title || <span className="muted">No title in NCBI</span>}</strong>
              <span className="muted">{p.submitter} {p.year_min ? `, ${p.year_min}${p.year_max !== p.year_min ? `–${p.year_max}` : ""}` : ""}</span>
              <span>{fmt(p.n_samples)} samples ({fmt(p.n_with_reads)} with reads, {fmt(p.n_with_assembly)} with assemblies)</span>
              <span className="proj-orgs">{p.organisms.map((o) => <OrgName key={o.slug} org={orgBySlug[o.slug] || { name: o.slug }} />)}</span>
            </li>))}
        </ul>
        <Pager page={data.page} pages={data.pages} onPage={(n) => go({ page: String(n) })} />
      </>)}
    </section>
  );
}
