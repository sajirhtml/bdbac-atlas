// Edit these to rename the site. Values marked VERIFY need a human check before launch.
export const SITE = {
  name: "BDBac Atlas",
  tagline: "Bacterial genomes from Bangladesh, with the context NCBI leaves out",
  taglineBn: "জীবাণু মানচিত্র", // VERIFY wording with a native speaker; delete if unsure
  repoUrl: import.meta.env.VITE_REPO_URL || "",
  contact: import.meta.env.VITE_CONTACT || "",
};

// Base URL of the API. Empty in dev (Vite proxies /api to localhost:5000).
export const API_BASE = import.meta.env.VITE_API_URL || "";

export const NCBI = {
  biosample: (a) => `https://www.ncbi.nlm.nih.gov/biosample/${a}`,
  bioproject: (a) => `https://www.ncbi.nlm.nih.gov/bioproject/${a}`,
  sra: (a) => `https://www.ncbi.nlm.nih.gov/sra/?term=${a}`,
  assembly: (a) => `https://www.ncbi.nlm.nih.gov/datasets/genome/${a}/`,
  taxonomy: (id) => `https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id=${id}`,
  pubmed: (id) => `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
  doi: (d) => `https://doi.org/${d}`,
};
