import { RAG_SEED_DOCS } from "./ragSeed";

export interface RagDoc {
  path: string;
  title: string;
  folder: string;
  content: string;
}

const MANIFEST_KEY = "rag-manifest";
const FILE_PREFIX = "rag-file-";
const SEEDED_KEY = "rag-seeded";

export function initRagDocs(): void {
  if (localStorage.getItem(SEEDED_KEY)) return;
  const manifest = RAG_SEED_DOCS.map(({ path, title, folder }) => ({ path, title, folder }));
  localStorage.setItem(MANIFEST_KEY, JSON.stringify(manifest));
  for (const doc of RAG_SEED_DOCS) {
    localStorage.setItem(FILE_PREFIX + doc.path, doc.content);
  }
  localStorage.setItem(SEEDED_KEY, "1");
}

export function loadRagDocs(): RagDoc[] {
  try {
    const raw = localStorage.getItem(MANIFEST_KEY);
    if (!raw) return [];
    const manifest = JSON.parse(raw) as Array<{ path: string; title: string; folder: string }>;
    return manifest.map((entry) => ({
      ...entry,
      content: localStorage.getItem(FILE_PREFIX + entry.path) ?? "",
    }));
  } catch {
    return [];
  }
}

export function saveDoc(doc: RagDoc): void {
  try {
    const raw = localStorage.getItem(MANIFEST_KEY);
    const manifest: Array<{ path: string; title: string; folder: string }> = raw
      ? JSON.parse(raw)
      : [];
    const idx = manifest.findIndex((m) => m.path === doc.path);
    if (idx >= 0) {
      manifest[idx] = { path: doc.path, title: doc.title, folder: doc.folder };
    } else {
      manifest.push({ path: doc.path, title: doc.title, folder: doc.folder });
    }
    localStorage.setItem(MANIFEST_KEY, JSON.stringify(manifest));
    localStorage.setItem(FILE_PREFIX + doc.path, doc.content);
  } catch {
    // ignore storage errors
  }
}

export function deleteDoc(path: string): void {
  try {
    const raw = localStorage.getItem(MANIFEST_KEY);
    if (!raw) return;
    const manifest = (JSON.parse(raw) as Array<{ path: string; title: string; folder: string }>)
      .filter((m) => m.path !== path);
    localStorage.setItem(MANIFEST_KEY, JSON.stringify(manifest));
    localStorage.removeItem(FILE_PREFIX + path);
  } catch {
    // ignore storage errors
  }
}

// Simple keyword relevance search. Returns formatted context string or null.
export function searchDocs(query: string, docs: RagDoc[]): string | null {
  if (docs.length === 0) return null;

  // Tokenize: lowercase words >= 3 chars, exclude stop words
  const STOP = new Set([
    "the", "and", "for", "are", "was", "were", "has", "have", "had", "with",
    "this", "that", "from", "but", "not", "can", "will", "what", "how",
    "when", "who", "where", "which", "its", "our", "your", "their",
  ]);
  const terms = query
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length >= 3 && !STOP.has(t));

  if (terms.length === 0) return null;

  const scored = docs.map((doc) => {
    const text = (doc.title + " " + doc.content).toLowerCase();
    let score = 0;
    for (const term of terms) {
      const re = new RegExp(term, "g");
      const hits = text.match(re);
      if (hits) score += hits.length;
    }
    return { doc, score };
  });

  const relevant = scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (relevant.length === 0) return null;

  return relevant
    .map((x) => `[Document: ${x.doc.title}]\n${x.doc.content}`)
    .join("\n\n---\n\n");
}
