// Loads site_data/samples.ndjson and projects.ndjson (made by data-prep/export_for_site.py)
// into MongoDB and creates indexes.  Usage:  npm run seed   (needs MONGODB_URI)
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { MongoClient } from "mongodb";
import dns from "node:dns";

const dns = require('node:dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
if (process.env.DNS_SERVERS) dns.setServers(process.env.DNS_SERVERS.split(","));

const uri = process.env.MONGODB_URI;
if (!uri) { console.error("MONGODB_URI is not set."); process.exit(1); }
const dataDir = path.resolve(process.env.DATA_DIR || "../site_data");

async function load(coll, file) {
  const p = path.join(dataDir, file);
  if (!fs.existsSync(p)) throw new Error(`Missing ${p}. Run data-prep/export_for_site.py first.`);
  await coll.deleteMany({});
  const rl = readline.createInterface({ input: fs.createReadStream(p, "utf8") });
  let batch = [], n = 0;
  for await (const line of rl) {
    if (!line.trim()) continue;
    batch.push(JSON.parse(line));
    if (batch.length >= 1000) { await coll.insertMany(batch, { ordered: false }); n += batch.length; batch = []; }
  }
  if (batch.length) { await coll.insertMany(batch, { ordered: false }); n += batch.length; }
  console.log(`${coll.collectionName}: inserted ${n}`);
}

const client = new MongoClient(uri);
await client.connect();
const db = client.db(process.env.MONGODB_DB || "bdbac");
const samples = db.collection("samples");
const projects = db.collection("projects");

await load(samples, "samples.ndjson");
await load(projects, "projects.ndjson");

for (const spec of [
  { organism_slug: 1, completeness: -1 }, { source_niche: 1 }, { division: 1 }, { district: 1 },
  { collection_year: 1 }, { record_type: 1 }, { platforms: 1 }, { bioproject_all: 1 },
  { sample_material: 1 }, { sra_sample: 1 }, { completeness: -1, collection_year: -1 },
]) await samples.createIndex(spec);
await projects.createIndex({ organism_slugs: 1 });
await projects.createIndex({ n_samples: -1 });
console.log("indexes created");
await client.close();
