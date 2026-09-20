import express from "express";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);
const SCRYPT_PREFIX = "scrypt:";

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${SCRYPT_PREFIX}${salt}:${buf.toString("hex")}`;
}

async function verifyPassword(password, stored) {
  if (!stored.startsWith(SCRYPT_PREFIX)) {
    return password === stored; // legacy plaintext — migration path
  }
  const [, salt, hash] = stored.split(":");
  const buf = await scryptAsync(password, salt, 64);
  return timingSafeEqual(Buffer.from(hash, "hex"), buf);
}

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

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const USERS_FILE = join(__dirname, "data", "users.json");

function loadUsers() {
  try { return JSON.parse(readFileSync(USERS_FILE, "utf-8")); } catch { return { users: [] }; }
}
function saveUsers(data) { writeFileSync(USERS_FILE, JSON.stringify(data, null, 2)); }

const DEFAULT_CHAT_CONFIG = {
  portkey: { baseUrl: "https://aigw.portkey.ai/v1", apiKey: "", provider: "@gpt-4-1-mini", model: "gpt-4.1-mini" },
  direct:  { baseUrl: "https://jaloOpenAI.openai.azure.com/openai/v1/chat/completions", bearerToken: "", model: "gpt-4.1-mini" },
};

const app = express();
app.use(express.json());

// Allow requests from the Vite dev server
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
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
  let cfg;
  try {
    cfg = { ...DEFAULT_CHAT_CONFIG, ...JSON.parse(readFileSync(CONFIG_FILE, "utf-8")) };
  } catch {
    cfg = { ...DEFAULT_CHAT_CONFIG };
  }
  // Env vars (Azure Application Settings) take priority over the stored file.
  // Non-sensitive values reuse the VITE_* names already defined in Azure.
  // Sensitive keys use separate non-VITE_ names so they stay server-side only.
  const e = process.env;
  cfg.portkey = {
    ...cfg.portkey,
    ...(e.VITE_PORTKEY_BASE_URL   && { baseUrl:      e.VITE_PORTKEY_BASE_URL }),
    ...(e.PORTKEY_API_KEY         && { apiKey:        e.PORTKEY_API_KEY }),
    ...(e.VITE_PORTKEY_PROVIDER   && { provider:      e.VITE_PORTKEY_PROVIDER }),
    ...(e.VITE_PORTKEY_MODEL      && { model:         e.VITE_PORTKEY_MODEL }),
    ...(e.VITE_PORTKEY_SCM_REPORT_URL && { scmReportUrl: e.VITE_PORTKEY_SCM_REPORT_URL }),
  };
  cfg.direct = {
    ...cfg.direct,
    ...(e.VITE_DIRECT_BASE_URL && { baseUrl:     e.VITE_DIRECT_BASE_URL }),
    ...(e.DIRECT_BEARER_TOKEN  && { bearerToken: e.DIRECT_BEARER_TOKEN }),
    ...(e.VITE_DIRECT_MODEL    && { model:       e.VITE_DIRECT_MODEL }),
  };
  return cfg;
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

// GET /api/rag/docs — public read (no-store so clients always get fresh data)
app.get("/api/rag/docs", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
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

// POST /api/login — verifies username+password, returns token
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) return res.status(400).json({ error: "username and password required" });
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) return res.json({ token: ADMIN_PASSWORD });
  const data = loadUsers();
  const users = data.users ?? [];
  for (const user of users) {
    if (user.username === username && await verifyPassword(password, user.password)) {
      // Transparently migrate legacy plaintext to hashed on first successful login
      if (!user.password.startsWith(SCRYPT_PREFIX)) {
        user.password = await hashPassword(password);
        saveUsers(data);
      }
      return res.json({ token: ADMIN_PASSWORD });
    }
  }
  res.status(401).json({ error: "Invalid credentials" });
});

// GET /api/users — list extra admin users (no passwords returned)
app.get("/api/users", requireAuth, (req, res) => {
  res.json((loadUsers().users ?? []).map(u => ({ username: u.username })));
});

// POST /api/users — add admin user {username (email), password}
app.post("/api/users", requireAuth, async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) return res.status(400).json({ error: "username and password required" });
  const data = loadUsers();
  data.users = data.users ?? [];
  if (data.users.find(u => u.username === username)) return res.status(409).json({ error: "User already exists" });
  data.users.push({ username, password: await hashPassword(password) });
  saveUsers(data);
  res.json({ ok: true });
});

// PATCH /api/users/:username — change password for an existing user
app.patch("/api/users/:username", requireAuth, async (req, res) => {
  const { password } = req.body ?? {};
  if (!password) return res.status(400).json({ error: "password is required" });
  const data = loadUsers();
  const user = (data.users ?? []).find(u => u.username === req.params.username);
  if (!user) return res.status(404).json({ error: "User not found" });
  user.password = await hashPassword(password);
  saveUsers(data);
  res.json({ ok: true });
});

// DELETE /api/users/:username — remove admin user
app.delete("/api/users/:username", requireAuth, (req, res) => {
  const data = loadUsers();
  data.users = (data.users ?? []).filter(u => u.username !== req.params.username);
  saveUsers(data);
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
