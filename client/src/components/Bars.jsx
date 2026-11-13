import { fmt, pctText } from "../format.js";

// Horizontal bars. rows = [{k, n}]
export function BarList({ rows = [], color = "var(--green)", total, label = (k) => k, empty = "Nothing recorded." }) {
  if (!rows.length) return <p className="muted">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.n));
  return (
    <ul className="bars">
      {rows.map((r) => (
        <li key={r.k}>
          <span className="bar-label">{label(r.k)}</span>
          <span className="bar-track"><span className="bar-fill" style={{ width: `${(r.n / max) * 100}%`, background: color }} /></span>
          <span className="bar-value">{fmt(r.n)}{total ? <small> {pctText(r.n, total)}</small> : null}</span>
        </li>
      ))}
    </ul>
  );
}

// Vertical year histogram. rows = [{k: year, n}]
export function YearBars({ rows = [], color = "var(--green)" }) {
  if (!rows.length) return <p className="muted">No collection years recorded.</p>;
  const years = rows.map((r) => r.k);
  const lo = Math.min(...years), hi = Math.max(...years);
  const byYear = new Map(rows.map((r) => [r.k, r.n]));
  const max = Math.max(...rows.map((r) => r.n));
  const all = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  return (
    <div className="years" role="img" aria-label={`Records per collection year, ${lo} to ${hi}. Peak ${fmt(max)}.`}>
      <div className="years-plot">
        {all.map((y) => (
          <span key={y} className="year-col" title={`${y}: ${fmt(byYear.get(y) || 0)}`}>
            <span className="year-bar" style={{ height: `${((byYear.get(y) || 0) / max) * 100}%`, background: color }} />
          </span>
        ))}
      </div>
      <div className="years-axis"><span>{lo}</span><span>{Math.round((lo + hi) / 2)}</span><span>{hi}</span></div>
    </div>
  );
}
