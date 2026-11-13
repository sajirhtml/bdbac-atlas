import { Link, useParams } from "react-router-dom";
import { BarList, YearBars } from "../components/Bars.jsx";
import { Ext, Loading, Notice, Stat } from "../components/Ui.jsx";
import { NCBI } from "../config.js";
import { fmt, pctText, platformLabel } from "../format.js";
import { useSummary } from "../hooks.js";
import NotFound from "./NotFound.jsx";

export default function Organism() {
  const { slug } = useParams();
  const { data } = useSummary();
  if (!data) return <Loading />;
  const o = data.organisms.find((x) => x.slug === slug);
  if (!o) return <NotFound />;
  const c = o.counts;
  const mostlyEmpty = c.samples > 0 && c.sequenced / c.samples < 0.5;

  return (
    <article className="section">
      <p className="crumb"><Link to="/organisms">Organisms</Link></p>
      <h1><span className="dot big" style={{ background: o.color }} aria-hidden="true" /><i>{o.name}</i></h1>
      <p className="lede">{o.blurb} <Ext href={NCBI.taxonomy(o.taxid)}>NCBI taxonomy {o.taxid}</Ext></p>

      {mostlyEmpty && (
        <Notice kind="warn" title="Most records here are not genomes.">
          Only {pctText(c.sequenced, c.samples)} of these {fmt(c.samples)} records have raw reads or an
          assembly. The rest are isolate registrations that carry metadata only.
        </Notice>
      )}

      <div className="stats">
        <Stat value={fmt(c.samples)} label="records" />
        <Stat value={fmt(c.with_reads)} label="with raw reads" />
        <Stat value={fmt(c.with_assembly)} label="with an assembly" />
        <Stat value={fmt(c.usable)} label="ready to analyse" />
      </div>
      <p><Link className="button" to={`/browse?organism=${o.slug}`}>Browse {fmt(c.samples)} samples</Link></p>

      <div className="two-col">
        <section><h2>Collection year</h2><YearBars rows={o.by_year} color={o.color} />
          <p className="muted">{fmt(c.samples - c.with_year)} records have no usable collection date.</p></section>
        <section><h2>Where it came from</h2>
          <BarList rows={o.by_niche} color={o.color} total={c.samples} />
        </section>
        <section><h2>Division</h2>
          <BarList rows={o.by_division} color={o.color} total={c.samples}
                   empty="No record names a division." />
          <p className="muted">{pctText(c.samples - c.with_district, c.samples)} name no district, so most records cannot be placed more precisely than the country.</p>
        </section>
        <section><h2>Sequencing platform</h2>
          <BarList rows={o.by_platform} color={o.color} label={platformLabel} empty="No raw reads are linked." />
        </section>
      </div>

      <section>
        <h2>Largest projects</h2>
        {o.top_projects.length ? (
          <ul className="plain">
            {o.top_projects.map((p) => (
              <li key={p.accession}><Link to={`/projects/${p.accession}`}>{p.accession}</Link>{" "}
                <span className="muted">{fmt(p.n)} records</span><br />{p.title || <span className="muted">No title in NCBI</span>}</li>
            ))}
          </ul>
        ) : <p className="muted">These records are not linked to a BioProject.</p>}
      </section>
    </article>
  );
}
