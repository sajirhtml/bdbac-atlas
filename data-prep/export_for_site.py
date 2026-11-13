#!/usr/bin/env python3
"""
Turn the curated tables from enrich_metadata.py into the files the website needs.

Reads  (from --in, default ncbi_bangladesh/clean):
  samples_curated.tsv (required), bioprojects.tsv, bioproject_pubmed.tsv, publications.tsv,
  ast_results.tsv, sra_runs_bangladesh.tsv   (all optional but recommended)

Writes (to --out, default site_data):
  samples.ndjson   one MongoDB document per BioSample   -> `npm run seed`
  projects.ndjson  one document per BioProject          -> `npm run seed`
  summary.json     precomputed numbers/charts for the static pages (copy to client/public/data/)

Usage:
  python export_for_site.py --release 0.1.0 --copy-summary-to ../client/public/data
"""
import argparse
import datetime
import json
import shutil
import sys
from collections import Counter, defaultdict
from pathlib import Path

import pandas as pd

ORGANISMS = [
    dict(group="Escherichia coli", slug="escherichia-coli", name="Escherichia coli", taxid=562,
         color="#2E6DB4",
         blurb="A common gut bacterium. Some lineages cause urinary-tract and diarrhoeal "
               "disease, and ESBL-producing strains are a major resistance concern."),
    dict(group="Klebsiella pneumoniae", slug="klebsiella-pneumoniae", name="Klebsiella pneumoniae",
         taxid=573, color="#1FA39A",
         blurb="An opportunistic pathogen behind many hospital-acquired infections. "
               "Carbapenem-resistant lineages are a global concern."),
    dict(group="Salmonella Typhi", slug="salmonella-typhi", name="Salmonella Typhi", taxid=90370,
         color="#D6456B",
         blurb="The cause of typhoid fever, spread through contaminated food and water."),
    dict(group="Salmonella enterica", slug="salmonella-enterica",
         name="Salmonella enterica (non-Typhi)", taxid=28901, color="#E07A5F",
         blurb="Non-typhoidal serovars that cause gastroenteritis and circulate in poultry "
               "and food chains. Typhi has its own page."),
    dict(group="Acinetobacter baumannii", slug="acinetobacter-baumannii",
         name="Acinetobacter baumannii", taxid=470, color="#7A5CC4",
         blurb="A hospital-associated pathogen known for multidrug resistance."),
    dict(group="Enterococcus faecium", slug="enterococcus-faecium", name="Enterococcus faecium",
         taxid=1352, color="#8A8F98",
         blurb="A gut commensal and hospital pathogen. Vancomycin-resistant strains (VRE) are "
               "of particular concern."),
    dict(group="Staphylococcus aureus", slug="staphylococcus-aureus", name="Staphylococcus aureus",
         taxid=1280, color="#F0A22E",
         blurb="Causes skin, bloodstream and device-related infections. Includes "
               "methicillin-resistant (MRSA) lineages."),
    dict(group="Pseudomonas aeruginosa", slug="pseudomonas-aeruginosa",
         name="Pseudomonas aeruginosa", taxid=287, color="#6FAF3F",
         blurb="An opportunistic pathogen found in hospitals and the environment, naturally "
               "resistant to many antibiotics."),
    dict(group="Vibrio cholerae", slug="vibrio-cholerae", name="Vibrio cholerae", taxid=666,
         color="#B8A21A",
         blurb="The cause of cholera, an acute diarrhoeal disease spread through "
               "contaminated water."),
    dict(group="Mammaliicoccus sciuri", slug="mammaliicoccus-sciuri", name="Mammaliicoccus sciuri",
         taxid=1296, color="#8A5A3C",
         blurb="A staphylococcus-like bacterium (formerly Staphylococcus sciuri) found on "
               "animals and in food environments."),
]
BY_GROUP = {o["group"]: o for o in ORGANISMS}

REQUIRED = [
    "biosample_accession", "organism_group", "has_raw_reads", "has_assembly", "usable_for_analysis",
    "source_niche", "division", "district", "collection_year", "all_attributes",
]


# ---------------------------------------------------------------- helpers
def b(v):
    return str(v).strip().lower() in ("true", "1", "yes")


def to_int(v):
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return None


def to_float(v):
    try:
        x = float(v)
        return None if x != x else x
    except (TypeError, ValueError):
        return None


