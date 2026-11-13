import { Link, useParams } from "react-router-dom";
import { Ext, Loading, Missing, Notice, OrgName, Pips, RecordType } from "../components/Ui.jsx";
import { NCBI } from "../config.js";
import { BASIS, fmt, platformLabel } from "../format.js";
import { useApi, useSummary } from "../hooks.js";

const Basis = ({ v }) => (v ? <small className="basis">{BASIS[v] || v}</small> : null);

export default function Sample() {
  const { accession } = useParams();
  const { data: summary } = useSummary();
  const { data: d, error, loading, slow } = useApi(`/api/samples/${accession}`);
  if (loading) return <section className="section"><Loading slow={slow} what="the record" /></section>;
  if (error) return (
    <section className="section">
      <Notice kind={error.status === 404 ? "warn" : "error"} title={error.status === 404 ? "No such sample." : "Could not load this record."}>
        {error.message} <Link to="/browse">Back to browse</Link>
      </Notice>
    </section>);

  const org = summary?.organisms.find((o) => o.slug === d.organism_slug) || { name: d.organism_group };
  const c = d.curation || {};
  const raw = d.raw || {};
  const place = [d.upazila, d.district, d.division].filter((x, i, a) => x && a.indexOf(x) === i).join(", ");
  const hasRaw = (v) => v && !/^(missing|not collected|not applicable|not provided)/i.test(v);

  const rows = [
    ["Host", raw.host, d.host_name ? <><i>{d.host_name}</i>{d.host_taxid ? <> (<Ext href={NCBI.taxonomy(d.host_taxid)}>taxid {d.host_taxid}</Ext>)</> : null}</> : null, c.host_source],
    ["Isolation source", raw.isolation_source,
      d.sample_material || d.source_niche !== "Unknown" ? <>{d.source_niche !== "Unknown" ? d.source_niche : null}{d.source_type && d.source_type !== d.source_niche ? ` / ${d.source_type}` : ""}{d.sample_material ? `, ${d.sample_material}` : ""}</> : null, c.niche_source],
    ["Place", raw.geo_loc_name, place ? <>{place} <small className="basis">{d.location_precision}</small></> : null, c.location_source],
    ["Collection date", raw.collection_date, d.collection_date ? <>{d.collection_date} <small className="basis">{d.collection_date_precision}</small></> : null, d.collection_date ? "biosample" : null],
  ];

  return (
    <article className="section sample">
      <p className="crumb"><Link to="/browse">Samples</Link></p>
      <h1 className="acc-title">{d._id}</h1>
      <p className="sample-sub"><OrgName org={org} link /> <RecordType type={d.record_type} />{" "}
        <Pips score={d.completeness} /> <span className="muted">{d.completeness} of 6 key facts known</span></p>
      {d.record_type === "isolate_record" && (
        <Notice kind="warn" title="No sequence data.">This is an isolate registration. NCBI holds no raw reads or assembly for it.</Notice>
      )}

      <h2>As deposited and as curated</h2>
      <div className="table-wrap">
        <table className="data compare">
          <thead><tr><th>Field</th><th>As deposited</th><th>Curated here</th><th>Basis</th></tr></thead>
          <tbody>
            {rows.map(([label, rawVal, cur, basis]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td>{hasRaw(rawVal) ? rawVal : <Missing>{rawVal || "not provided"}</Missing>}</td>
                <td>{cur || <Missing>could not be determined</Missing>}</td>
                <td><Basis v={basis} /></td>
              </tr>))}
          </tbody>
        </table>
      </div>
      <p className="muted">Curated values come from automatic rules ({c.vocab_version || "unversioned"}). They have not been checked by hand.
        {d.hints?.selected_for_trait ? ` Text suggests isolates may have been chosen for: ${d.hints.selected_for_trait}.` : ""}
        {d.hints?.sampling_design ? ` Sampling design hint: ${d.hints.sampling_design}.` : ""}</p>

      <div className="two-col">
        <section>
          <h2>Record</h2>
          <dl className="facts">
            <dt>Isolate</dt><dd>{d.isolate_name || <Missing>none</Missing>}</dd>
            {d.serovar && <><dt>Serovar</dt><dd>{d.serovar}</dd></>}
            <dt>Submitted as</dt><dd><i>{d.species_submitted}</i> <small className="basis">not verified against the sequence</small></dd>
            <dt>Submitter</dt><dd>{d.submitter || <Missing>unknown</Missing>}</dd>
            <dt>Public since</dt><dd>{d.first_public_date || "–"}</dd>
            <dt>Data retrieved</dt><dd>{d.retrieved_on || "–"}</dd>
          </dl>
        </section>
        <section>
          <h2>Sequence data</h2>
          {d.record_type === "isolate_record" ? <p className="muted">None linked.</p> : (
            <dl className="facts">
              {d.n_runs ? <><dt>Raw reads</dt><dd>{fmt(d.n_runs)} run{d.n_runs > 1 ? "s" : ""}, {(d.platforms || []).map(platformLabel).join(", ")} {d.instruments?.length ? <span className="muted">({d.instruments.join(", ")})</span> : null}</dd></> : null}
              {d.total_bases ? <><dt>Bases</dt><dd>{(d.total_bases / 1e6).toLocaleString("en-GB", { maximumFractionDigits: 0 })} Mb</dd></> : null}
              {d.best_assembly ? <><dt>Assembly</dt><dd><Ext href={NCBI.assembly(d.best_assembly.accession)}>{d.best_assembly.accession}</Ext>, {d.best_assembly.level}{d.best_assembly.contig_n50 ? `, contig N50 ${fmt(d.best_assembly.contig_n50)}` : ""}{d.n_assemblies > 1 ? ` (${d.n_assemblies} assemblies)` : ""}</dd></> : null}
            </dl>)}
        </section>
      </div>

      <section>
        <h2>Open on NCBI</h2>
        <ul className="plain inline">
          <li><Ext href={NCBI.biosample(d._id)}>BioSample</Ext></li>
          {d.n_runs ? <li><Ext href={NCBI.sra(d._id)}>SRA runs</Ext></li> : null}
          {(d.bioproject_all || []).map((p) => <li key={p}><Ext href={NCBI.bioproject(p)}>BioProject {p}</Ext></li>)}
          {(d.pmids || []).map((p) => <li key={p}><Ext href={NCBI.pubmed(p)}>PubMed {p}</Ext></li>)}
          {(d.dois || []).map((x) => <li key={x}><Ext href={NCBI.doi(x)}>DOI {x}</Ext></li>)}
        </ul>
        {d.bioproject && (
          <p>Part of project <Link to={`/projects/${d.bioproject}`}>{d.bioproject}</Link>
            {d.bioproject_title ? `: ${d.bioproject_title}` : ""}
            {c.bioproject_source === "sra_runinfo" ? <small className="basis"> project recovered from SRA</small> : null}
          </p>)}
      </section>

      {d.ast?.length > 0 && (
        <section>
          <h2>Lab susceptibility results</h2>
          <div className="table-wrap"><table className="data">
            <thead><tr><th>Antibiotic</th><th>Result</th><th>Measurement</th><th>Method</th><th>Standard</th></tr></thead>
            <tbody>{d.ast.map((r, i) => (
              <tr key={i}><td>{r.antibiotic}</td><td>{r.interpretation}</td>
                <td>{[r.measurement_sign, r.measurement, r.measurement_units].filter(Boolean).join(" ")}</td>
                <td>{r.method}</td><td>{r.standard}</td></tr>))}</tbody>
          </table></div>
        </section>)}

      <details className="all-attrs">
        <summary>All BioSample attributes as deposited</summary>
        <dl className="facts">{Object.entries(d.attributes || {}).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{String(v)}</dd></div>)}</dl>
      </details>
    </article>
  );
}
