import { type JSX, useEffect, useState } from "react";
import { deleteDoc, loadRagDocs, saveDoc, type RagDoc } from "../utils/rag";
import { useTheme } from "../contexts/ThemeContext";

const CLR_BLUE = "#4FC3F7";
const CLR_ORANGE = "#FF6B2B";
const NODE_BG = "#1E2028";
const NODE_BORDER = "#2A2D37";
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD as string;

function buildAdminTheme(darkMode: boolean) {
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
      };
}

// ── Icons ─────────────────────────────────────────────────────────────────────

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

// ── Helper ────────────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RagAdmin(): JSX.Element {
  const { darkMode } = useTheme();
  const th = buildAdminTheme(darkMode);
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);

  const [docs, setDocs] = useState<RagDoc[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [dirty, setDirty] = useState(false);

  // New-folder state
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // New-file state
  const [newFileForFolder, setNewFileForFolder] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState("");

  // Expanded folders
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const folders = [...new Set(docs.map((d) => d.folder))].sort();

  async function reload() {
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

  useEffect(() => {
    if (open && authed) void reload();
  }, [open, authed]);

  function handleLogin() {
    if (pwInput === ADMIN_PASSWORD) {
      setAuthed(true);
      setPwError(false);
    } else {
      setPwError(true);
    }
  }

  function handleClose() {
    setOpen(false);
    setAuthed(false);
    setPwInput("");
    setPwError(false);
    setSelectedPath(null);
    setDirty(false);
  }

  function selectDoc(path: string) {
    const doc = docs.find((d) => d.path === path);
    if (!doc) return;
    setSelectedPath(path);
    setEditTitle(doc.title);
    setEditContent(doc.content);
    setDirty(false);
  }

  async function handleSave() {
    if (!selectedPath) return;
    const folder = selectedPath.split("/")[0];
    const doc: RagDoc = { path: selectedPath, title: editTitle, folder, content: editContent };
    await saveDoc(doc, ADMIN_PASSWORD);
    await reload();
    setDirty(false);
  }

  async function handleDelete() {
    if (!selectedPath) return;
    if (!confirm(`Delete "${editTitle}"? This cannot be undone.`)) return;
    await deleteDoc(selectedPath, ADMIN_PASSWORD);
    await reload();
    setSelectedPath(null);
    setDirty(false);
  }

  async function handleCreateFolder() {
    const slug = slugify(newFolderName.trim());
    if (!slug) return;
    const path = `${slug}/.keep`;
    const doc: RagDoc = { path, title: ".keep", folder: slug, content: "" };
    await saveDoc(doc, ADMIN_PASSWORD);
    await reload();
    setShowNewFolder(false);
    setNewFolderName("");
    setExpanded((e) => ({ ...e, [slug]: true }));
  }

  async function handleCreateFile(folder: string) {
    const slug = slugify(newFileName.trim());
    if (!slug) return;
    const path = `${folder}/${slug}.txt`;
    const doc: RagDoc = { path, title: newFileName.trim(), folder, content: "" };
    await saveDoc(doc, ADMIN_PASSWORD);
    await reload();
    setNewFileForFolder(null);
    setNewFileName("");
    selectDoc(path);
  }

  const inputBase = {
    background: th.inputBg,
    border: `1px solid ${th.cardBorder}`,
    color: th.textPrimary,
  } as const;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Trigger button — fixed bottom-left */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-16 z-40 flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all shadow-lg"
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
        title="Open Knowledge Base Admin"
      >
        <LockIcon />
        Admin
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
              width: "min(920px, 95vw)",
              height: "min(640px, 90vh)",
              background: th.modalBg,
              borderColor: th.modalBorder,
            }}
          >
            {/* ── Password gate ── */}
            {!authed ? (
              <div className="flex flex-col items-center justify-center flex-1 p-8">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
                  style={{ background: CLR_ORANGE + "15", border: `1px solid ${CLR_ORANGE}30`, color: CLR_ORANGE }}
                >
                  <LockIcon />
                </div>
                <h2 className="font-bold text-lg mb-1" style={{ color: th.textPrimary }}>Knowledge Base Admin</h2>
                <p className="text-xs mb-6" style={{ color: th.textMuted }}>
                  Enter admin password to manage documents
                </p>
                <div className="w-full max-w-xs flex flex-col gap-3">
                  <input
                    type="password"
                    value={pwInput}
                    onChange={(e) => { setPwInput(e.target.value); setPwError(false); }}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    placeholder="Password"
                    autoFocus
                    className="w-full rounded-lg px-4 py-2.5 text-sm placeholder-gray-500 focus:outline-none transition-colors"
                    style={{
                      ...inputBase,
                      borderColor: pwError ? "#FF4D6A" : th.cardBorder,
                    }}
                    onFocus={(e) => { if (!pwError) e.target.style.borderColor = CLR_BLUE; }}
                    onBlur={(e) => { if (!pwError) e.target.style.borderColor = th.cardBorder; }}
                  />
                  {pwError && (
                    <p className="text-xs text-center" style={{ color: "#FF4D6A" }}>
                      Incorrect password. Please try again.
                    </p>
                  )}
                  <button
                    onClick={handleLogin}
                    className="w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
                    style={{ background: CLR_ORANGE, color: "#fff" }}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={handleClose}
                    className="w-full py-2 rounded-lg text-xs transition-colors"
                    style={{ color: th.textMuted }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* ── Main editor ── */
              <>
                {/* Header */}
                <div
                  className="flex items-center px-5 py-3 border-b shrink-0"
                  style={{ borderColor: th.cardBorder, background: th.headerBg }}
                >
                  <span className="text-sm font-bold" style={{ color: th.textPrimary }}>Knowledge Base Admin</span>
                  <span
                    className="ml-3 text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: CLR_ORANGE + "18", color: CLR_ORANGE }}
                  >
                    Authenticated
                  </span>
                  <button
                    onClick={handleClose}
                    className="ml-auto p-1.5 rounded-lg transition-colors"
                    style={{ color: th.textMuted }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = th.textPrimary; e.currentTarget.style.background = th.cardBg; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = th.textMuted; e.currentTarget.style.background = "transparent"; }}
                  >
                    <CloseIcon />
                  </button>
                </div>

                {/* Server error banner */}
                {loadError && (
                  <div className="px-4 py-2.5 flex items-center gap-2 text-xs shrink-0" style={{ background: "#FF4D6A12", borderBottom: "1px solid #FF4D6A25", color: "#FF4D6A" }}>
                    <span>⚠</span>
                    <span>Cannot reach the RAG server. Make sure the app is running with <strong>npm run dev</strong> (not <code>npm run dev:vite</code> alone), then&nbsp;
                      <button className="underline" onClick={() => void reload()}>retry</button>.
                    </span>
                  </div>
                )}

                {/* Body: two panels */}
                <div className="flex flex-1 min-h-0">
                  {/* Left: folder tree */}
                  <div
                    className="w-[220px] shrink-0 border-r flex flex-col overflow-y-auto"
                    style={{ borderColor: th.cardBorder, background: th.headerBg }}
                  >
                    <div className="p-3 flex-1">
                      {folders.map((folder) => (
                        <div key={folder} className="mb-1">
                          {/* Folder row */}
                          <button
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors text-left"
                            style={{ color: CLR_BLUE }}
                            onClick={() => setExpanded((e) => ({ ...e, [folder]: !e[folder] }))}
                          >
                            <span style={{ opacity: 0.7 }}><FolderIcon /></span>
                            <span className="uppercase tracking-wide">{folder}</span>
                            <span className="ml-auto text-[10px] opacity-50">{expanded[folder] ? "▾" : "▸"}</span>
                          </button>

                          {/* Files in folder */}
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

                              {/* New file row */}
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
                                    placeholder="File name"
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
                                  <span>＋</span> New file
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}

                      {/* New folder */}
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
                              placeholder="Folder name"
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
                            <FolderIcon /> ＋ New Folder
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: editor */}
                  <div className="flex-1 flex flex-col min-w-0 p-5">
                    {selectedPath ? (
                      <>
                        {/* Title */}
                        <div className="mb-3">
                          <label className="block text-xs font-medium mb-1.5" style={{ color: th.textSecondary }}>
                            Document Title
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

                        {/* Path (read-only) */}
                        <div className="mb-3 text-[10px]" style={{ color: th.textSecondary }}>
                          Path: <span style={{ color: th.textMuted }}>{selectedPath}</span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 flex flex-col min-h-0">
                          <label className="block text-xs font-medium mb-1.5" style={{ color: th.textSecondary }}>
                            Content
                          </label>
                          <textarea
                            value={editContent}
                            onChange={(e) => { setEditContent(e.target.value); setDirty(true); }}
                            className="flex-1 rounded-lg px-3 py-2 text-sm placeholder-gray-500 resize-none focus:outline-none transition-colors font-mono"
                            style={{ ...inputBase, lineHeight: "1.6", minHeight: 0 }}
                            onFocus={(e) => { e.target.style.borderColor = CLR_BLUE; }}
                            onBlur={(e) => { e.target.style.borderColor = th.cardBorder; }}
                            placeholder="Document content…"
                          />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 mt-4 pt-3 border-t shrink-0" style={{ borderColor: th.cardBorder }}>
                          {dirty && (
                            <span className="text-[10px]" style={{ color: th.unsavedColor }}>Unsaved changes</span>
                          )}
                          <div className="ml-auto flex gap-2">
                            <button
                              onClick={() => void handleDelete()}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors"
                              style={{ color: "#FF4D6A", borderColor: "#FF4D6A30" }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = "#FF4D6A10"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                            >
                              <TrashIcon /> Delete
                            </button>
                            <button
                              onClick={() => void handleSave()}
                              disabled={!dirty}
                              className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-40"
                              style={{ background: CLR_BLUE, color: "#0D0E12" }}
                            >
                              Save
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
                          <p className="text-sm" style={{ color: th.textMuted }}>Select a document to edit</p>
                          <p className="text-xs mt-1" style={{ color: th.textSecondary }}>or create a new file in a folder</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
