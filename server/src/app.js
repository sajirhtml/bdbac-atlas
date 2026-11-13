import { once } from "node:events";
import compression from "compression";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import {
  LIST_FIELDS, buildSampleFilter, escapeRegex, list, parsePaging, parseSort, projection,
} from "./filters.js";

const MAX_CSV_ROWS = 50000;

const CSV_COLUMNS = [
  ["biosample", (d) => d._id], ["organism", (d) => d.organism_group],
  ["record_type", (d) => d.record_type], ["isolate_name", (d) => d.isolate_name],
  ["host", (d) => d.host_name], ["host_taxid", (d) => d.host_taxid],
  ["source_niche", (d) => d.source_niche], ["source_type", (d) => d.source_type],
  ["sample_material", (d) => d.sample_material], ["setting", (d) => d.setting],
  ["division", (d) => d.division], ["district", (d) => d.district],
  ["upazila", (d) => d.upazila], ["location_precision", (d) => d.location_precision],
  ["collection_date", (d) => d.collection_date], ["collection_year", (d) => d.collection_year],
  ["bioproject", (d) => d.bioproject], ["submitter", (d) => d.submitter],
  ["has_raw_reads", (d) => d.has_raw_reads], ["has_assembly", (d) => d.has_assembly],
  ["platforms", (d) => (d.platforms ?? []).join(";")],
  ["best_assembly", (d) => d.best_assembly?.accession],
  ["pmids", (d) => (d.pmids ?? []).join(";")], ["completeness", (d) => d.completeness],
  ["curation_status", (d) => d.curation?.status],
];
const CSV_PROJECTION = projection([
  "organism_group", "record_type", "isolate_name", "host_name", "host_taxid", "source_niche",
  "source_type", "sample_material", "setting", "division", "district", "upazila",
  "location_precision", "collection_date", "collection_year", "bioproject", "submitter",
  "has_raw_reads", "has_assembly", "platforms", "best_assembly", "pmids", "completeness",
  "curation",
]);

const csvCell = (v) => {
  if (v === undefined || v === null) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// `db` = { samples, projects } (MongoDB collections, or a test double with the same methods)
export function createApp({ db, corsOrigin = "", release = {} }) {
  const app = express();
  app.set("trust proxy", 1);
  app.set("query parser", "simple"); // no nested objects from ?a[$ne]=1
  app.disable("x-powered-by");
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } })); // public read-only API
  app.use(compression());
  app.use(cors({ origin: corsOrigin ? corsOrigin.split(",").map((s) => s.trim()) : true }));
  app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: true,
                              legacyHeaders: false }));

  const wrap = (fn) => (req, res) => fn(req, res).catch((err) => {
    console.error(err);
    res.status(500).json({ error: "Something went wrong on the server. Please try again." });
  });
  const cacheable = (res) => res.set("Cache-Control", "public, max-age=300");

  app.get("/api/health", (req, res) => res.json({ ok: true, release }));

  app.get("/api/samples", wrap(async (req, res) => {
    const filter = buildSampleFilter(req.query);
    const { page, limit, skip } = parsePaging(req.query);
    const total = await db.samples.countDocuments(filter);
    const items = await db.samples
      .find(filter, { projection: projection(LIST_FIELDS) })
      .sort(parseSort(req.query)).skip(skip).limit(limit).toArray();
    cacheable(res).json({ total, page, limit, pages: Math.max(1, Math.ceil(total / limit)),
                          items });
  }));

  app.get("/api/samples.csv", rateLimit({ windowMs: 60 * 60 * 1000, limit: 30 }),
    wrap(async (req, res) => {
      const filter = buildSampleFilter(req.query);
      res.set({ "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": 'attachment; filename="bdbac_samples.csv"' });
      res.write(CSV_COLUMNS.map(([h]) => h).join(",") + "\n");
      const cursor = db.samples.find(filter, { projection: CSV_PROJECTION })
        .sort({ _id: 1 }).limit(MAX_CSV_ROWS);
      for await (const doc of cursor) {
        const line = CSV_COLUMNS.map(([, get]) => csvCell(get(doc))).join(",") + "\n";
        if (!res.write(line)) await once(res, "drain");
      }
      res.end();
    }));

  app.get("/api/samples/:accession", wrap(async (req, res) => {
    const doc = await db.samples.findOne({ _id: String(req.params.accession).toUpperCase() });
    if (!doc) return res.status(404).json({ error: "No sample with that accession." });
    cacheable(res).json(doc);
  }));

  app.get("/api/projects", wrap(async (req, res) => {
    const filter = {};
    const orgs = list(req.query.organism);
    if (orgs.length) filter.organism_slugs = { $in: orgs };
    const text = String(req.query.q ?? "").trim().slice(0, 80);
    if (text) {
      const rx = new RegExp(escapeRegex(text), "i");
      filter.$or = [{ _id: rx }, { title: rx }, { submitter: rx }];
    }
    const { page, limit, skip } = parsePaging(req.query);
    const total = await db.projects.countDocuments(filter);
    const items = await db.projects
      .find(filter, { projection: { description: 0, publications: 0 } })
      .sort({ n_samples: -1, _id: 1 }).skip(skip).limit(limit).toArray();
    cacheable(res).json({ total, page, limit, pages: Math.max(1, Math.ceil(total / limit)),
                          items });
  }));

  app.get("/api/projects/:accession", wrap(async (req, res) => {
    const doc = await db.projects.findOne({ _id: String(req.params.accession).toUpperCase() });
    if (!doc) return res.status(404).json({ error: "No project with that accession." });
    cacheable(res).json(doc);
  }));

  app.use("/api", (req, res) => res.status(404).json({ error: "Unknown API route." }));
  return app;
}
