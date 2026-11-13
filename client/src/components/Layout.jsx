import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { SITE } from "../config.js";
import { useSummary } from "../hooks.js";

const Logo = () => (
  <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
    <circle cx="16" cy="16" r="14" fill="#006a4e" />
    <circle cx="12" cy="13" r="3" fill="#f0a22e" /><circle cx="20" cy="12" r="2.2" fill="#fff" />
    <circle cx="17" cy="21" r="3.4" fill="#d6456b" /><circle cx="9.5" cy="20.5" r="1.8" fill="#8fd3c4" />
  </svg>
);

export default function Layout() {
  const { data } = useSummary();
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  const rel = data?.release;
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="site-header">
        <Link to="/" className="brand"><Logo /><span>{SITE.name}</span></Link>
        <nav aria-label="Main">
          <NavLink to="/browse">Browse samples</NavLink>
          <NavLink to="/organisms">Organisms</NavLink>
          <NavLink to="/projects">Projects</NavLink>
          <NavLink to="/quality">Data quality</NavLink>
          <NavLink to="/about">About</NavLink>
        </nav>
      </header>
      <main id="main"><Outlet /></main>
      <footer className="site-footer">
        <p>
          Sequence data and metadata come from NCBI and the labs that submitted them. This site adds
          automated curation, which has not been reviewed by hand.
        </p>
        <p className="muted">
          {rel ? `Dataset ${rel.version}. NCBI data retrieved ${rel.ncbi_retrieved_on || "n/a"}. Curation rules ${rel.vocab_version || "n/a"}.` : ""}
          {" "}<Link to="/about">Methods and limits</Link>
        </p>
      </footer>
    </>
  );
}
