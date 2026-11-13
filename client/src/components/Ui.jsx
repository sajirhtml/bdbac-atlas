import { Link } from "react-router-dom";
import { fmt, RECORD_TYPE_LABEL } from "../format.js";

export function OrgName({ org, link = false }) {
  const inner = (<><span className="dot" style={{ background: org?.color || "#888" }} aria-hidden="true" />
    <i>{org?.name || "Unknown"}</i></>);
  return link && org ? <Link className="org-name" to={`/organisms/${org.slug}`}>{inner}</Link>
    : <span className="org-name">{inner}</span>;
}

// Six pips = how many of the six key facts are known (host, source, district, year, sequence data, paper)
export function Pips({ score = 0, max = 6 }) {
  return (
    <span className="pips" role="img" aria-label={`${score} of ${max} key facts known`}>
      {Array.from({ length: max }, (_, i) => <span key={i} className={i < score ? "on" : ""} />)}
    </span>
  );
}

export function DataTags({ reads, assembly }) {
  if (!reads && !assembly) return <span className="tag tag-none">no sequence data</span>;
  return (<>
    {reads && <span className="tag tag-yes">reads</span>}{" "}
    {assembly && <span className="tag tag-yes">assembly</span>}
  </>);
}

export function RecordType({ type }) {
  return <span className={`tag ${type === "sequenced" ? "tag-yes" : "tag-none"}`}>{RECORD_TYPE_LABEL[type] || type}</span>;
}

export function Missing({ children = "not provided" }) {
  return <span className="missing">{children}</span>;
}

export function Notice({ kind = "info", title, children }) {
  return (
    <div className={`notice notice-${kind}`} role={kind === "error" ? "alert" : "status"}>
      {title && <strong>{title}</strong>} {children}
    </div>
  );
}

export function Loading({ slow, what = "data" }) {
  return (
    <p className="loading" role="status">
      {slow ? `The server is waking up after a quiet spell. Loading ${what} can take up to a minute.`
        : `Loading ${what}…`}
    </p>
  );
}

export function Pager({ page, pages, onPage }) {
  if (pages <= 1) return null;
  return (
    <nav className="pager" aria-label="Pagination">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
      <span>Page {fmt(page)} of {fmt(pages)}</span>
      <button disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
    </nav>
  );
}

export function Stat({ value, label }) {
  return <div className="stat"><strong>{value}</strong><span>{label}</span></div>;
}

export function Ext({ href, children }) {
  return <a href={href} target="_blank" rel="noreferrer noopener">{children}</a>;
}
