import { useMemo } from "react";

// Small seeded PRNG so the plate looks the same on every visit
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const ISOLATES_PER_DOT = 30;

// A petri dish. Every dot stands for ~30 isolates that have raw reads or an assembly;
// each organism grows as one colony cluster in its own colour.
export default function ColonyPlate({ organisms, active, total }) {
  const dots = useMemo(() => {
    const rand = rng(20261);
    const orgs = [...organisms].sort((a, b) => b.counts.sequenced - a.counts.sequenced);
    const out = [];
    orgs.forEach((o, k) => {
      const n = o.counts.sequenced > 0 ? Math.max(1, Math.round(o.counts.sequenced / ISOLATES_PER_DOT)) : 0;
      const ang = k * 2.39996;
      const rad = 150 * Math.sqrt((k + 0.6) / orgs.length);
      const cx = 260 + Math.cos(ang) * rad;
      const cy = 260 + Math.sin(ang) * rad;
      const spread = 14 + 7 * Math.sqrt(n);
      for (let i = 0; i < n; i++) {
        let x, y, tries = 0;
        do {
          x = cx + (rand() + rand() + rand() - 1.5) * spread;
          y = cy + (rand() + rand() + rand() - 1.5) * spread;
          tries++;
        } while (Math.hypot(x - 260, y - 260) > 222 && tries < 20);
        out.push({ slug: o.slug, x, y, r: 2.6 + rand() * 3.2, color: o.color });
      }
    });
    return out;
  }, [organisms]);

  return (
    <svg className="plate" viewBox="0 0 520 520" role="img"
         aria-label={`A petri dish with ${dots.length} coloured dots. Each dot stands for about ${ISOLATES_PER_DOT} of the ${total?.toLocaleString("en-GB") ?? ""} records that have sequence data.`}>
      <circle cx="260" cy="260" r="256" className="plate-rim" />
      <circle cx="260" cy="260" r="238" className="plate-agar" />
      <circle cx="260" cy="260" r="228" className="plate-ring" />
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.color}
                className={active && active !== d.slug ? "dot-dim" : "dot-on"} />
      ))}
    </svg>
  );
}