def split(v, sep=";"):
    return [x.strip() for x in str(v or "").split(sep) if x.strip()]


def prune(o):
    """Drop None, '', [] and {} (but keep False and 0) to keep the database small."""
    if isinstance(o, dict):
        out = {k: prune(v) for k, v in o.items()}
        return {k: v for k, v in out.items() if v is not None and v != "" and v != [] and v != {}}
    if isinstance(o, list):
        return [prune(x) for x in o]
    return o


def read(path, **kw):
    return pd.read_csv(path, sep="\t", dtype=str, **kw).fillna("") if path.exists() else None


def tally(items, top=None):
    c = Counter(x for x in items if x not in (None, ""))
    rows = [{"k": k, "n": n} for k, n in c.most_common(top)]
    return rows


# ---------------------------------------------------------------- documents
def build_sample(r, sra_project):
    g = lambda c: r.get(c, "")  # noqa: E731
    acc = g("biosample_accession")
    bps = split(g("bioproject_accession"))
    bp_source = "biosample" if bps else ""
    if not bps and sra_project.get(acc):
        bps, bp_source = [sra_project[acc]], "sra_runinfo"

    reads, asm = b(g("has_raw_reads")), b(g("has_assembly"))
    flags = dict(
        has_raw_reads=reads, has_assembly=asm, has_long_reads=b(g("has_long_reads")),
        has_ast=b(g("has_ast")), has_publication=b(g("has_publication")),
        has_host=b(g("has_host")), has_known_niche=b(g("has_known_niche")),
        has_district=b(g("has_district")), has_collection_year=b(g("has_collection_year")),
        usable=b(g("usable_for_analysis")),
    )
    completeness = sum([flags["has_host"], flags["has_known_niche"], flags["has_district"],
                        flags["has_collection_year"], reads or asm, flags["has_publication"]])
    try:
        attributes = json.loads(g("all_attributes") or "{}")
    except json.JSONDecodeError:
        attributes = {}

    n50 = to_int(g("best_assembly_contig_n50"))
    best = {"accession": g("best_assembly_accession"), "level": g("best_assembly_level"),
            "contig_n50": n50}
    doc = {
        "_id": acc,
        "organism_slug": BY_GROUP.get(g("organism_group"), {}).get("slug", "other"),
        "organism_group": g("organism_group"),
        "species_submitted": g("species_submitted"),
        "taxid": to_int(g("ncbi_taxid")),
        "record_type": "sequenced" if (reads or asm) else "isolate_record",
        "isolate_name": g("isolate_name"), "serovar": g("serovar_curated"),
        "sra_sample": g("sra_sample"),
        "host_name": g("host_name_curated"), "host_taxid": to_int(g("host_taxid")),
        "source_niche": g("source_niche"), "source_type": g("source_type"),
        "sample_material": g("sample_material"), "setting": g("setting"),
        "country": g("country"), "division": g("division"), "district": g("district"),
        "upazila": g("upazila"), "location_precision": g("location_precision"),
        "lat": to_float(g("lat")), "lon": to_float(g("lon")),
        "collection_date": g("collection_date"),
        "collection_date_precision": g("collection_date_precision"),
        "collection_year": to_int(g("collection_year")),
        "platforms": split(g("sra_platforms")), "instruments": split(g("sra_models")),
        "library_strategies": split(g("library_strategies")),
        "n_runs": to_int(g("n_sra_runs")), "total_bases": to_int(g("total_bases")),
        "n_assemblies": to_int(g("n_assemblies")),
        "best_assembly": best if best["accession"] else None,
        "bioproject": bps[0] if bps else None, "bioproject_all": bps,
        "bioproject_title": g("bioproject_title"), "submitter": g("submitter_center"),
        "pmids": split(g("publication_pmids")), "dois": split(g("publication_dois")),
        "antibiogram_n_drugs": to_int(g("antibiogram_n_drugs")),
        **flags, "completeness": completeness,
        "curation": {
            "status": g("curation_status") or "automatic", "vocab_version": g("vocab_version"),
            "host_source": g("host_source"), "niche_source": g("niche_source"),
            "location_source": g("location_source"), "location_note": g("location_note"),
            "bioproject_source": bp_source,
        },
        "hints": {"sampling_design": g("sampling_design_hint"),
                  "selected_for_trait": g("selected_for_trait_hint")},
        "raw": {
            "organism": g("raw_organism"), "isolate": g("raw_isolate"), "strain": g("raw_strain"),
            "host": g("raw_host"), "host_disease": g("raw_host_disease"),
            "isolation_source": g("raw_isolation_source"), "geo_loc_name": g("raw_geo_loc_name"),
            "lat_lon": g("raw_lat_lon"), "collection_date": g("raw_collection_date"),
            "collected_by": g("raw_collected_by"), "sample_type": g("raw_sample_type"),
            "ncbi_package": g("raw_ncbi_package"),
        },
        "attributes": attributes,
        "retrieved_on": g("retrieved_on"), "first_public_date": g("first_public_date"),
        "last_update": g("last_update"),
    }
    return prune(doc)


