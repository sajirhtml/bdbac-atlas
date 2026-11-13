#!/usr/bin/env python3
"""Synthetic stand-in for ncbi_bangladesh/clean (for developing/testing the site only)."""
import json
import random
import sys
from pathlib import Path

import pandas as pd

random.seed(7)
out = Path(sys.argv[1] if len(sys.argv) > 1 else "mock_clean")
out.mkdir(parents=True, exist_ok=True)

ORGS = [("Escherichia coli", 562, 140), ("Klebsiella pneumoniae", 573, 70), ("Salmonella Typhi", 90370, 40),
        ("Salmonella enterica", 28901, 20), ("Acinetobacter baumannii", 470, 8), ("Enterococcus faecium", 1352, 4),
        ("Staphylococcus aureus", 1280, 25), ("Pseudomonas aeruginosa", 287, 10),
        ("Vibrio cholerae", 666, 250), ("Mammaliicoccus sciuri", 1296, 3)]
DISTRICTS = [("Dhaka", "Dhaka"), ("Chattogram", "Chattogram"), ("Sylhet", "Sylhet"), ("Khulna", "Khulna"),
             ("Barishal", "Pirojpur"), ("Mymensingh", "Mymensingh")]
NICHES = [("Human", "Homo sapiens", 9606, "blood"), ("Livestock", "Gallus gallus", 9031, "cloacal swab"),
          ("Environment", "", None, "water"), ("Food", "Gallus gallus", 9031, "meat/carcass")]
PLATFORMS = ["ILLUMINA", "ILLUMINA", "ILLUMINA", "OXFORD_NANOPORE", "PACBIO_SMRT"]
PROJECTS = ["PRJNA962904", "PRJNA714521", "PRJNA845975", "PRJNA1130082", "PRJNA1121190", "PRJEB2000"]

