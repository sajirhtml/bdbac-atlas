// Turns URL query parameters into a MongoDB filter. Everything is whitelisted and
// coerced to plain strings/numbers, so users cannot inject query operators.

export const FLAGS = {
  reads: "has_raw_reads",
  assembly: "has_assembly",
  long_reads: "has_long_reads",
  ast: "has_ast",
  publication: "has_publication",
  host: "has_host",
  niche: "has_known_niche",
  district: "has_district",
  year: "has_collection_year",
  usable: "usable",
};

export const SORTS = {
  completeness: { completeness: -1, collection_year: -1, _id: 1 },
  year_desc: { collection_year: -1, _id: 1 },
  accession: { _id: 1 },
};

export const LIST_FIELDS = [
  "organism_slug", "organism_group", "isolate_name", "host_name", "source_niche",
  "sample_material", "division", "district", "collection_year", "record_type",
  "has_raw_reads", "has_assembly", "platforms", "bioproject", "completeness",
  "submitter",
];

export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// "a,b" or ["a","b"] -> ["a","b"]  (max 25 items, 100 chars each)
export function list(v) {
  if (v === undefined || v === null) return [];
  const arr = Array.isArray(v) ? v : String(v).split(",");
  return arr.map((x) => String(x).trim().slice(0, 100)).filter(Boolean).slice(0, 25);
}

const intOrNull = (v) => {
  const n = Number.parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
};

const ACCESSION_LIKE = /^(SAM[NED]|PRJ|SRS|SRR|ERR|DRR|ERS|GC[AF]_)/i;

export function buildSampleFilter(q = {}) {
  const f = {};
  const add = (field, values) => { if (values.length) f[field] = { $in: values }; };

  add("organism_slug", list(q.organism));
  add("source_niche", list(q.niche));
  add("division", list(q.division));
  add("district", list(q.district));
  add("record_type", list(q.record_type));
  add("sample_material", list(q.material));
  add("platforms", list(q.platform));
  add("bioproject_all", list(q.project).map((p) => p.toUpperCase()));

  const ymin = intOrNull(q.year_min);
  const ymax = intOrNull(q.year_max);
  if (ymin !== null || ymax !== null) {
    f.collection_year = {};
    if (ymin !== null) f.collection_year.$gte = ymin;
    if (ymax !== null) f.collection_year.$lte = ymax;
  }

  for (const flag of list(q.has)) {
    if (FLAGS[flag]) f[FLAGS[flag]] = true;
  }

  const text = String(Array.isArray(q.q) ? q.q[0] : q.q ?? "").trim().slice(0, 80);
  if (text) {
    if (ACCESSION_LIKE.test(text)) {
      const rx = new RegExp("^" + escapeRegex(text.toUpperCase()));
      f.$or = [{ _id: rx }, { bioproject_all: rx }, { sra_sample: rx },
               { "best_assembly.accession": rx }];
    } else {
      const rx = new RegExp(escapeRegex(text), "i");
      f.$or = [{ isolate_name: rx }, { host_name: rx }, { district: rx },
               { submitter: rx }, { bioproject_title: rx }, { serovar: rx }];
    }
  }
  return f;
}

export function parsePaging(q = {}, defaultLimit = 25, maxLimit = 100) {
  const page = Math.max(1, intOrNull(q.page) ?? 1);
  const limit = Math.min(maxLimit, Math.max(1, intOrNull(q.limit) ?? defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

export function parseSort(q = {}) {
  const key = String(q.sort ?? "completeness");
  return SORTS[key] ?? SORTS.completeness;
}

export const projection = (fields) => Object.fromEntries(fields.map((f) => [f, 1]));
