import { type JSX, useEffect, useRef, useState } from "react";
import { loadRagDocs, searchDocs } from "../utils/rag";
import { useTheme } from "../contexts/ThemeContext";
import { useLanguage } from "../contexts/LanguageContext";
import type { TranslationKey } from "../i18n/translations";

const CLR_BLUE = "#4FC3F7";
const CLR_ORANGE = "#FF9500";

const ADMIN_PW_KEY = "chat-admin-password";

function buildTheme(darkMode: boolean) {
  return darkMode
    ? {
        panelBg:      "#13141A",
        panelBorder:  "#1E2028",
        headerBg:     "#0F1015",
        cardBg:       "#1E2028",
        cardBorder:   "#2A2D37",
        inputBg:      "#0D0E12",
        inputBg2:     "#1A1B22",
        modalBg:      "#13141A",
        tabsBg:       "#0D0E12",
        textPrimary:  "#FFFFFF",
        textSecondary:"#9CA3AF",
        textMuted:    "#6B7280",
        textHint:     "#374151",
        msgUserText:  "#E5E7EB",
        msgAssistText:"#D1D5DB",
        labelText:    "#9CA3AF",
        cancelText:   "#9CA3AF",
        codeBg:       "#0D0E12",
        codeText:     "#6B7280",
        codeLabel:    "#4B5563",
        inputAreaBg:  "#0F1015",
      }
    : {
        panelBg:      "#FFFFFF",
        panelBorder:  "#E2E8F0",
        headerBg:     "#F5F7FA",
        cardBg:       "#F1F5F9",
        cardBorder:   "#D1D5DB",
        inputBg:      "#F5F7FA",
        inputBg2:     "#FFFFFF",
        modalBg:      "#FFFFFF",
        tabsBg:       "#F1F5F9",
        textPrimary:  "#111827",
        textSecondary:"#4B5563",
        textMuted:    "#9CA3AF",
        textHint:     "#9CA3AF",
        msgUserText:  "#1F2937",
        msgAssistText:"#374151",
        labelText:    "#6B7280",
        cancelText:   "#6B7280",
        codeBg:       "#F1F5F9",
        codeText:     "#6B7280",
        codeLabel:    "#4B5563",
        inputAreaBg:  "#FFFFFF",
      };
}

