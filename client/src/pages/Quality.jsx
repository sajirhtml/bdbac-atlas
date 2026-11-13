import { Link } from "react-router-dom";
import { Loading, OrgName } from "../components/Ui.jsx";
import { fmt, pct, pctText } from "../format.js";
import { useSummary } from "../hooks.js";

// The red part of each bar is the share of records where the fact is missing.
function Meter({ n, total }) {
  const p = pct(n, total);
  return (
    <td className="meter-cell">
      <span className="meter" role="img" aria-label={`${pctText(n, total)} of ${fmt(total)} records`}>
        <span className="meter-fill" style={{ width: `${p}%` }} />
      </span>
      <small>{pctText(n, total)}</small>
    </td>
  );
}

const COLS = [["with_host", "Host"], ["with_niche", "Source"], ["with_district", "District"],
  ["with_year", "Year"], ["with_reads", "Raw reads"], ["with_assembly", "Assembly"],
  ["with_ast", "Lab AST"], ["with_publication", "Paper"]];

export default function Quality() {
  const { data } = useSummary();
  if (!data) return <Loading />;
  const t = data.totals;
  return (
    <section className="section">
      <h1>Data quality</h1>
      <p className="lede">What each record tells you depends on what its submitters filled in. Green is the share of
        records where a fact is known. Red is what is missing.</p>

      <div className="table-wrap">
        <table className="data matrix">
          <thead><tr><th>Organism</th><th className="num">Records</th>{COLS.map(([, l]) => <th key={l}>{l}</th>)}</tr></thead>
          <tbody>
            {data.organisms.map((o) => (
              <tr key={o.slug}>
                <td><OrgName org={o} link /></td><td className="num">{fmt(o.counts.samples)}</td>
                {COLS.map(([k]) => <Meter key={k} n={o.counts[k]} total={o.counts.samples} />)}
              </tr>))}
            <tr className="total-row">
              <td>All organisms</td><td className="num">{fmt(t.samples)}</td>
              {COLS.map(([k]) => <Meter key={k} n={t[k]} total={t.samples} />)}
            </tr>
          </tbody>
        </table>
      </div>

      <h2>What this means for analysis</h2>
      <ul className="prose-list">
        <li><strong>{pctText(t.samples - t.with_district, t.samples)}</strong> of records name only the country. Maps below
          division level are not supported by this data.</li>
        <li><strong>{fmt(t.with_ast)}</strong> records carry structured lab susceptibility results. Resistance
          phenotypes cannot be studied from NCBI records alone.</li>
        <li><strong>{fmt(t.isolate_records)}</strong> records are isolate registrations with neither reads nor an
          assembly. They describe strains but are not genomes.</li>
        <li><strong>{pctText(t.with_publication, t.samples)}</strong> of records link to a paper through NCBI.</li>
      </ul>

      <h2>A few projects supply most of the data</h2>
      <p>Samples from one project are often related, so results from a subset can reflect that study's design, not Bangladesh as a whole.</p>
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>Project</th><th>Title</th><th className="num">Samples</th><th className="num">Share of all raw-read records</th><th className="num">Share of all assemblies</th></tr></thead>
          <tbody>
            {data.global.top_projects.slice(0, 8).map((p) => (
              <tr key={p.accession}>
                <td><Link to={`/projects/${p.accession}`} className="acc">{p.accession}</Link></td>
                <td>{p.title || <span className="muted">No title in NCBI</span>}</td>
                <td className="num">{fmt(p.n)}</td>
                <td className="num">{pctText(p.n_with_reads, t.with_reads)}</td>
                <td className="num">{pctText(p.n_with_assembly, t.with_assembly)}</td>
              </tr>))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
