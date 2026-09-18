export interface RagDoc {
  path: string;
  title: string;
  folder: string;
  content: string;
}

const API_BASE = "/api/rag";

export async function loadRagDocs(): Promise<RagDoc[]> {
  const res = await fetch(`${API_BASE}/docs`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Server returned ${res.status}`);
  return (await res.json()) as RagDoc[];
}

export async function saveDoc(doc: RagDoc, adminPassword: string): Promise<void> {
  const res = await fetch(`${API_BASE}/docs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-password": adminPassword,
    },
    body: JSON.stringify(doc),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" })) as { error?: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
}

export async function deleteDoc(path: string, adminPassword: string): Promise<void> {
  const res = await fetch(`${API_BASE}/docs`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "x-admin-password": adminPassword,
    },
    body: JSON.stringify({ path }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" })) as { error?: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
}

// Simple keyword relevance search. Returns formatted context string or null.
export function searchDocs(query: string, docs: RagDoc[]): string | null {
  if (docs.length === 0) return null;

  const STOP = new Set([
    "the", "and", "for", "are", "was", "were", "has", "have", "had", "with",
    "this", "that", "from", "but", "not", "can", "will", "what", "how",
    "when", "who", "where", "which", "its", "our", "your", "their",
    "of", "in", "to", "do", "be", "as", "at", "by", "an", "so", "up",
    "me", "my", "we", "us", "he", "or", "no", "go",
  ]);
  const terms = query
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length >= 2 && !STOP.has(t));

  if (terms.length === 0) return null;

  const scored = docs.map((doc) => {
    const text = (doc.title + " " + doc.content).toLowerCase();
    let score = 0;
    for (const term of terms) {
      const hits = text.match(new RegExp(term, "g"));
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