interface Message {
  role: "user" | "assistant";
  content: string;
  error?: boolean;
  blocked?: boolean;
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
    scmReportUrl: "",
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

const PROMPT_VIOLATION_KEYS: Record<string, TranslationKey> = {
  dlp:             "violation.prompt.dlp",
  agent:           "violation.prompt.agent",
  injection:       "violation.prompt.injection",
  malicious_code:  "violation.prompt.maliciousCode",
  topic_violation: "violation.prompt.topicViolation",
  toxic_content:   "violation.prompt.toxicContent",
  url_cats:        "violation.prompt.urlCats",
};

const RESPONSE_VIOLATION_KEYS: Record<string, TranslationKey> = {
  dlp:            "violation.response.dlp",
  malicious_code: "violation.response.maliciousCode",
  toxic_content:  "violation.response.toxicContent",
  url_cats:       "violation.response.urlCats",
};

type CheckData = {
  action?: string;
  prompt_detected?: Record<string, boolean>;
  response_detected?: Record<string, boolean>;
};

function extractViolationMessage(
  hookResults: {
    before_request_hooks?: Array<{ checks?: Array<{ data?: CheckData }> }>;
    after_request_hooks?: Array<{ checks?: Array<{ data?: CheckData }> }>;
  } | undefined,
  t: (key: TranslationKey) => string
): string {
  for (const hook of hookResults?.before_request_hooks ?? []) {
    for (const check of hook.checks ?? []) {
      const detected = check.data?.prompt_detected;
      if (detected) {
        for (const key of Object.keys(PROMPT_VIOLATION_KEYS)) {
          if (detected[key] === true) return t(PROMPT_VIOLATION_KEYS[key]);
        }
      }
    }
  }
  for (const hook of hookResults?.after_request_hooks ?? []) {
    for (const check of hook.checks ?? []) {
      const detected = check.data?.response_detected;
      if (detected) {
        for (const key of Object.keys(RESPONSE_VIOLATION_KEYS)) {
          if (detected[key] === true) return t(RESPONSE_VIOLATION_KEYS[key]);
        }
      }
    }
  }
  return t("violation.generic");
}

function SendIcon(): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="15"
      height="15"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function ChatPanel({ secured, onRawResponse, onInputFocus, onInputBlur, onSend, onResponse }: {
  secured: boolean;
  onRawResponse?: (data: unknown) => void;
  onInputFocus?: () => void;
  onInputBlur?: () => void;
  onSend?: () => void;
  onResponse?: () => void;
}): JSX.Element {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [chatConfig, setChatConfig] = useState<ChatConfig>(DEFAULT_CONFIG);
  const [adminPassword] = useState<string>(
    () => localStorage.getItem(ADMIN_PW_KEY) ?? ""
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load config from server on mount if we have a stored password
  useEffect(() => {
    if (!adminPassword) return;
    fetchConfig(adminPassword)
      .then((cfg) => { setChatConfig(cfg); })
      .catch(() => { /* silently fall back to defaults */ });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const { darkMode } = useTheme();
  const th = buildTheme(darkMode);
  const { t } = useLanguage();

  const accentColor = secured ? CLR_BLUE : CLR_ORANGE;
  const modeLabel = secured ? t("diagram.secured") : t("diagram.unsecured");
  const modelLabel = secured ? chatConfig.portkey.model : chatConfig.direct.model;

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    onRawResponse?.(null);
    onSend?.();

    const userMsg: Message = { role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      // RAG gate
      let ragDocs: Awaited<ReturnType<typeof loadRagDocs>> = [];
      let ragFetchFailed = false;
      try { ragDocs = await loadRagDocs(); } catch { ragFetchFailed = true; }

      if (ragFetchFailed) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: t("chat.serverUnreachable"), error: true },
        ]);
        return;
      }

      const context = searchDocs(text, ragDocs);

      if (context === null) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: t("chat.noData") },
        ]);
        return;
      }

      const systemMessage = {
        role: "system" as const,
        content:
          "You are an internal assistant for PAN Technologies. " +
          "Answer ONLY based on the documents provided below. " +
          "If the answer is not in the documents, say you don't have information about that in the internal knowledge base. " +
          "Be concise and helpful.\n\n" +
          context,
      };

      const messageHistory = [
        systemMessage,
        ...history.map((m) => ({ role: m.role, content: m.content })),
      ];

      let res: Response;

      if (secured) {
        const cfg = chatConfig.portkey;
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "x-portkey-api-key": cfg.apiKey,
        };
        if (cfg.provider.trim()) headers["x-portkey-provider"] = cfg.provider.trim();
        res = await fetch(`${cfg.baseUrl}/chat/completions`, {
          method: "POST",
          headers,
          body: JSON.stringify({ model: cfg.model, messages: messageHistory, max_tokens: 512 }),
        });
      } else {
        const cfg = chatConfig.direct;
        res = await fetch(cfg.baseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${cfg.bearerToken}`,
          },
          body: JSON.stringify({
            model: cfg.model,
            messages: messageHistory,
            max_completion_tokens: 13107,
          }),
        });
      }

      const rawText = await res.text().catch(() => "");
      let data: {
        action?: string;
        choices?: Array<{ message?: { content?: string } }>;
        hook_results?: {
          before_request_hooks?: Array<{ checks?: Array<{ data?: CheckData }> }>;
          after_request_hooks?: Array<{ checks?: Array<{ data?: CheckData }> }>;
        };
      } = {};
      try { data = JSON.parse(rawText) as typeof data; } catch { /* not JSON */ }

      onRawResponse?.(data);

      const isBlocked = (hooks: Array<{ checks?: Array<{ data?: CheckData }> }> | undefined) =>
        hooks?.some((h) => h.checks?.some((c) => c.data?.action === "block")) ?? false;
      const blocked =
        data.action === "block" ||
        isBlocked(data.hook_results?.after_request_hooks) ||
        isBlocked(data.hook_results?.before_request_hooks);
      if (!blocked && !res.ok) {
        throw new Error(`HTTP ${res.status}: ${rawText.slice(0, 300)}`);
      }

      const content = blocked
        ? extractViolationMessage(data.hook_results, t)
        : (data.choices?.[0]?.message?.content ?? t("chat.noResponse"));
      setMessages((prev) => [...prev, { role: "assistant", content, blocked }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      onRawResponse?.({ error: msg });
      setMessages((prev) => [...prev, { role: "assistant", content: msg, error: true }]);
    } finally {
      setIsLoading(false);
      onResponse?.();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  return (
    <>
      {/* Chat panel */}
      <div
        className="flex flex-col h-full rounded-2xl border shadow-2xl overflow-hidden"
        style={{ background: th.panelBg, borderColor: th.panelBorder }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 border-b flex items-center gap-2 shrink-0"
          style={{ borderColor: th.cardBorder, background: th.headerBg }}
        >
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: accentColor }} />
          <span className="text-sm font-semibold" style={{ color: th.textPrimary }}>{t("chat.aiAssistant")}</span>
          <span
            className="ml-1 text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: accentColor + "18", color: accentColor, border: `1px solid ${accentColor}30` }}
          >
            {modeLabel}
          </span>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full truncate"
            style={{ background: th.cardBg, color: accentColor, maxWidth: "110px" }}
            title={modelLabel}
          >
            {modelLabel}
          </span>
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="ml-auto text-[10px] px-2 py-0.5 rounded transition-opacity opacity-50 hover:opacity-100"
              style={{ color: th.textMuted, border: `1px solid ${th.cardBorder}` }}
              title={t("chat.clearTitle")}
            >
              {t("chat.clear")}
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0">
          {messages.length === 0 && !isLoading && (
            <div className="flex-1 flex items-center justify-center h-full">
              {!adminPassword ? (
                <div className="text-center select-none px-6">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-xl"
                    style={{ background: "#FF9500" + "15", border: "1px solid #FF950040", color: "#FF9500" }}
                  >
                    ⚙
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: th.textSecondary }}>
                    {t("chat.noCredentials")}
                  </p>
                </div>
              ) : (
                <div className="text-center select-none">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-xl"
                    style={{
                      background: accentColor + "12",
                      border: `1px solid ${accentColor}25`,
                      color: accentColor,
                    }}
                  >
                    ✦
                  </div>
                  <p className="text-sm font-medium" style={{ color: th.textMuted }}>{t("chat.emptyTitle")}</p>
                  <p className="text-xs mt-0.5" style={{ color: th.textSecondary }}>{t("chat.emptySubtitle")}</p>
                </div>
              )}
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className="max-w-[88%] rounded-xl px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
                style={
                  msg.role === "user"
                    ? {
                        background: accentColor + "18",
                        border: `1px solid ${accentColor}30`,
                        color: th.msgUserText,
                      }
                    : msg.error
                    ? {
                        background: "#FF4D6A0D",
                        border: "1px solid #FF4D6A25",
                        color: "#FF4D6A",
                      }
                    : msg.blocked
                    ? {
                        background: "#FF4D6A0D",
                        border: "2px solid #FF4D6A80",
                        color: th.msgAssistText,
                      }
                    : {
                        background: th.cardBg,
                        border: `1px solid ${th.cardBorder}`,
                        color: th.msgAssistText,
                      }
                }
              >
                {msg.content}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div
                className="rounded-xl px-4 py-3 border"
                style={{ background: th.cardBg, borderColor: th.cardBorder }}
              >
                <span className="flex gap-1 items-center">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: accentColor,
                        animation: `bounce 1s infinite ${i * 150}ms`,
                      }}
                    />
                  ))}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div
          className="p-3 border-t shrink-0"
          style={{ borderColor: th.cardBorder, background: th.inputAreaBg }}
        >
          <div className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={t("chat.placeholder")}
              rows={1}
              disabled={!adminPassword}
              className="flex-1 rounded-lg px-3 py-2 text-sm placeholder-gray-400 resize-none focus:outline-none transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: th.inputBg2,
                border: `1px solid ${th.cardBorder}`,
                color: th.textPrimary,
                minHeight: "38px",
                maxHeight: "120px",
                lineHeight: "1.5",
              }}
              onFocus={(e) => { e.target.style.borderColor = accentColor; onInputFocus?.(); }}
              onBlur={(e) => { e.target.style.borderColor = th.cardBorder; onInputBlur?.(); }}
            />
            <button
              onClick={() => void sendMessage()}
              disabled={!input.trim() || isLoading || !adminPassword}
              className="rounded-lg p-2.5 flex items-center justify-center transition-opacity shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: accentColor, color: "#0D0E12" }}
              aria-label={t("chat.sendLabel")}
            >
              <SendIcon />
            </button>
          </div>
          <p className="text-[10px] mt-1.5" style={{ color: th.textHint }}>
            {t("chat.hint")}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </>
  );
}
