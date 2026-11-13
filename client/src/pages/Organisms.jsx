import { Link } from "react-router-dom";
import { Loading, OrgName } from "../components/Ui.jsx";
import { fmt, pctText } from "../format.js";
import { useSummary } from "../hooks.js";

export default function Organisms() {
  const { data } = useSummary();
  if (!data) return <Loading />;
  return (
    <section className="section">
      <h1>Organisms</h1>
      <p className="lede">Ten groups, chosen for their clinical or public-health relevance in Bangladesh. Records appear here
        only if NCBI lists Bangladesh as the place of collection.</p>
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>Organism</th><th className="num">Records</th><th className="num">With sequence data</th>
            <th className="num">Raw reads</th><th className="num">Assembly</th><th className="num">Ready to analyse</th>
            <th className="num">Source known</th><th className="num">District known</th></tr></thead>
          <tbody>
            {data.organisms.map((o) => (
              <tr key={o.slug}>
                <td><OrgName org={o} link /></td>
                <td className="num">{fmt(o.counts.samples)}</td><td className="num">{fmt(o.counts.sequenced)}</td>
                <td className="num">{fmt(o.counts.with_reads)}</td><td className="num">{fmt(o.counts.with_assembly)}</td>
                <td className="num">{fmt(o.counts.usable)}</td>
                <td className="num">{pctText(o.counts.with_niche, o.counts.samples)}</td>
                <td className="num">{pctText(o.counts.with_district, o.counts.samples)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted"><Link to="/quality">How complete is each record?</Link></p>
    </section>
  );
}
