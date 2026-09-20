import { type JSX, useEffect, useRef, useState } from "react";
import { deleteDoc, loadRagDocs, saveDoc, type RagDoc } from "../utils/rag";
import { useTheme } from "../contexts/ThemeContext";
import { useLanguage } from "../contexts/LanguageContext";

const CLR_BLUE = "#4FC3F7";
const CLR_ORANGE = "#FF6B2B";
const CLR_TEAL = "#00C9A7";

const ADMIN_PW_KEY = "chat-admin-password";

const DEFAULT_SCM_URL: string = (import.meta.env.VITE_PORTKEY_SCM_REPORT_URL as string | undefined) ?? "";

function buildAdminTheme(darkMode: boolean) {
  const NODE_BG = "#1E2028";
  const NODE_BORDER = "#2A2D37";
  return darkMode
    ? {
        modalBg:      "#0F1015",
        modalBorder:  NODE_BORDER,
        headerBg:     "#13141A",
        cardBg:       NODE_BG,
        cardBorder:   NODE_BORDER,
        inputBg:      "#0D0E12",
        textPrimary:  "#FFFFFF",
        textSecondary:"#9CA3AF",
        textMuted:    "#6B7280",
        rowHoverBg:   "#22232C",
        paneBg:       "#13141A",
        paneBorder:   NODE_BORDER,
        btnBg:        "#1A1B22",
        btnBorder:    NODE_BORDER,
        btnText:      "#9CA3AF",
        saveBtnBg:    CLR_BLUE + "22",
        unsavedColor: "#F59E0B",
        errorBg:      "#FF4D6A0D",
        errorBorder:  "#FF4D6A30",
        divider:      NODE_BORDER,
        tabsBg:       "#0D0E12",
        labelText:    "#9CA3AF",
        codeBg:       "#0D0E12",
        codeText:     "#6B7280",
        codeLabel:    "#4B5563",
      }
    : {
        modalBg:      "#FFFFFF",
        modalBorder:  "#D1D5DB",
        headerBg:     "#F5F7FA",
        cardBg:       "#F1F5F9",
        cardBorder:   "#D1D5DB",
        inputBg:      "#FFFFFF",
        textPrimary:  "#111827",
        textSecondary:"#4B5563",
        textMuted:    "#9CA3AF",
        rowHoverBg:   "#E2E8F0",
        paneBg:       "#FFFFFF",
        paneBorder:   "#D1D5DB",
        btnBg:        "#FFFFFF",
        btnBorder:    "#D1D5DB",
        btnText:      "#6B7280",
        saveBtnBg:    CLR_BLUE + "15",
        unsavedColor: "#D97706",
        errorBg:      "#FEF2F2",
        errorBorder:  "#FECACA",
        divider:      "#E2E8F0",
        tabsBg:       "#F1F5F9",
        labelText:    "#6B7280",
        codeBg:       "#F1F5F9",
        codeText:     "#6B7280",
        codeLabel:    "#4B5563",
      };
}

interface PortkeyConfig {
  baseUrl: string;
  provider: string;
  apiKey: string;
  model: string;
  scmReportUrl: string;
}

interface DirectConfig {
  baseUrl: string;
  bearerToken: string;
  model: string;
}

interface ChatConfig {
  portkey: PortkeyConfig;
  direct: DirectConfig;
}

const DEFAULT_CONFIG: ChatConfig = {
  portkey: {
    baseUrl: (import.meta.env.VITE_PORTKEY_BASE_URL as string | undefined) ?? "https://aigw.portkey.ai/v1",
    provider: (import.meta.env.VITE_PORTKEY_PROVIDER as string | undefined) ?? "@gpt-4-1-mini",
    apiKey: "",
    model: (import.meta.env.VITE_PORTKEY_MODEL as string | undefined) ?? "gpt-4.1-mini",
    scmReportUrl: DEFAULT_SCM_URL,
  },
  direct: {
    baseUrl: (import.meta.env.VITE_DIRECT_BASE_URL as string | undefined) ?? "https://jaloOpenAI.openai.azure.com/openai/v1/chat/completions",
    bearerToken: "",
    model: (import.meta.env.VITE_DIRECT_MODEL as string | undefined) ?? "gpt-4.1-mini",
  },
};

async function fetchConfig(password: string): Promise<ChatConfig> {
  const res = await fetch("/api/config", { headers: { "x-admin-password": password } });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<ChatConfig>;
}

async function pushConfig(password: string, cfg: ChatConfig): Promise<void> {
  const res = await fetch("/api/config", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-password": password },
    body: JSON.stringify(cfg),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || String(res.status));
  }
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

// ── Icons ────────────────────────────────────────────────────────────────────

function LockIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function FolderIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function FileIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function CloseIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function TrashIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function UserIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

// ── ConfigField ───────────────────────────────────────────────────────────────

