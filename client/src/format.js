export const fmt = (n) => (n === undefined || n === null ? "–" : Number(n).toLocaleString("en-GB"));
export const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);
export const pctText = (n, d) => (d ? `${((n / d) * 100).toFixed(n / d < 0.1 ? 1 : 0)}%` : "–");

export const NICHE_ORDER = ["Human", "Livestock", "Food", "Environment", "Aquatic animal",
  "Companion animal", "Wild animal", "Plant", "Unknown"];
export const PLATFORM_LABEL = { ILLUMINA: "Illumina", OXFORD_NANOPORE: "Nanopore", PACBIO_SMRT: "PacBio",
  ION_TORRENT: "Ion Torrent", DNBSEQ: "DNBSEQ", LS454: "454", BGISEQ: "BGISEQ" };
export const platformLabel = (p) => PLATFORM_LABEL[p] || p;
export const RECORD_TYPE_LABEL = { sequenced: "Has sequence data", isolate_record: "Isolate record only" };

// How a curated value was decided, in plain words
export const BASIS = {
  host_attribute: "from the host field", text_inferred: "inferred from other text",
  host_rule: "from the host", text_rule: "from the source text", geo_loc_name: "from the location field",
  none: "not available", biosample: "from the BioSample", sra_runinfo: "recovered from SRA",
};
