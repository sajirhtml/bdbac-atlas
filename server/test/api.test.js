import assert from "node:assert/strict";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { createApp } from "../src/app.js";
import { FakeCollection, loadNdjson } from "./fake-collection.js";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");
const samples = loadNdjson(path.join(dir, "samples.ndjson"));
const projects = loadNdjson(path.join(dir, "projects.ndjson"));

let server, base;
before(async () => {
  const app = createApp({
    db: { samples: new FakeCollection(samples), projects: new FakeCollection(projects) },
    release: { name: "test" },
  });
  await new Promise((r) => { server = app.listen(0, "127.0.0.1", r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const get = async (url) => {
  const res = await fetch(base + url);
  return { status: res.status, body: res.headers.get("content-type")?.includes("json") ? await res.json() : await res.text(), res };
};

describe("samples", () => {
  it("health check", async () => {
    const { status, body } = await get("/api/health");
    assert.equal(status, 200); assert.equal(body.ok, true);
  });

  it("lists all samples, paged, best-documented first", async () => {
    const { body } = await get("/api/samples");
    assert.equal(body.total, samples.length);
    assert.equal(body.items.length, 25);
    assert.equal(body.pages, Math.ceil(samples.length / 25));
    const scores = body.items.map((d) => d.completeness);
    assert.deepEqual(scores, [...scores].sort((a, b) => b - a));
    assert.ok(!("attributes" in body.items[0]), "list view must not ship heavy fields");
  });

  it("filters by organism and record type, matching an independent count", async () => {
    const want = samples.filter((d) => d.organism_slug === "vibrio-cholerae" && d.record_type === "isolate_record").length;
    const { body } = await get("/api/samples?organism=vibrio-cholerae&record_type=isolate_record&limit=100");
    assert.equal(body.total, want);
    assert.ok(body.items.every((d) => d.organism_slug === "vibrio-cholerae" && d.record_type === "isolate_record"));
  });

  it("filters by data flags and year range", async () => {
    const want = samples.filter((d) => d.has_raw_reads && d.has_assembly && d.collection_year >= 2015 && d.collection_year <= 2020).length;
    const { body } = await get("/api/samples?has=reads,assembly&year_min=2015&year_max=2020&limit=100");
    assert.equal(body.total, want);
    assert.ok(body.items.every((d) => d.collection_year >= 2015 && d.collection_year <= 2020));
  });

  it("filters by array fields (platform, project)", async () => {
    const wantP = samples.filter((d) => d.platforms?.includes("OXFORD_NANOPORE")).length;
    assert.equal((await get("/api/samples?platform=OXFORD_NANOPORE")).body.total, wantP);
    const wantB = samples.filter((d) => d.bioproject_all?.includes("PRJNA962904")).length;
    assert.equal((await get("/api/samples?project=prjna962904")).body.total, wantB);
  });

  it("searches by accession prefix and by free text", async () => {
    const acc = samples[3]._id;
    const a = await get(`/api/samples?q=${acc}`);
    assert.equal(a.body.total, 1); assert.equal(a.body.items[0]._id, acc);
    const name = samples[5].isolate_name;
    const t = await get(`/api/samples?q=${encodeURIComponent(name.toLowerCase())}`);
    assert.ok(t.body.items.some((d) => d.isolate_name === name));
  });

  it("is safe against operator injection and bad regex input", async () => {
    const all = (await get("/api/samples")).body.total;
    const inj = await get("/api/samples?organism[$ne]=x&niche[$gt]=");
    assert.equal(inj.status, 200); assert.equal(inj.body.total, all);
    const rx = await get("/api/samples?q=" + encodeURIComponent("(.*[") );
    assert.equal(rx.status, 200); assert.equal(rx.body.total, 0);
  });

  it("paginates and caps the page size", async () => {
    const p1 = (await get("/api/samples?limit=10&page=1")).body.items.map((d) => d._id);
    const p2 = (await get("/api/samples?limit=10&page=2")).body.items.map((d) => d._id);
    assert.equal(new Set([...p1, ...p2]).size, 20);
    assert.equal((await get("/api/samples?limit=9999")).body.items.length, 100);
  });

  it("returns one sample with raw + curated fields, case-insensitively", async () => {
    const d = samples.find((x) => x.raw && x.curation);
    const { status, body } = await get(`/api/samples/${d._id.toLowerCase()}`);
    assert.equal(status, 200); assert.equal(body._id, d._id);
    assert.ok(body.raw && body.curation && body.attributes);
    assert.equal((await get("/api/samples/SAMN00000000")).status, 404);
  });

  it("exports the filtered set as CSV with correct quoting", async () => {
    const want = samples.filter((d) => d.organism_slug === "salmonella-typhi").length;
    const { body, res } = await get("/api/samples.csv?organism=salmonella-typhi");
    assert.match(res.headers.get("content-type"), /text\/csv/);
    const lines = body.trim().split("\n");
    assert.equal(lines.length, want + 1);
    assert.ok(lines[0].startsWith("biosample,organism,record_type"));
  });
});

describe("projects", () => {
  it("lists projects, largest first, and filters by organism", async () => {
    const { body } = await get("/api/projects");
    assert.equal(body.total, projects.length);
    const n = body.items.map((p) => p.n_samples);
    assert.deepEqual(n, [...n].sort((a, b) => b - a));
    const org = projects.find((p) => p.organism_slugs.length)?.organism_slugs[0];
    const f = await get(`/api/projects?organism=${org}`);
    assert.ok(f.body.items.every((p) => p.organism_slugs.includes(org)));
  });

  it("returns a project with its papers, 404 otherwise", async () => {
    const withPaper = projects.find((p) => p.publications?.length);
    const { status, body } = await get(`/api/projects/${withPaper._id}`);
    assert.equal(status, 200); assert.ok(body.publications[0].doi);
    assert.equal((await get("/api/projects/PRJNA0")).status, 404);
  });

  it("unknown API routes return JSON 404", async () => {
    const { status, body } = await get("/api/nope");
    assert.equal(status, 404); assert.ok(body.error);
  });
});