function ConfigField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  th,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  th: ReturnType<typeof buildAdminTheme>;
}): JSX.Element {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: th.labelText }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg px-3 py-2 text-sm placeholder-gray-500 focus:outline-none transition-colors"
        style={{ background: th.inputBg, border: `1px solid ${th.cardBorder}`, color: th.textPrimary }}
        onFocus={(e) => { e.target.style.borderColor = CLR_BLUE; }}
        onBlur={(e) => { e.target.style.borderColor = th.cardBorder; }}
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminPage({ onScmReportUrl }: {
  onScmReportUrl?: (template: string) => void;
}): JSX.Element {
  const { darkMode } = useTheme();
  const th = buildAdminTheme(darkMode);
  const { t } = useLanguage();

  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [adminToken, setAdminToken] = useState("");

  // Login form
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState<"chat" | "kb" | "users">("chat");

  // ── Chat Settings tab ──────────────────────────────────────────────────────
  const [draftConfig, setDraftConfig] = useState<ChatConfig>(DEFAULT_CONFIG);
  const [configTab, setConfigTab] = useState<"portkey" | "direct">("portkey");
  const [configLoading, setConfigLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveDone, setSaveDone] = useState(false);

  // ── Knowledge Base tab ─────────────────────────────────────────────────────
  const [docs, setDocs] = useState<RagDoc[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const configSavedRef = useRef(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFileForFolder, setNewFileForFolder] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // ── Users tab ──────────────────────────────────────────────────────────────
  const [users, setUsers] = useState<{ username: string }[]>([]);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [userError, setUserError] = useState<string | null>(null);
  const [userLoading, setUserLoading] = useState(false);
  const [changePwUser, setChangePwUser] = useState<string | null>(null);
  const [changePwValue, setChangePwValue] = useState("");
  const [changePwLoading, setChangePwLoading] = useState(false);
  const [changePwError, setChangePwError] = useState<string | null>(null);

  const folders = [...new Set(docs.map((d) => d.folder))].sort();

  // Auto-authenticate from localStorage on open
  useEffect(() => {
    if (!open) return;
    const stored = localStorage.getItem(ADMIN_PW_KEY);
    if (stored) {
      setAdminToken(stored);
      setAuthed(true);
    }
  }, [open]);

  // Load KB docs when KB tab is active and authed
  useEffect(() => {
    if (authed && activeTab === "kb") void reloadDocs();
  }, [authed, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load users when users tab is active and authed
  useEffect(() => {
    if (authed && activeTab === "users") void reloadUsers();
  }, [authed, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load config when chat tab is active and authed
  useEffect(() => {
    if (authed && activeTab === "chat" && adminToken) void loadChatConfig(adminToken);
  }, [authed, activeTab, adminToken]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLogin() {
    if (!loginUsername || !loginPassword) {
      setLoginError(t("error.usernamePasswordRequired"));
      return;
    }
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      const json = await res.json() as { token?: string; error?: string };
      if (!res.ok) {
        setLoginError(json.error ?? t("error.invalidCredentials"));
        return;
      }
      const token = json.token ?? "";
      localStorage.setItem(ADMIN_PW_KEY, token);
      setAdminToken(token);
      setAuthed(true);
    } catch {
      setLoginError(t("error.networkErrorServer"));
    } finally {
      setLoginLoading(false);
    }
  }

  function handleClose() {
    if (configSavedRef.current) { window.location.reload(); return; }
    setOpen(false);
    setAuthed(false);
    setAdminToken("");
    setLoginUsername("");
    setLoginPassword("");
    setLoginError(null);
    setSelectedPath(null);
    setDirty(false);
    setSaveDone(false);
    setSaveError(null);
    setConfigError(null);
    setUserError(null);
  }

  function handleLogout() {
    localStorage.removeItem(ADMIN_PW_KEY);
    setAuthed(false);
    setAdminToken("");
    setLoginUsername("");
    setLoginPassword("");
  }

  // ── Chat Settings ──────────────────────────────────────────────────────────

  async function loadChatConfig(password: string) {
    if (!password) return;
    setConfigLoading(true);
    setConfigError(null);
    try {
      const cfg = await fetchConfig(password);
      setDraftConfig(cfg);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load config";
      setConfigError(msg === "401" ? t("admin.wrongPassword") : t("admin.loadFailed", { msg }));
    } finally {
      setConfigLoading(false);
    }
  }

  async function saveChatConfig() {
    setSaveError(null);
    setSaveDone(false);
    setConfigLoading(true);
    try {
      await pushConfig(adminToken, draftConfig);
      onScmReportUrl?.(draftConfig.portkey.scmReportUrl || DEFAULT_SCM_URL);
      setSaveDone(true);
      configSavedRef.current = true;
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setConfigLoading(false);
    }
  }

  // ── Knowledge Base ─────────────────────────────────────────────────────────

  async function reloadDocs() {
    try {
      const loaded = await loadRagDocs();
      setDocs(loaded);
      setLoadError(false);
      const exp: Record<string, boolean> = {};
      for (const f of [...new Set(loaded.map((d) => d.folder))]) exp[f] = true;
      setExpanded(exp);
    } catch {
      setLoadError(true);
    }
  }

  function selectDoc(path: string) {
    const doc = docs.find((d) => d.path === path);
    if (!doc) return;
    setSelectedPath(path);
    setEditTitle(doc.title);
    setEditContent(doc.content);
    setDirty(false);
  }

  async function handleSaveDoc() {
    if (!selectedPath) return;
    const folder = selectedPath.split("/")[0];
    const doc: RagDoc = { path: selectedPath, title: editTitle, folder, content: editContent };
    await saveDoc(doc, adminToken);
    await reloadDocs();
    setDirty(false);
  }

  async function handleDeleteDoc() {
    if (!selectedPath) return;
    if (!confirm(t("admin.confirmDelete", { title: editTitle }))) return;
    await deleteDoc(selectedPath, adminToken);
    await reloadDocs();
    setSelectedPath(null);
    setDirty(false);
  }

  async function handleCreateFolder() {
    const slug = slugify(newFolderName.trim());
    if (!slug) return;
    const path = `${slug}/.keep`;
    const doc: RagDoc = { path, title: ".keep", folder: slug, content: "" };
    await saveDoc(doc, adminToken);
    await reloadDocs();
    setShowNewFolder(false);
    setNewFolderName("");
    setExpanded((e) => ({ ...e, [slug]: true }));
  }

  async function handleCreateFile(folder: string) {
    const slug = slugify(newFileName.trim());
    if (!slug) return;
    const path = `${folder}/${slug}.txt`;
    const doc: RagDoc = { path, title: newFileName.trim(), folder, content: "" };
    await saveDoc(doc, adminToken);
    await reloadDocs();
    setNewFileForFolder(null);
    setNewFileName("");
    selectDoc(path);
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  async function reloadUsers() {
    try {
      const res = await fetch("/api/users", { headers: { "x-admin-password": adminToken } });
      if (!res.ok) throw new Error(`${res.status}`);
      setUsers(await res.json() as { username: string }[]);
    } catch {
      setUsers([]);
    }
  }

  async function handleAddUser() {
    if (!newUserEmail || !newUserPassword) {
      setUserError(t("error.emailPasswordRequired"));
      return;
    }
    setUserLoading(true);
    setUserError(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": adminToken },
        body: JSON.stringify({ username: newUserEmail, password: newUserPassword }),
      });
      const json = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) { setUserError(json.error ?? t("error.failedToAddUser")); return; }
      setNewUserEmail("");
      setNewUserPassword("");
      await reloadUsers();
    } catch {
      setUserError(t("error.networkError"));
    } finally {
      setUserLoading(false);
    }
  }

  async function handleDeleteUser(username: string) {
    if (!confirm(t("admin.confirmRemoveUser", { username }))) return;
    try {
      await fetch(`/api/users/${encodeURIComponent(username)}`, {
        method: "DELETE",
        headers: { "x-admin-password": adminToken },
      });
      await reloadUsers();
    } catch {
      // silently ignore
    }
  }

  async function handleChangePassword(username: string) {
    if (!changePwValue) { setChangePwError(t("error.newPasswordRequired")); return; }
    setChangePwLoading(true);
    setChangePwError(null);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(username)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-password": adminToken },
        body: JSON.stringify({ password: changePwValue }),
      });
      const json = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) { setChangePwError(json.error ?? t("error.failedToChangePassword")); return; }
      setChangePwUser(null);
      setChangePwValue("");
    } catch {
      setChangePwError(t("error.networkError"));
    } finally {
      setChangePwLoading(false);
    }
  }

  const inputBase = {
    background: th.inputBg,
    border: `1px solid ${th.cardBorder}`,
    color: th.textPrimary,
  } as const;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-28 z-40 flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all shadow-lg"
        style={{
          background: th.headerBg,
          borderColor: th.cardBorder,
          color: th.textMuted,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = CLR_ORANGE + "80";
          e.currentTarget.style.color = CLR_ORANGE;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = th.cardBorder;
          e.currentTarget.style.color = th.textMuted;
        }}
        title={t("admin.buttonTitle")}
      >
        <LockIcon />
        {t("admin.button")}
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
        >
          <div
            className="relative rounded-2xl border shadow-2xl flex flex-col overflow-hidden"
            style={{
              width: "min(960px, 95vw)",
              height: "min(680px, 92vh)",
              background: th.modalBg,
              borderColor: th.modalBorder,
            }}
          >
            {/* ── Login gate ── */}
            {!authed ? (
              <div className="flex flex-col items-center justify-center flex-1 p-8">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
                  style={{ background: CLR_ORANGE + "15", border: `1px solid ${CLR_ORANGE}30`, color: CLR_ORANGE }}
                >
                  <LockIcon />
                </div>
                <h2 className="font-bold text-lg mb-1" style={{ color: th.textPrimary }}>{t("admin.consoleTitle")}</h2>
                <p className="text-xs mb-6" style={{ color: th.textMuted }}>{t("admin.loginSubtitle")}</p>
                <div className="w-full max-w-xs flex flex-col gap-3">
                  <input
                    type="text"
                    value={loginUsername}
                    onChange={(e) => { setLoginUsername(e.target.value); setLoginError(null); }}
                    onKeyDown={(e) => e.key === "Enter" && void handleLogin()}
                    placeholder={t("admin.usernamePlaceholder")}
                    autoFocus
                    className="w-full rounded-lg px-4 py-2.5 text-sm placeholder-gray-500 focus:outline-none transition-colors"
                    style={{ ...inputBase, borderColor: loginError ? "#FF4D6A" : th.cardBorder }}
                    onFocus={(e) => { if (!loginError) e.target.style.borderColor = CLR_BLUE; }}
                    onBlur={(e) => { if (!loginError) e.target.style.borderColor = th.cardBorder; }}
                  />
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => { setLoginPassword(e.target.value); setLoginError(null); }}
                    onKeyDown={(e) => e.key === "Enter" && void handleLogin()}
                    placeholder={t("admin.passwordPlaceholder")}
                    className="w-full rounded-lg px-4 py-2.5 text-sm placeholder-gray-500 focus:outline-none transition-colors"
                    style={{ ...inputBase, borderColor: loginError ? "#FF4D6A" : th.cardBorder }}
                    onFocus={(e) => { if (!loginError) e.target.style.borderColor = CLR_BLUE; }}
                    onBlur={(e) => { if (!loginError) e.target.style.borderColor = th.cardBorder; }}
                  />
                  {loginError && (
                    <p className="text-xs text-center" style={{ color: "#FF4D6A" }}>{loginError}</p>
                  )}
                  <button
                    onClick={() => void handleLogin()}
                    disabled={loginLoading}
                    className="w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ background: CLR_ORANGE, color: "#fff" }}
                  >
                    {loginLoading ? t("admin.signingIn") : t("admin.signIn")}
                  </button>
                  <button
                    onClick={handleClose}
                    className="w-full py-2 rounded-lg text-xs transition-colors"
                    style={{ color: th.textMuted }}
                  >
                    {t("admin.cancel")}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* ── Header ── */}
                <div
                  className="flex items-center px-5 py-3 border-b shrink-0 gap-3"
                  style={{ borderColor: th.cardBorder, background: th.headerBg }}
                >
                  <span className="text-sm font-bold" style={{ color: th.textPrimary }}>{t("admin.consoleTitle")}</span>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: CLR_TEAL + "18", color: CLR_TEAL }}
                  >
                    {t("admin.authenticated")}
                  </span>

                  {/* Tab bar */}
                  <div className="flex gap-1 ml-4 p-1 rounded-lg" style={{ background: th.tabsBg }}>
                    {(["chat", "kb", "users"] as const).map((tab) => {
                      const labels = { chat: t("admin.tabs.chatSettings"), kb: t("admin.tabs.kb"), users: t("admin.tabs.users") };
                      const colors = { chat: CLR_BLUE, kb: CLR_ORANGE, users: CLR_TEAL };
                      return (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-md transition-colors"
                          style={
                            activeTab === tab
                              ? { background: colors[tab] + "22", color: colors[tab], border: `1px solid ${colors[tab]}40` }
                              : { color: th.textMuted, border: "1px solid transparent" }
                          }
                        >
                          {labels[tab]}
                        </button>
                      );
                    })}
                  </div>

                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={handleLogout}
                      className="px-3 py-1.5 text-xs rounded-lg border transition-colors"
                      style={{ color: th.textMuted, borderColor: th.cardBorder }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "#FF4D6A"; e.currentTarget.style.borderColor = "#FF4D6A40"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = th.textMuted; e.currentTarget.style.borderColor = th.cardBorder; }}
                    >
                      {t("admin.logout")}
                    </button>
                    <button
                      onClick={handleClose}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: th.textMuted }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = th.textPrimary; e.currentTarget.style.background = th.cardBg; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = th.textMuted; e.currentTarget.style.background = "transparent"; }}
                    >
                      <CloseIcon />
                    </button>
                  </div>
                </div>

                {/* ── Tab content ── */}
                <div className="flex-1 min-h-0 overflow-hidden">

                  {/* ── Chat Settings tab ── */}
                  {activeTab === "chat" && (
                    <div className="h-full overflow-y-auto p-6">
                      {configError && (
                        <p className="text-xs mb-4" style={{ color: "#FF4D6A" }}>{configError}</p>
                      )}

                      {/* Sub-tabs */}
                      <div className="flex gap-1 mb-5 p-1 rounded-lg" style={{ background: th.tabsBg }}>
                        {(["portkey", "direct"] as const).map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setConfigTab(tab)}
                            className="flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors"
                            style={
                              configTab === tab
                                ? {
                                    background: tab === "portkey" ? CLR_BLUE + "22" : CLR_ORANGE + "22",
                                    color: tab === "portkey" ? CLR_BLUE : CLR_ORANGE,
                                    border: `1px solid ${tab === "portkey" ? CLR_BLUE + "40" : CLR_ORANGE + "40"}`,
                                  }
                                : { color: th.textMuted, border: "1px solid transparent" }
                            }
                          >
                            {tab === "portkey" ? t("admin.portkey") : t("admin.directLlm")}
                          </button>
                        ))}
                      </div>

                      {/* Portkey fields */}
                      {configTab === "portkey" && (
                        <div className="flex flex-col gap-4">
                          <ConfigField th={th} label="API Base URL" value={draftConfig.portkey.baseUrl}
                            onChange={(v) => setDraftConfig((p) => ({ ...p, portkey: { ...p.portkey, baseUrl: v } }))}
                            placeholder="https://aigw.portkey.ai/v1" />
                          <ConfigField th={th} label="x-portkey-api-key" value={draftConfig.portkey.apiKey} type="password"
                            onChange={(v) => setDraftConfig((p) => ({ ...p, portkey: { ...p.portkey, apiKey: v } }))}
                            placeholder="Your Portkey API key" />
                          <ConfigField th={th} label="x-portkey-provider (optional)" value={draftConfig.portkey.provider}
                            onChange={(v) => setDraftConfig((p) => ({ ...p, portkey: { ...p.portkey, provider: v } }))}
                            placeholder="e.g. @gpt-4-1-mini" />
                          <ConfigField th={th} label="Model" value={draftConfig.portkey.model}
                            onChange={(v) => setDraftConfig((p) => ({ ...p, portkey: { ...p.portkey, model: v } }))}
                            placeholder="gpt-4.1-mini" />
                          <ConfigField th={th} label="SCM Report URL (use ${sessionId} as placeholder)"
                            value={draftConfig.portkey.scmReportUrl ?? DEFAULT_SCM_URL}
                            onChange={(v) => setDraftConfig((p) => ({ ...p, portkey: { ...p.portkey, scmReportUrl: v } }))}
                            placeholder={DEFAULT_SCM_URL} />
                          <div className="rounded-lg px-3 py-2.5 text-xs font-mono" style={{ background: th.codeBg, color: th.codeText }}>
                            <span style={{ color: th.codeLabel }}>POST </span>
                            <span style={{ color: CLR_BLUE + "CC" }}>{draftConfig.portkey.baseUrl || "https://aigw.portkey.ai/v1"}/chat/completions</span>
                          </div>
                        </div>
                      )}

                      {/* Direct LLM fields */}
                      {configTab === "direct" && (
                        <div className="flex flex-col gap-4">
                          <ConfigField th={th} label="API URL" value={draftConfig.direct.baseUrl}
                            onChange={(v) => setDraftConfig((p) => ({ ...p, direct: { ...p.direct, baseUrl: v } }))}
                            placeholder="https://…/openai/v1/chat/completions" />
                          <ConfigField th={th} label="Bearer Token" value={draftConfig.direct.bearerToken} type="password"
                            onChange={(v) => setDraftConfig((p) => ({ ...p, direct: { ...p.direct, bearerToken: v } }))}
                            placeholder="Your bearer token" />
                          <ConfigField th={th} label="Model" value={draftConfig.direct.model}
                            onChange={(v) => setDraftConfig((p) => ({ ...p, direct: { ...p.direct, model: v } }))}
                            placeholder="gpt-4.1-mini" />
                          <div className="rounded-lg px-3 py-2.5 text-xs font-mono" style={{ background: th.codeBg, color: th.codeText }}>
                            <span style={{ color: th.codeLabel }}>POST </span>
                            <span style={{ color: CLR_ORANGE + "CC" }}>{draftConfig.direct.baseUrl || "https://…/chat/completions"}</span>
                          </div>
                        </div>
                      )}

                      {saveError && <p className="text-xs mt-4" style={{ color: "#FF4D6A" }}>{saveError}</p>}
                      {saveDone && <p className="text-xs mt-4" style={{ color: CLR_TEAL }}>{t("admin.configSaved")}</p>}

                      <div className="flex gap-3 mt-6 justify-end">
                        <button
                          onClick={() => void loadChatConfig(adminToken)}
                          disabled={configLoading}
                          className="px-4 py-2 text-sm rounded-lg border transition-colors disabled:opacity-40"
                          style={{ color: CLR_BLUE, borderColor: th.cardBorder }}
                        >
                          {configLoading ? "…" : t("admin.load")}
                        </button>
                        <button
                          onClick={() => void saveChatConfig()}
                          disabled={configLoading}
                          className="px-4 py-2 text-sm font-semibold rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
                          style={{ background: CLR_BLUE, color: "#0D0E12" }}
                        >
                          {configLoading ? t("admin.saving") : t("admin.save")}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Knowledge Base tab ── */}
                  {activeTab === "kb" && (
                    <div className="flex h-full min-h-0">
                      {loadError && (
                        <div className="absolute left-0 right-0 px-4 py-2.5 flex items-center gap-2 text-xs" style={{ background: "#FF4D6A12", borderBottom: "1px solid #FF4D6A25", color: "#FF4D6A" }}>
                          <span>⚠</span>
                          <span>{t("admin.ragServerError")}&nbsp;
                            <button className="underline" onClick={() => void reloadDocs()}>{t("admin.retry")}</button>
                          </span>
                        </div>
                      )}

                      {/* Left: folder tree */}
                      <div
                        className="w-[220px] shrink-0 border-r flex flex-col overflow-y-auto"
                        style={{ borderColor: th.cardBorder, background: th.headerBg }}
                      >
                        <div className="p-3 flex-1">
                          {folders.map((folder) => (
                            <div key={folder} className="mb-1">
                              <button
                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors text-left"
                                style={{ color: CLR_BLUE }}
                                onClick={() => setExpanded((e) => ({ ...e, [folder]: !e[folder] }))}
                              >
                                <span style={{ opacity: 0.7 }}><FolderIcon /></span>
                                <span className="uppercase tracking-wide">{folder}</span>
                                <span className="ml-auto text-[10px] opacity-50">{expanded[folder] ? "▾" : "▸"}</span>
                              </button>

                              {expanded[folder] && (
                                <div className="ml-3 mt-0.5">
                                  {docs
                                    .filter((d) => d.folder === folder && d.title !== ".keep")
                                    .map((d) => (
                                      <button
                                        key={d.path}
                                        className="w-full flex items-center gap-2 px-2 py-1 rounded-lg text-left text-[11px] transition-colors truncate"
                                        style={{
                                          color: selectedPath === d.path ? th.textPrimary : th.textSecondary,
                                          background: selectedPath === d.path ? th.cardBg : "transparent",
                                        }}
                                        onClick={() => selectDoc(d.path)}
                                        onMouseEnter={(e) => { if (selectedPath !== d.path) e.currentTarget.style.color = th.textPrimary; }}
                                        onMouseLeave={(e) => { if (selectedPath !== d.path) e.currentTarget.style.color = th.textSecondary; }}
                                      >
                                        <span style={{ opacity: 0.6, flexShrink: 0 }}><FileIcon /></span>
                                        <span className="truncate">{d.title}</span>
                                      </button>
                                    ))}

                                  {newFileForFolder === folder ? (
                                    <div className="flex gap-1 mt-1 px-2">
                                      <input
                                        autoFocus
                                        value={newFileName}
                                        onChange={(e) => setNewFileName(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") void handleCreateFile(folder);
                                          if (e.key === "Escape") { setNewFileForFolder(null); setNewFileName(""); }
                                        }}
                                        placeholder={t("admin.fileNamePlaceholder")}
                                        className="flex-1 rounded px-2 py-0.5 text-[11px] placeholder-gray-500 focus:outline-none min-w-0"
                                        style={{ background: th.inputBg, border: `1px solid ${CLR_BLUE}50`, color: th.textPrimary }}
                                      />
                                      <button
                                        onClick={() => void handleCreateFile(folder)}
                                        className="text-[10px] px-1.5 py-0.5 rounded"
                                        style={{ background: CLR_BLUE + "30", color: CLR_BLUE }}
                                      >✓</button>
                                    </div>
                                  ) : (
                                    <button
                                      className="w-full flex items-center gap-1.5 px-2 py-1 text-[11px] rounded transition-colors mt-0.5"
                                      style={{ color: th.textSecondary }}
                                      onMouseEnter={(e) => { e.currentTarget.style.color = CLR_BLUE; }}
                                      onMouseLeave={(e) => { e.currentTarget.style.color = th.textSecondary; }}
                                      onClick={() => { setNewFileForFolder(folder); setNewFileName(""); }}
                                    >
                                      <span>＋</span> {t("admin.newFile")}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}

                          <div className="mt-3 border-t pt-3" style={{ borderColor: th.cardBorder }}>
                            {showNewFolder ? (
                              <div className="flex gap-1">
                                <input
                                  autoFocus
                                  value={newFolderName}
                                  onChange={(e) => setNewFolderName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") void handleCreateFolder();
                                    if (e.key === "Escape") { setShowNewFolder(false); setNewFolderName(""); }
                                  }}
                                  placeholder={t("admin.folderNamePlaceholder")}
                                  className="flex-1 rounded px-2 py-1 text-xs placeholder-gray-500 focus:outline-none min-w-0"
                                  style={{ background: th.inputBg, border: `1px solid ${CLR_ORANGE}50`, color: th.textPrimary }}
                                />
                                <button
                                  onClick={() => void handleCreateFolder()}
                                  className="text-[11px] px-2 py-1 rounded"
                                  style={{ background: CLR_ORANGE + "30", color: CLR_ORANGE }}
                                >✓</button>
                              </div>
                            ) : (
                              <button
                                className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-colors"
                                style={{ color: th.textSecondary }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = CLR_ORANGE; e.currentTarget.style.background = CLR_ORANGE + "10"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = th.textSecondary; e.currentTarget.style.background = "transparent"; }}
                                onClick={() => { setShowNewFolder(true); setNewFolderName(""); }}
                              >
                                <FolderIcon /> ＋ {t("admin.newFolder")}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: editor */}
                      <div className="flex-1 flex flex-col min-w-0 p-5">
                        {selectedPath ? (
                          <>
                            <div className="mb-3">
                              <label className="block text-xs font-medium mb-1.5" style={{ color: th.textSecondary }}>
                                {t("admin.documentTitle")}
                              </label>
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => { setEditTitle(e.target.value); setDirty(true); }}
                                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors"
                                style={inputBase}
                                onFocus={(e) => { e.target.style.borderColor = CLR_BLUE; }}
                                onBlur={(e) => { e.target.style.borderColor = th.cardBorder; }}
                              />
                            </div>
                            <div className="mb-3 text-[10px]" style={{ color: th.textSecondary }}>
                              {t("admin.path")} <span style={{ color: th.textMuted }}>{selectedPath}</span>
                            </div>
                            <div className="flex-1 flex flex-col min-h-0">
                              <label className="block text-xs font-medium mb-1.5" style={{ color: th.textSecondary }}>
                                {t("admin.content")}
                              </label>
                              <textarea
                                value={editContent}
                                onChange={(e) => { setEditContent(e.target.value); setDirty(true); }}
                                className="flex-1 rounded-lg px-3 py-2 text-sm placeholder-gray-500 resize-none focus:outline-none transition-colors font-mono"
                                style={{ ...inputBase, lineHeight: "1.6", minHeight: 0 }}
                                onFocus={(e) => { e.target.style.borderColor = CLR_BLUE; }}
                                onBlur={(e) => { e.target.style.borderColor = th.cardBorder; }}
                                placeholder={t("admin.contentPlaceholder")}
                              />
                            </div>
                            <div className="flex items-center gap-3 mt-4 pt-3 border-t shrink-0" style={{ borderColor: th.cardBorder }}>
                              {dirty && (
                                <span className="text-[10px]" style={{ color: th.unsavedColor }}>{t("admin.unsavedChanges")}</span>
                              )}
                              <div className="ml-auto flex gap-2">
                                <button
                                  onClick={() => void handleDeleteDoc()}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors"
                                  style={{ color: "#FF4D6A", borderColor: "#FF4D6A30" }}
                                  onMouseEnter={(e) => { e.currentTarget.style.background = "#FF4D6A10"; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                                >
                                  <TrashIcon /> {t("admin.delete")}
                                </button>
                                <button
                                  onClick={() => void handleSaveDoc()}
                                  disabled={!dirty}
                                  className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-40"
                                  style={{ background: CLR_BLUE, color: "#0D0E12" }}
                                >
                                  {t("admin.save")}
                                </button>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="flex-1 flex items-center justify-center">
                            <div className="text-center select-none">
                              <div
                                className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3"
                                style={{ background: CLR_BLUE + "10", border: `1px solid ${CLR_BLUE}20`, color: CLR_BLUE }}
                              >
                                <FileIcon />
                              </div>
                              <p className="text-sm" style={{ color: th.textMuted }}>{t("admin.selectDocument")}</p>
                              <p className="text-xs mt-1" style={{ color: th.textSecondary }}>{t("admin.createNewFile")}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── Users tab ── */}
                  {activeTab === "users" && (
                    <div className="h-full overflow-y-auto p-6">
                      {/* Add user form */}
                      <div className="mb-6">
                        <h3 className="text-sm font-semibold mb-4" style={{ color: th.textPrimary }}>{t("admin.addAdminUser")}</h3>
                        <div className="flex gap-3 items-end">
                          <div className="flex-1">
                            <label className="block text-xs font-medium mb-1.5" style={{ color: th.labelText }}>{t("admin.emailLabel")}</label>
                            <input
                              type="email"
                              value={newUserEmail}
                              onChange={(e) => { setNewUserEmail(e.target.value); setUserError(null); }}
                              placeholder={t("admin.emailPlaceholder")}
                              className="w-full rounded-lg px-3 py-2 text-sm placeholder-gray-500 focus:outline-none transition-colors"
                              style={inputBase}
                              onFocus={(e) => { e.target.style.borderColor = CLR_BLUE; }}
                              onBlur={(e) => { e.target.style.borderColor = th.cardBorder; }}
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs font-medium mb-1.5" style={{ color: th.labelText }}>{t("admin.passwordLabel")}</label>
                            <input
                              type="password"
                              value={newUserPassword}
                              onChange={(e) => { setNewUserPassword(e.target.value); setUserError(null); }}
                              placeholder={t("admin.passwordLabel")}
                              className="w-full rounded-lg px-3 py-2 text-sm placeholder-gray-500 focus:outline-none transition-colors"
                              style={inputBase}
                              onFocus={(e) => { e.target.style.borderColor = CLR_BLUE; }}
                              onBlur={(e) => { e.target.style.borderColor = th.cardBorder; }}
                            />
                          </div>
                          <button
                            onClick={() => void handleAddUser()}
                            disabled={userLoading}
                            className="px-4 py-2 text-sm font-semibold rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50 shrink-0"
                            style={{ background: CLR_TEAL, color: "#0D0E12" }}
                          >
                            {userLoading ? t("admin.adding") : t("admin.addUser")}
                          </button>
                        </div>
                        {userError && <p className="text-xs mt-2" style={{ color: "#FF4D6A" }}>{userError}</p>}
                      </div>

                      {/* User list */}
                      <div>
                        <h3 className="text-sm font-semibold mb-3" style={{ color: th.textPrimary }}>{t("admin.adminUsers")}</h3>
                        {users.length === 0 ? (
                          <p className="text-xs" style={{ color: th.textMuted }}>{t("admin.noUsers")}</p>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {users.map((u) => (
                              <div key={u.username} className="rounded-lg border overflow-hidden"
                                style={{ background: th.cardBg, borderColor: th.cardBorder }}>
                                <div className="flex items-center gap-3 px-3 py-2">
                                  <span style={{ color: th.textSecondary, opacity: 0.7 }}><UserIcon /></span>
                                  <span className="flex-1 text-sm" style={{ color: th.textPrimary }}>{u.username}</span>
                                  <button
                                    onClick={() => {
                                      setChangePwUser(changePwUser === u.username ? null : u.username);
                                      setChangePwValue("");
                                      setChangePwError(null);
                                    }}
                                    className="px-2 py-1 rounded-lg text-[11px] border transition-colors shrink-0"
                                    style={
                                      changePwUser === u.username
                                        ? { color: CLR_BLUE, borderColor: CLR_BLUE + "40", background: CLR_BLUE + "10" }
                                        : { color: th.textMuted, borderColor: th.cardBorder }
                                    }
                                    onMouseEnter={(e) => { if (changePwUser !== u.username) { e.currentTarget.style.color = CLR_BLUE; e.currentTarget.style.borderColor = CLR_BLUE + "40"; } }}
                                    onMouseLeave={(e) => { if (changePwUser !== u.username) { e.currentTarget.style.color = th.textMuted; e.currentTarget.style.borderColor = th.cardBorder; } }}
                                    title={t("admin.changePassword")}
                                  >
                                    {t("admin.changePassword")}
                                  </button>
                                  <button
                                    onClick={() => void handleDeleteUser(u.username)}
                                    className="p-1.5 rounded-lg transition-colors"
                                    style={{ color: th.textMuted }}
                                    onMouseEnter={(e) => { e.currentTarget.style.color = "#FF4D6A"; e.currentTarget.style.background = "#FF4D6A10"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.color = th.textMuted; e.currentTarget.style.background = "transparent"; }}
                                    title={t("admin.removeUserTitle")}
                                  >
                                    <TrashIcon />
                                  </button>
                                </div>

                                {changePwUser === u.username && (
                                  <div className="px-3 pb-3 pt-1 border-t flex gap-2 items-center"
                                    style={{ borderColor: th.cardBorder }}>
                                    <input
                                      autoFocus
                                      type="password"
                                      value={changePwValue}
                                      onChange={(e) => { setChangePwValue(e.target.value); setChangePwError(null); }}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") void handleChangePassword(u.username);
                                        if (e.key === "Escape") { setChangePwUser(null); setChangePwValue(""); setChangePwError(null); }
                                      }}
                                      placeholder={t("admin.newPasswordPlaceholder")}
                                      className="flex-1 rounded-lg px-3 py-1.5 text-sm placeholder-gray-500 focus:outline-none transition-colors"
                                      style={{ background: th.inputBg, border: `1px solid ${changePwError ? "#FF4D6A" : th.cardBorder}`, color: th.textPrimary }}
                                      onFocus={(e) => { if (!changePwError) e.target.style.borderColor = CLR_BLUE; }}
                                      onBlur={(e) => { if (!changePwError) e.target.style.borderColor = th.cardBorder; }}
                                    />
                                    <button
                                      onClick={() => void handleChangePassword(u.username)}
                                      disabled={changePwLoading}
                                      className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-opacity disabled:opacity-50 shrink-0"
                                      style={{ background: CLR_BLUE, color: "#0D0E12" }}
                                    >
                                      {changePwLoading ? t("admin.saving") : t("admin.save")}
                                    </button>
                                    <button
                                      onClick={() => { setChangePwUser(null); setChangePwValue(""); setChangePwError(null); }}
                                      className="px-3 py-1.5 text-xs rounded-lg border transition-colors shrink-0"
                                      style={{ color: th.textMuted, borderColor: th.cardBorder }}
                                    >
                                      {t("admin.cancel")}
                                    </button>
                                    {changePwError && (
                                      <span className="text-xs" style={{ color: "#FF4D6A" }}>{changePwError}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <p className="text-xs mt-6" style={{ color: th.textMuted }}>
                        {t("admin.envNote")}
                      </p>
                    </div>
                  )}

                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
