import { useEffect, useRef, useState } from "react";
import { API_BASE } from "./config.js";

let summaryPromise = null;
export function loadSummary() {
  summaryPromise ??= fetch("/data/summary.json").then((r) => {
    if (!r.ok) throw new Error("summary.json not found");
    return r.json();
  });
  return summaryPromise;
}

// Static, precomputed numbers (instant, never waits on the API server).
export function useSummary() {
  const [state, setState] = useState({ data: null, error: null });
  useEffect(() => {
    let alive = true;
    loadSummary().then((data) => alive && setState({ data, error: null }),
                       (error) => alive && setState({ data: null, error }));
    return () => { alive = false; };
  }, []);
  return state;
}

export function buildQuery(params = {}) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length)) continue;
    sp.set(k, Array.isArray(v) ? v.join(",") : String(v));
  }
  return sp.toString();
}

export const apiUrl = (path, params) => {
  const qs = buildQuery(params);
  return `${API_BASE}${path}${qs ? `?${qs}` : ""}`;
};

// Live data from the API. `slow` flips on after 3.5 s so the UI can explain a cold start.
export function useApi(path, params) {
  const key = apiUrl(path, params);
  const [state, setState] = useState({ data: null, error: null, loading: true, slow: false });
  const first = useRef(true);
  useEffect(() => {
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null, slow: false }));
    const timer = setTimeout(() => setState((s) => (s.loading ? { ...s, slow: true } : s)), 3500);
    fetch(key, { signal: ctrl.signal })
      .then(async (r) => {
        const body = await r.json().catch(() => null);
        if (!r.ok) throw Object.assign(new Error(body?.error || `Request failed (${r.status})`), { status: r.status });
        return body;
      })
      .then((data) => setState({ data, error: null, loading: false, slow: false }))
      .catch((error) => { if (error.name !== "AbortError") setState({ data: null, error, loading: false, slow: false }); })
      .finally(() => clearTimeout(timer));
    first.current = false;
    return () => { ctrl.abort(); clearTimeout(timer); };
  }, [key]);
  return state;
}
