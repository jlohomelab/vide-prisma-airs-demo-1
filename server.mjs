import express from "express";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// Load .env if present (built-in since Node 20.12, no extra deps needed)
try { process.loadEnvFile(); } catch { /* .env not found — rely on system env */ }

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const DATA_FILE = join(__dirname, "data", "rag.json");
const CONFIG_FILE = join(__dirname, "data", "config.json");

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
  console.error("ERROR: ADMIN_PASSWORD is not set. Copy .env.example to .env and define it.");
  process.exit(1);
}

const DEFAULT_CHAT_CONFIG = {
  portkey: { baseUrl: "https://aigw.portkey.ai/v1", apiKey: "", provider: "@gpt-4-1-mini", model: "gpt-4.1-mini" },
  direct:  { baseUrl: "https://jaloOpenAI.openai.azure.com/openai/v1/chat/completions", bearerToken: "", model: "gpt-4.1-mini" },
};

const app = express();
app.use(express.json());

// Allow requests from the Vite dev server
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-password");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

function loadData() {
  try {
    return JSON.parse(readFileSync(DATA_FILE, "utf-8"));
  } catch {
    return { docs: [] };
  }
}

function saveData(data) {
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function loadConfig() {
  try {
    return { ...DEFAULT_CHAT_CONFIG, ...JSON.parse(readFileSync(CONFIG_FILE, "utf-8")) };
  } catch {
    return { ...DEFAULT_CHAT_CONFIG };
  }
}

function saveConfig(cfg) {
  writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
}

function requireAuth(req, res, next) {
  if (req.headers["x-admin-password"] !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// GET /api/rag/docs — public read
app.get("/api/rag/docs", (req, res) => {
  res.json(loadData().docs);
});

// POST /api/rag/docs — create or update a document
app.post("/api/rag/docs", requireAuth, (req, res) => {
  const { path, title, folder, content } = req.body;
  if (!path || !title || !folder) {
    return res.status(400).json({ error: "path, title, and folder are required" });
  }
  const data = loadData();
  const idx = data.docs.findIndex((d) => d.path === path);
  if (idx >= 0) {
    data.docs[idx] = { path, title, folder, content: content ?? "" };
  } else {
    data.docs.push({ path, title, folder, content: content ?? "" });
  }
  saveData(data);
  res.json({ ok: true });
});

// GET /api/config — return chat LLM config (auth required)
app.get("/api/config", requireAuth, (req, res) => {
  res.json(loadConfig());
});

// POST /api/config — save chat LLM config (auth required)
app.post("/api/config", requireAuth, (req, res) => {
  const current = loadConfig();
  const updated = {
    portkey: { ...current.portkey, ...(req.body.portkey ?? {}) },
    direct:  { ...current.direct,  ...(req.body.direct  ?? {}) },
  };
  saveConfig(updated);
  res.json(updated);
});

// DELETE /api/rag/docs — remove a document
app.delete("/api/rag/docs", requireAuth, (req, res) => {
  const { path } = req.body;
  if (!path) return res.status(400).json({ error: "path is required" });
  const data = loadData();
  data.docs = data.docs.filter((d) => d.path !== path);
  saveData(data);
  res.json({ ok: true });
});

// Serve the built frontend in production
const distPath = join(__dirname, "dist");
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  // SPA fallback — must come after static and API routes
  app.use((req, res) => {
    res.sendFile(join(distPath, "index.html"));
  });
} else {
  app.use((req, res, next) => {
    if (req.path === "/") return res.send("Run `npm run build` first to serve the frontend.");
    next();
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`RAG server running on http://0.0.0.0:${PORT}`);
  if (!existsSync(distPath)) {
    console.log("  Frontend: run `npm run dev` in a separate terminal for the Vite dev server");
  }
});
