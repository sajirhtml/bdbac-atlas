# BDBac Atlas (working title)

A searchable atlas of public bacterial records from Bangladesh: NCBI data plus the curated metadata
(host, source, place, year) produced by `scripts/enrich_metadata.py`. MERN stack, designed to run on free tiers.

## Repository layout

- `client/` - React/Vite website
- `server/` - Express/MongoDB API
- `data-prep/` - exports and mock-data tooling for the website
- `scripts/` - NCBI download, curation, diagnostics, and legacy seeding scripts
- `ncbi_bangladesh/` - local raw and curated data (ignored by Git)
- `site_data/` - generated API seed/export files (ignored by Git)
- `docs/` and `archive/` - project notes and older bundles

```
scripts/ncbi_bangladesh.py -> scripts/enrich_metadata.py -> data-prep/export_for_site.py
                                              |-- samples.ndjson, projects.ndjson -> npm run seed -> MongoDB Atlas
                                              |                                                         |
                                              |                                          server/ (Express API, read-only)
                                              '-- summary.json -> client/public/data/        |
                                                                   client/ (React + Vite) <---'
```

**Static-first:** the home, organism, quality and about pages read `summary.json` and never wait for the API.
Only Browse, Sample and Project pages call the API, so a sleeping free server only affects those.

## Run locally

```bash
# 1. Build the site data from your curated tables (needs pandas)
python data-prep/export_for_site.py --in path/to/ncbi_bangladesh/clean --out site_data \
       --release 0.1.0 --copy-summary-to client/public/data

# 2. Database: create a free MongoDB Atlas M0 cluster, a database user, and allow your IP
cd server && cp .env.example .env     # paste MONGODB_URI
npm install && npm run seed           # loads ~34k samples and creates indexes
npm run dev                           # API on :5000

# 3. Website (second terminal)
cd client && npm install && npm run dev   # http://localhost:5173 (proxies /api to :5000)
```

## Separate website development

Keep the repository as the source of truth and create a Git worktree beside it after
committing the cleanup:

```powershell
git add -A
git commit -m "Organize project folders"
git worktree add ..\biotech2-website-dev -b website-dev
Set-Location ..\biotech2-website-dev\client
npm install
npm run dev
```

The worktree contains the repository history, but website work should stay under
`client/`. Run the API from either worktree with `Set-Location server; npm run dev`.
For a deployed API, set `VITE_API_URL` in the website worktree's environment.

No data yet? `python data-prep/dev/make_mock_data.py /tmp/mock && python data-prep/export_for_site.py --in /tmp/mock --out site_data --release 0.0.0-MOCK-DATA --copy-summary-to client/public/data`
(the repo ships a mock `summary.json` so the front end renders immediately; **replace it before deploying**).

Run the data scripts from the repository root, for example:

```bash
python scripts/ncbi_bangladesh.py --stage all
python scripts/enrich_metadata.py
python scripts/diagnose.py
```

## Deploy for free

1. **Database:** MongoDB Atlas M0 (free, 512 MB). Network access: allow `0.0.0.0/0` (Render IPs change), use a strong
   database password. Run `npm run seed` once from your laptop with the Atlas `MONGODB_URI`.
2. **API:** Render web service (free). Use `render.yaml`, or set root directory `server`, build `npm install`,
   start `npm start`, health check `/api/health`. Env vars: `MONGODB_URI`, `MONGODB_DB=bdbac`,
   `CORS_ORIGIN=https://your-frontend-url`.
3. **Website:** Vercel, Netlify or Cloudflare Pages. Root `client`, build `npm run build`, output `dist`,
   env `VITE_API_URL=https://your-api.onrender.com`. SPA rewrites are already included
   (`vercel.json`, `public/_redirects`).
4. **Free web services sleep** after 15 idle minutes and take about a minute to wake. The UI says so while it waits.
   Options: accept it, ping `/api/health` every ~10 minutes with a free uptime monitor, or move the API to an always-on
   host paid from student credits (see below).
5. **Students:** with the GitHub Student Developer Pack, check the pack page for current offers. At the time of writing,
   third-party summaries list Azure credit, a monthly Heroku credit, MongoDB Atlas credit and a free first-year domain.
   Offers change (the DigitalOcean credit ended in 2026), so confirm before relying on any of them.

## Releasing new data

Re-run the pipeline, then `export_for_site.py` with a new `--release`, copy `summary.json`, `npm run seed`
(it replaces both collections), redeploy the client. Archive each release (Zenodo gives a free DOI).

## Tests

```bash
cd server && npm test     # 13 API tests (filters, search, paging, CSV, injection safety) using an in-memory Mongo engine
cd client && npm test     # renders every route against realistic data
```

## Before launch checklist

- [ ] Replace the mock `client/public/data/summary.json` with your export
- [ ] Fill the `[bracketed]` placeholders in `client/src/pages/About.jsx` (citation, DOI, validation accuracy)
- [ ] Check the Bengali tagline in `client/src/config.js` with a native speaker, or delete it
- [ ] Set `VITE_CONTACT` / `VITE_REPO_URL`
- [ ] Rotate the NCBI API key and keep keys out of Git
- [ ] Choose licences: code (e.g. MIT) and your curated annotations (e.g. CC BY 4.0). NCBI records keep their submitters' credit.

## Roadmap

1. **Data hardening:** curation vocabulary v0.2 (underscored hosts like `Homo_sapiens`, waterfowl and plant hosts, fish and
   shrimp names, caecal contents, more place names such as Mathbaria, Kuakata, Hajiganj, Maheshkhali), fetch BioProject
   titles for projects recovered from SRA, review the 378 records dropped by the country check.
2. **Validation:** hand-check about 300 stratified records and publish the accuracy of the host/source/place rules.
3. **Genome layer:** AMRFinderPlus, MLST, plasmid replicons and species checks on the ~8,000 assemblies, shown on sample
   pages and as filters.
4. **Curation from papers** for the largest projects; community corrections.
5. **Data descriptor paper** and a Zenodo release.
