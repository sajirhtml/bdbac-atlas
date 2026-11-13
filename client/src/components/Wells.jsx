import { Link } from "react-router-dom";
import { fmt, pctText } from "../format.js";

// One circular well per organism, filled to the share of records that have raw reads or an assembly.
export default function Wells({ organisms, onActive }) {
  return (
    <ul className="wells">
      {organisms.map((o) => {
        const { samples, sequenced } = o.counts;
        const share = samples ? sequenced / samples : 0;
        const id = `well-${o.slug}`;
        return (
          <li key={o.slug}>
            <Link to={`/organisms/${o.slug}`} onMouseEnter={() => onActive?.(o.slug)}
                  onMouseLeave={() => onActive?.(null)} onFocus={() => onActive?.(o.slug)}
                  onBlur={() => onActive?.(null)}>
              <svg viewBox="0 0 88 88" width="88" height="88" aria-hidden="true">
                <defs><clipPath id={id}><circle cx="44" cy="44" r="38" /></clipPath></defs>
                <circle cx="44" cy="44" r="41" className="well-rim" />
                <g clipPath={`url(#${id})`}>
                  <rect x="0" y="0" width="88" height="88" className="well-empty" />
                  <rect x="0" y={82 - 76 * share} width="88" height={76 * share + 8} fill={o.color} />
                </g>
              </svg>
              <span className="well-name"><i>{o.name}</i></span>
              <span className="well-n">{fmt(samples)} records</span>
              <span className="well-share">{pctText(sequenced, samples)} with sequence data</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