rows, sra, ast_rows = [], [], []
i = 0
for group, taxid, n in ORGS:
    for _ in range(n):
        i += 1
        acc = f"SAMN{10000000 + i}"
        vib_meta_only = group == "Vibrio cholerae" and random.random() < 0.85
        reads = (not vib_meta_only) and random.random() < 0.8
        asm = (not vib_meta_only) and random.random() < 0.6
        niche, host, htax, mat = random.choice(NICHES) if random.random() < (0.1 if vib_meta_only else 0.85) else ("Unknown", "", None, "")
        div, dist = random.choice(DISTRICTS) if random.random() < 0.25 else ("", "")
        year = random.choice(range(2001, 2025)) if random.random() < 0.95 else None
        bp = "" if vib_meta_only else random.choice(PROJECTS[:5] + [""])
        platforms = ";".join(sorted({random.choice(PLATFORMS) for _ in range(random.randint(1, 2))})) if reads else ""
        has_ast = group == "Salmonella enterica" and i % 11 == 0
        pm = "12345678" if bp == "PRJNA962904" else ""
        attrs = {"geo_loc_name": f"Bangladesh: {dist}" if dist else "Bangladesh", "host": host or "missing",
                 "collection_date": str(year) if year else "missing", "isolation_source": mat}
        rows.append({
            "biosample_accession": acc, "sra_sample": f"SRS{i}" if reads else "", "bioproject_accession": bp,
            "isolate_name": f"BD-{i:05d}", "submitter_center": "icddr,b" if bp else "NIID", "first_public_date": "2021-05-01",
            "last_update": "2024-01-01", "retrieved_on": "2026-10-01", "organism_group": group,
            "species_submitted": group, "ncbi_taxid": str(taxid), "serovar_curated": "Typhi" if group == "Salmonella Typhi" else "",
            "host_name_curated": host, "host_taxid": htax or "", "host_source": "host_attribute" if host else "none",
            "source_niche": niche, "source_type": {"Human": "Human", "Livestock": "Poultry", "Environment": "Surface water", "Food": "Meat"}.get(niche, ""),
            "niche_source": "host_rule" if niche != "Unknown" else "none", "sample_material": mat, "setting": "",
            "sampling_design_hint": "surveillance" if bp else "", "selected_for_trait_hint": "ESBL" if i % 9 == 0 else "",
            "country": "BD", "division": div, "district": dist, "upazila": "",
            "location_precision": "district" if dist else "country", "location_source": "geo_loc_name" if dist else "none",
            "location_note": "", "lat": "", "lon": "", "collection_date": str(year) if year else "",
            "collection_date_precision": "year" if year else "", "collection_year": str(year) if year else "",
            "raw_organism": group, "raw_isolate": f"BD-{i:05d}", "raw_strain": "", "raw_host": host, "raw_host_disease": "",
            "raw_isolation_source": mat, "raw_geo_loc_name": attrs["geo_loc_name"], "raw_lat_lon": "",
            "raw_collection_date": attrs["collection_date"], "raw_collected_by": "", "raw_sample_type": "",
            "raw_ncbi_package": "Pathogen.cl.1.0" if bp else "", "ncbi_package": "Pathogen.cl.1.0" if bp else "",
            "package_class": "clinical_or_host_associated" if bp else "other_or_unknown",
            "n_sra_runs": "1" if reads else "", "sra_platforms": platforms, "sra_models": "NextSeq 500" if reads else "",
            "library_layouts": "PAIRED" if reads else "", "library_strategies": "WGS" if reads else "",
            "total_bases": "500000000" if reads else "", "has_long_reads": str("OXFORD" in platforms or "PACBIO" in platforms),
            "n_assemblies": "1" if asm else "", "best_assembly_accession": f"GCA_{i:09d}.1" if asm else "",
            "best_assembly_level": random.choice(["Contig", "Scaffold", "Complete Genome"]) if asm else "",
            "best_assembly_contig_n50": "250000" if asm else "", "bioproject_title": "Mock project" if bp else "",
            "bioproject_submitter": "icddr,b" if bp else "", "publication_pmids": pm, "publication_dois": "10.1000/mock" if pm else "",
            "antibiogram_n_drugs": "3" if has_ast else "0", "curation_status": "automatic", "vocab_version": "v0.1-starter",
            "has_host": str(bool(host)), "has_known_niche": str(niche != "Unknown"), "has_district": str(bool(dist)),
            "has_collection_year": str(bool(year)), "has_ast": str(has_ast), "has_raw_reads": str(reads),
            "has_assembly": str(asm), "has_publication": str(bool(pm)),
            "usable_for_analysis": str((reads or asm) and bool(year) and niche != "Unknown"),
            "all_attributes": json.dumps(attrs),
        })
        if reads:
            sra.append({"Run": f"SRR{i}", "BioSample": acc, "BioProject": bp or "PRJEB2000", "Platform": platforms.split(";")[0]})
        if has_ast:
            for ab, ph in [("ciprofloxacin", "resistant"), ("ampicillin", "resistant"), ("meropenem", "susceptible")]:
                ast_rows.append({"biosample": acc, "antibiotic": ab, "interpretation": ph, "method": "MIC", "standard": "CLSI"})

pd.DataFrame(rows).to_csv(out / "samples_curated.tsv", sep="\t", index=False)
pd.DataFrame(sra).to_csv(out / "sra_runs_bangladesh.tsv", sep="\t", index=False)
pd.DataFrame(ast_rows).to_csv(out / "ast_results.tsv", sep="\t", index=False)
pd.DataFrame([{"bioproject": p, "uid": str(k), "title": f"Mock project {p}", "description": "Synthetic description.",
               "submitter": "icddr,b", "registration_date": "2021-01-01", "data_type": "Genome sequencing"}
              for k, p in enumerate(PROJECTS[:5])]).to_csv(out / "bioprojects.tsv", sep="\t", index=False)
pd.DataFrame([{"bioproject": "PRJNA962904", "pmid": "12345678"}]).to_csv(out / "bioproject_pubmed.tsv", sep="\t", index=False)
pd.DataFrame([{"pmid": "12345678", "doi": "10.1000/mock", "title": "A mock paper", "year": "2023", "journal": "Mock J"}]).to_csv(out / "publications.tsv", sep="\t", index=False)
print(f"mock data: {len(rows)} samples -> {out}")
