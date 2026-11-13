import { Link, useParams } from "react-router-dom";
import { Ext, Loading, Notice, OrgName, Stat } from "../components/Ui.jsx";
import { NCBI } from "../config.js";
import { fmt } from "../format.js";
import { useApi, useSummary } from "../hooks.js";

export default function Project() {
  const { accession } = useParams();
  const { data: summary } = useSummary();
  const { data: p, error, loading, slow } = useApi(`/api/projects/${accession}`);
  if (loading) return <section className="section"><Loading slow={slow} what="the project" /></section>;
  if (error) return <section className="section"><Notice kind="warn" title="Project not found.">{error.message} <Link to="/projects">All projects</Link></Notice></section>;
  const orgBySlug = Object.fromEntries((summary?.organisms || []).map((o) => [o.slug, o]));
  return (
    <article className="section">
      <p className="crumb"><Link to="/projects">Projects</Link></p>
      <h1 className="acc-title">{p._id}</h1>
      <p className="lede">{p.title || "This project has no title in NCBI."}</p>
      <p className="muted">{p.submitter}{p.registration_date ? `, registered ${p.registration_date}` : ""}{" "}<Ext href={NCBI.bioproject(p._id)}>Open on NCBI</Ext></p>
      {p.description && <p className="prose">{p.description}</p>}
      <div className="stats">
        <Stat value={fmt(p.n_samples)} label="samples" /><Stat value={fmt(p.n_with_reads)} label="with raw reads" />
        <Stat value={fmt(p.n_with_assembly)} label="with an assembly" /><Stat value={fmt(p.n_usable)} label="ready to analyse" />
      </div>
      <p><Link className="button" to={`/browse?project=${p._id}`}>Browse these samples</Link></p>
      <section><h2>Organisms</h2>
        <ul className="plain">{p.organisms.map((o) => <li key={o.slug}><OrgName org={orgBySlug[o.slug] || { name: o.slug }} link /> <span className="muted">{fmt(o.n)} samples</span></li>)}</ul></section>
      <section><h2>Papers</h2>
        {p.publications?.length ? <ul className="plain">{p.publications.map((x) => (
          <li key={x.pmid}>{x.title} <span className="muted">{x.journal} {x.year}</span>{" "}
            <Ext href={NCBI.pubmed(x.pmid)}>PubMed</Ext>{x.doi ? <>{" "}<Ext href={NCBI.doi(x.doi)}>DOI</Ext></> : null}</li>))}</ul>
          : <p className="muted">NCBI links no paper to this project. A paper may still exist; this list only shows links NCBI holds.</p>}
      </section>
    </article>
  );
}
