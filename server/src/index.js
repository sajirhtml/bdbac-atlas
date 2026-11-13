import "dotenv/config";
import { MongoClient } from "mongodb";
import { createApp } from "./app.js";
import dns from 'node:dns';
// const dns = require('node:dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
if (process.env.DNS_SERVERS) dns.setServers(process.env.DNS_SERVERS.split(","));

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set. Copy .env.example to .env and fill it in.");
  process.exit(1);
}

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000, maxPoolSize: 10 });
await client.connect();
const db = client.db(process.env.MONGODB_DB || "bdbac");

const app = createApp({
  db: { samples: db.collection("samples"), projects: db.collection("projects") },
  corsOrigin: process.env.CORS_ORIGIN || "",
  release: { name: process.env.RELEASE_NAME || "dev" },
});

const port = Number(process.env.PORT) || 5000;
const server = app.listen(port, () => console.log(`API listening on :${port}`));
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => server.close(() => client.close().then(() => process.exit(0))));
}
