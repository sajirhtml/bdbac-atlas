import { Link } from "react-router-dom";
import { Ext } from "../components/Ui.jsx";
import { SITE } from "../config.js";
import { useSummary } from "../hooks.js";

// Placeholders in [square brackets] need your input before launch.
export default function About() {
  const { data } = useSummary();
  const rel = data?.release;
  return (
    <article className="section prose">
      <h1>About {SITE.name}</h1>
      <p className="lede">{SITE.name} gathers public bacterial records from NCBI whose place of collection is Bangladesh,
        standardises their host, source, place and date, and shows what is still missing.</p>

      <h2>Where the data comes from</h2>
      <p>Records come from NCBI's BioSample database, with linked SRA runs, genome assemblies, BioProjects and PubMed
        papers. {rel ? `The current release is ${rel.version}, built from NCBI data retrieved ${rel.ncbi_retrieved_on || "on an unrecorded date"}.` : ""}
        NCBI data is submitted by research groups worldwide. Please credit the original submitters, which each
        record names.</p>

      <h2>How a record gets here</h2>
      <ol>
        <li>NCBI is searched for each organism together with the word Bangladesh.</li>
        <li>The country is checked against each record's own location field. Records that only mention Bangladesh
          in a title or comment, or that name another country, are excluded.</li>
        <li>Duplicates are removed. Salmonella Typhi has its own page and is not repeated under other Salmonella.</li>
        <li>Host, source, sample material, place and collection date are standardised by rules. The original value
          is kept next to the result on every record.</li>
        <li>Sequencing runs, assemblies, projects and papers are linked using NCBI's own cross-references.</li>
      </ol>

      <h2>What this site does not do</h2>
      <ul>
        <li>Curation is automatic and has not been reviewed by hand. [Add accuracy figures once the validation sample is checked.]</li>
        <li>Species names are as submitted. They have not been verified against the sequences.</li>
        <li>No genome analysis is included yet, so there are no resistance-gene or sequence-type results.</li>
        <li>Records reflect what was sequenced and submitted, which is not the same as how common an organism is.
          A few large projects dominate (see <Link to="/quality">data quality</Link>).</li>
        <li>Records that NCBI does not label as Bangladesh are not found, even if they came from there.</li>
      </ul>

      <h2>Using the data</h2>
      <p>Filtered tables can be downloaded as CSV from the <Link to="/browse">browse page</Link>. [Add the link to the full dataset
        release and its DOI.]</p>

      <h2>How to cite</h2>
      <p>[Add the citation once the dataset has a DOI.]</p>

      <h2>Corrections and contact</h2>
      <p>{SITE.repoUrl ? <>Report a wrong or missing value on <Ext href={SITE.repoUrl}>GitHub</Ext>. </> : null}
        {SITE.contact ? <>Or write to <a href={`mailto:${SITE.contact}`}>{SITE.contact}</a>.</> : "[Add a contact address in client/.env.]"}</p>
    </article>
  );
}
