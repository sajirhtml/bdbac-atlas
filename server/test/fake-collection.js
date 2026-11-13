// Minimal in-memory stand-in for a MongoDB collection, powered by `mingo` (a JS
// implementation of MongoDB's query language). Only used by tests.
import fs from "node:fs";
import { Query } from "mingo";

export function loadNdjson(file) {
  return fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
}

export class FakeCollection {
  constructor(docs) { this.docs = docs; }
  async countDocuments(filter = {}) { return new Query(filter).find(this.docs).all().length; }
  async findOne(filter = {}) { return new Query(filter).find(this.docs).all()[0] ?? null; }
  find(filter = {}, opts = {}) {
    const docs = this.docs;
    const state = { sort: null, skip: 0, limit: 0 };
    const cursor = {
      sort(s) { state.sort = s; return cursor; },
      skip(n) { state.skip = n; return cursor; },
      limit(n) { state.limit = n; return cursor; },
      async toArray() {
        let c = new Query(filter).find(docs, opts.projection);
        if (state.sort) c = c.sort(state.sort);
        if (state.skip) c = c.skip(state.skip);
        if (state.limit) c = c.limit(state.limit);
        return c.all();
      },
      async *[Symbol.asyncIterator]() { yield* await cursor.toArray(); },
    };
    return cursor;
  }
}
