// Renders every route against realistic data (shaped by export_for_site.py) and checks for key content.
import { cleanup, render, screen } from "@testing-library/react";
import fs from "node:fs";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App.jsx";

const read = (p) => fs.readFileSync(p, "utf8");
const summary = JSON.parse(read("public/data/summary.json"));
const ndjson = (p) => read(p).trim().split("\n").map((l) => JSON.parse(l));
const samples = ndjson("../server/test/fixtures/samples.ndjson");
const projects = ndjson("../server/test/fixtures/projects.ndjson");

const reply = (body, status = 200) => Promise.resolve({ ok: status < 400, status, json: async () => body });

beforeEach(() => {
  window.scrollTo = vi.fn();
  vi.stubGlobal("fetch", (url) => {
    const u = new URL(url, "http://localhost");
    if (u.pathname === "/data/summary.json") return reply(summary);
    let m;
    if ((m = u.pathname.match(/^\/api\/samples\/(.+)$/))) {
      const d = samples.find((s) => s._id === m[1].toUpperCase());
      return d ? reply(d) : reply({ error: "No sample with that accession." }, 404);
    }
    if (u.pathname === "/api/samples") {
      const items = samples.slice(0, 25);
      return reply({ total: samples.length, page: 1, limit: 25, pages: Math.ceil(samples.length / 25), items });
    }
    if ((m = u.pathname.match(/^\/api\/projects\/(.+)$/))) {
      const p = projects.find((x) => x._id === m[1]);
      return p ? reply(p) : reply({ error: "No project with that accession." }, 404);
    }
    if (u.pathname === "/api/projects") return reply({ total: projects.length, page: 1, limit: 20, pages: 1, items: projects });
    return reply({ error: "unmocked " + url }, 500);
  });
});
afterEach(cleanup);

const future = { v7_startTransition: true, v7_relativeSplatPath: true };
const visit = (path) => render(<MemoryRouter initialEntries={[path]} future={future}><App /></MemoryRouter>);

describe("routes render", () => {
  it("home: headline, ledger sentence, wells", async () => {
    visit("/");
    expect((await screen.findByRole("heading", { level: 1 })).textContent).toMatch(/Bacterial genomes from Bangladesh/);
    expect(screen.getByText("Ten organisms")).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /records/ }).length).toBeGreaterThanOrEqual(10);
    expect(document.querySelectorAll("svg.plate circle.dot-on").length).toBeGreaterThan(5);
  });

  it("organisms index and detail, with the metadata-only warning where it applies", async () => {
    visit("/organisms");
    expect((await screen.findAllByText("Vibrio cholerae")).length).toBeGreaterThan(0);
    cleanup();
    visit("/organisms/vibrio-cholerae");
    expect(await screen.findByText(/Most records here are not genomes/)).toBeTruthy();
    cleanup();
    visit("/organisms/escherichia-coli");
    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByText(/Most records here are not genomes/)).toBeNull();
  });

  it("unknown organism shows not-found", async () => {
    visit("/organisms/nope");
    expect(await screen.findByText("Page not found")).toBeTruthy();
  });

  it("browse: filters and a results table from the API", async () => {
    visit("/browse?organism=vibrio-cholerae&has=reads");
    expect(await screen.findByText(`${samples.length.toLocaleString("en-GB")} samples`)).toBeTruthy();
    expect(screen.getByRole("link", { name: samples[0]._id })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Remove filter Vibrio cholerae/ })).toBeTruthy();
    expect(screen.getByText(/Download these .* rows as CSV/)).toBeTruthy();
  });

  it("sample: deposited vs curated table, NCBI links", async () => {
    const d = samples.find((s) => s.has_assembly && s.pmids?.length);
    visit(`/sample/${d._id}`);
    expect(await screen.findByRole("heading", { level: 1, name: d._id })).toBeTruthy();
    expect(screen.getByText("As deposited and as curated")).toBeTruthy();
    expect(screen.getByRole("link", { name: "BioSample" }).getAttribute("href")).toContain(d._id);
    expect(screen.getByRole("link", { name: new RegExp(`PubMed ${d.pmids[0]}`) })).toBeTruthy();
  });

  it("sample: isolate-only records warn, and a missing accession says so", async () => {
    const d = samples.find((s) => s.record_type === "isolate_record");
    visit(`/sample/${d._id}`);
    expect(await screen.findByText(/No sequence data\./)).toBeTruthy();
    cleanup();
    visit("/sample/SAMN00000000");
    expect(await screen.findByText("No such sample.")).toBeTruthy();
  });

  it("sample with lab AST shows the susceptibility table", async () => {
    const d = samples.find((s) => s.ast?.length);
    visit(`/sample/${d._id}`);
    expect(await screen.findByText("Lab susceptibility results")).toBeTruthy();
  });

  it("projects list, project detail with papers, quality and about", async () => {
    visit("/projects");
    expect(await screen.findByText(`${projects.length.toLocaleString("en-GB")} projects`)).toBeTruthy();
    cleanup();
    const withPaper = projects.find((p) => p.publications?.length);
    visit(`/projects/${withPaper._id}`);
    expect(await screen.findByText(withPaper.publications[0].title)).toBeTruthy();
    cleanup();
    visit("/quality");
    expect(await screen.findByText("What this means for analysis")).toBeTruthy();
    cleanup();
    visit("/about");
    expect(await screen.findByText("How a record gets here")).toBeTruthy();
  });
});
