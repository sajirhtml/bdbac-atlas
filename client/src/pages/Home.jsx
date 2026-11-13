import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ColonyPlate from "../components/ColonyPlate.jsx";
import Wells from "../components/Wells.jsx";
import { Loading, Notice, OrgName } from "../components/Ui.jsx";
import { SITE } from "../config.js";
import { fmt, pct } from "../format.js";
import { useSummary } from "../hooks.js";

export default function Home() {
  const { data, error } = useSummary();
  const [active, setActive] = useState(null);
  const [q, setQ] = useState("");
  const nav = useNavigate();

  if (error) return <Notice kind="error" title="Summary data missing.">Run the export script and copy summary.json to client/public/data/.</Notice>;
  if (!data) return <Loading what="the atlas" />;
  const t = data.totals;
  const noDistrict = 100 - pct(t.with_district, t.samples);

  return (
    <>
      <section className="hero">
        <div className="hero-text">
          <h1>{SITE.tagline}</h1>
          <p className="hero-bn" lang="bn">{SITE.taglineBn}</p>
          <p className="lede">
            Browse {fmt(t.samples)} public records for ten organisms. Each links back to NCBI and
            adds host, source, place and year where we could recover them. Where we couldn't, we say so.
          </p>
          <form className="search" onSubmit={(e) => { e.preventDefault(); nav(`/browse?q=${encodeURIComponent(q)}`); }}>
            <label htmlFor="home-q" className="sr-only">Search samples</label>
            <input id="home-q" value={q} onChange={(e) => setQ(e.target.value)}
                   placeholder="Accession, isolate, host or district" />
            <button type="submit">Search samples</button>
          </form>
          <p className="hero-links"><Link to="/browse">Browse everything</Link> or <Link to="/quality">see what is missing</Link></p>
        </div>
        <div className="hero-plate">
          <ColonyPlate organisms={data.organisms} active={active} total={t.sequenced} />
          <ul className="plate-legend" aria-label="Organism colours">
            {data.organisms.map((o) => (
              <li key={o.slug} onMouseEnter={() => setActive(o.slug)} onMouseLeave={() => setActive(null)}>
                <OrgName org={o} />
              </li>
            ))}
          </ul>
          <p className="plate-note">Each dot stands for about 30 records with sequence data.</p>
        </div>
      </section>

      <section className="band">
        <p className="ledger">
          Of <strong>{fmt(t.samples)}</strong> records, <strong>{fmt(t.with_reads)}</strong> have raw reads
          and <strong>{fmt(t.with_assembly)}</strong> have an assembly. <strong>{fmt(t.usable)}</strong> have
          sequence data, a collection year and a known source. <strong>{fmt(t.isolate_records)}</strong> are
          isolate records with no sequence data at all.
        </p>
      </section>

      <section className="section">
        <h2>Ten organisms</h2>
        <p className="muted">Each well fills to the share of its records that have raw reads or an assembly.</p>
        <Wells organisms={data.organisms} onActive={setActive} />
      </section>

      <section className="section triple">
        <div>
          <h3>Context, standardised</h3>
          <p>Hosts, sources, places and dates arrive as free text. We map them to consistent categories
            and keep the original value beside the result.</p>
        </div>
        <div>
          <h3>Gaps shown, not hidden</h3>
          <p>{noDistrict}% of records name no district. The <Link to="/quality">data quality page</Link> shows what is
            missing for every organism, so you can judge what the data can answer.</p>
        </div>
        <div>
          <h3>Back to the source</h3>
          <p>Every record links to its BioSample, BioProject, SRA runs, assemblies and papers on NCBI.
            Nothing here replaces the original submission.</p>
        </div>
      </section>
    </>
  );
}