COUNT_KEYS = {
    "samples": lambda d: True, "with_reads": lambda d: d["has_raw_reads"],
    "with_assembly": lambda d: d["has_assembly"],
    "sequenced": lambda d: d["record_type"] == "sequenced",
    "isolate_records": lambda d: d["record_type"] == "isolate_record",
    "usable": lambda d: d["usable"], "with_ast": lambda d: d["has_ast"],
    "with_publication": lambda d: d["has_publication"], "with_district": lambda d: d["has_district"],
    "with_host": lambda d: d["has_host"], "with_niche": lambda d: d["has_known_niche"],
    "with_year": lambda d: d["has_collection_year"],
}


def counts(docs):
    return {k: sum(1 for d in docs if fn(d)) for k, fn in COUNT_KEYS.items()}


def breakdown(docs):
    years = Counter(d["collection_year"] for d in docs if d.get("collection_year"))
    return {
        "by_year": [{"k": y, "n": years[y]} for y in sorted(years)],
        "by_niche": tally(d.get("source_niche") for d in docs),
        "by_division": tally(d.get("division") for d in docs),
        "by_platform": tally(p for d in docs for p in d.get("platforms", [])),
        "by_material": tally((d.get("sample_material") for d in docs), 12),
        "by_record_type": tally(d["record_type"] for d in docs),
    }


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--in", dest="inp", default="ncbi_bangladesh/clean")
    ap.add_argument("--out", default="site_data")
    ap.add_argument("--release", default="0.1.0")
    ap.add_argument("--copy-summary-to", default=None,
                    help="also copy summary.json here (e.g. ../client/public/data)")
    a = ap.parse_args()
    src, out = Path(a.inp), Path(a.out)
    out.mkdir(parents=True, exist_ok=True)

    samples = read(src / "samples_curated.tsv")
    if samples is None:
        sys.exit(f"{src / 'samples_curated.tsv'} not found. Run enrich_metadata.py first.")
    missing = [c for c in REQUIRED if c not in samples.columns]
    if missing:
        sys.exit(f"samples_curated.tsv lacks columns {missing}. Was it made by enrich_metadata.py?")

    # BioProject fallback for records whose BioSample has no BioProject link (e.g. EBI-owned)
    sra = read(src / "sra_runs_bangladesh.tsv")
    sra_project = {}
    if sra is not None and {"BioSample", "BioProject"} <= set(sra.columns):
        s = sra[(sra["BioProject"] != "") & (sra["BioSample"] != "")]
        sra_project = dict(zip(s["BioSample"], s["BioProject"]))

    docs = [build_sample(r, sra_project) for r in samples.to_dict("records")]
    ast = read(src / "ast_results.tsv")
    if ast is not None and len(ast):
        by_sample = defaultdict(list)
        for row in ast.to_dict("records"):
            acc = row.pop("biosample")
            by_sample[acc].append({k: v for k, v in row.items() if v != ""})
        for d in docs:
            if d["_id"] in by_sample:
                d["ast"] = by_sample[d["_id"]]
    print(f"samples: {len(docs)} (BioProject recovered from SRA for "
          f"{sum(1 for d in docs if d.get('curation', {}).get('bioproject_source') == 'sra_runinfo')})")

    # ---- projects
    bp_meta = read(src / "bioprojects.tsv")
    bp_meta = {r["bioproject"]: r for r in bp_meta.to_dict("records")} if bp_meta is not None else {}
    links = read(src / "bioproject_pubmed.tsv")
    pm_by_bp = defaultdict(list)
    if links is not None:
        for r in links.to_dict("records"):
            if r["pmid"]:
                pm_by_bp[r["bioproject"]].append(r["pmid"])
    pubs = read(src / "publications.tsv")
    pub_by_pm = {r["pmid"]: r for r in pubs.to_dict("records")} if pubs is not None else {}

    members = defaultdict(list)
    for d in docs:
        for p in d.get("bioproject_all", []):
            members[p].append(d)
    projects = []
    for acc, ds in members.items():
        meta = bp_meta.get(acc, {})
        orgs = Counter(d["organism_slug"] for d in ds)
        years = [d["collection_year"] for d in ds if d.get("collection_year")]
        submitter = meta.get("submitter") or Counter(
            d.get("submitter", "") for d in ds).most_common(1)[0][0]
        pmids = sorted(set(pm_by_bp.get(acc, [])))
        projects.append(prune({
            "_id": acc, "title": meta.get("title"), "description": meta.get("description"),
            "submitter": submitter, "registration_date": meta.get("registration_date"),
            "n_samples": len(ds), "n_with_reads": sum(d["has_raw_reads"] for d in ds),
            "n_with_assembly": sum(d["has_assembly"] for d in ds),
            "n_usable": sum(d["usable"] for d in ds),
            "year_min": min(years) if years else None, "year_max": max(years) if years else None,
            "organisms": [{"slug": s, "n": n} for s, n in orgs.most_common()],
            "organism_slugs": list(orgs), "pmids": pmids,
            "publications": [{k: pub_by_pm[p].get(k, "") for k in ("pmid", "doi", "title", "year", "journal")}
                             for p in pmids if p in pub_by_pm],
        }))
    projects.sort(key=lambda p: -p["n_samples"])
    title_of = {p["_id"]: p.get("title", "") for p in projects}

    # ---- summary.json
    organisms = []
    for o in ORGANISMS:
        ds = [d for d in docs if d["organism_group"] == o["group"]]
        top = Counter(p for d in ds for p in d.get("bioproject_all", []))
        organisms.append({
            **{k: o[k] for k in ("slug", "group", "name", "taxid", "color", "blurb")},
            "counts": counts(ds), **breakdown(ds),
            "top_projects": [{"accession": p, "title": title_of.get(p, ""), "n": n}
                             for p, n in top.most_common(8)],
        })
    districts = tally((d.get("district") for d in docs), 80)
    years_all = [d["collection_year"] for d in docs if d.get("collection_year")]
    retrieved = sorted({d.get("retrieved_on", "") for d in docs} - {""})
    vocab = Counter(d.get("curation", {}).get("vocab_version", "") for d in docs).most_common(1)
    summary = {
        "release": {
            "version": a.release,
            "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
            "ncbi_retrieved_on": retrieved[-1] if retrieved else "",
            "vocab_version": vocab[0][0] if vocab else "",
            "n_samples": len(docs), "n_projects": len(projects),
        },
        "totals": {**counts(docs), "projects": len(projects)},
        "organisms": organisms,
        "global": {**breakdown(docs), "top_projects": [
            {"accession": p["_id"], "title": p.get("title", ""), "n": p["n_samples"],
             "n_with_reads": p["n_with_reads"], "n_with_assembly": p["n_with_assembly"]}
            for p in projects[:10]]},
        "facets": {
            "niches": tally(d.get("source_niche") for d in docs),
            "divisions": tally(d.get("division") for d in docs),
            "districts": districts,
            "platforms": tally(p for d in docs for p in d.get("platforms", [])),
            "materials": tally(d.get("sample_material") for d in docs),
            "record_types": tally(d["record_type"] for d in docs),
            "year_min": min(years_all) if years_all else None,
            "year_max": max(years_all) if years_all else None,
        },
    }

    def dump_ndjson(path, rows):
        with open(path, "w", encoding="utf-8") as f:
            for r in rows:
                f.write(json.dumps(r, ensure_ascii=False, separators=(",", ":")) + "\n")

    dump_ndjson(out / "samples.ndjson", docs)
    dump_ndjson(out / "projects.ndjson", projects)
    (out / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=1),
                                      encoding="utf-8")
    if a.copy_summary_to:
        dest = Path(a.copy_summary_to)
        dest.mkdir(parents=True, exist_ok=True)
        shutil.copy(out / "summary.json", dest / "summary.json")
    size = (out / "samples.ndjson").stat().st_size / 1e6
    print(f"wrote {out}/samples.ndjson ({size:.1f} MB), projects.ndjson ({len(projects)}), summary.json")


if __name__ == "__main__":
    main()
