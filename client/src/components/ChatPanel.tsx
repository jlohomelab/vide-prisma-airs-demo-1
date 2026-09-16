import { type JSX, useEffect, useRef, useState } from "react";
import { initRagDocs, loadRagDocs, searchDocs } from "../utils/rag";

const CLR_BLUE = "#4FC3F7";
const NODE_BG = "#1E2028";
const NODE_BORDER = "#2A2D37";

interface Message {
  role: "user" | "assistant";
  content: string;
  error?: boolean;
}

interface PortkeyConfig {
  baseUrl: string;
  provider: string;
  apiKey: string;
  model: string;
}

const DEFAULT_CONFIG: PortkeyConfig = {
  baseUrl: "https://aigw.portkey.ai/v1",
  provider: "@gpt-4-1-mini",
  apiKey: "",
  model: "gpt-4-1-mini",
};

const CONFIG_KEY = "portkey-chat-config";

function GearIcon(): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="15"
      height="15"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
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

function ConfigField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
}): JSX.Element {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "#9CA3AF" }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none transition-colors"
        style={{
          background: "#0D0E12",
          border: `1px solid ${NODE_BORDER}`,
        }}
        onFocus={(e) => { e.target.style.borderColor = CLR_BLUE; }}
        onBlur={(e) => { e.target.style.borderColor = NODE_BORDER; }}
      />
    </div>
  );
}

export default function ChatPanel(): JSX.Element {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<PortkeyConfig>(() => {
    try {
      const saved = localStorage.getItem(CONFIG_KEY);
      return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });
  const [draftConfig, setDraftConfig] = useState<PortkeyConfig>(config);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    initRagDocs();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const openConfig = () => {
    setDraftConfig(config);
    setShowConfig(true);
  };

  const saveConfig = () => {
    setConfig(draftConfig);
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(draftConfig));
    } catch {
      // ignore storage errors
    }
    setShowConfig(false);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      // RAG gate: reload docs on each send so admin changes are picked up immediately
      const context = searchDocs(text, loadRagDocs());

      if (context === null) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Unable to access internal data." },
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

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-portkey-api-key": config.apiKey,
      };
      if (config.provider.trim()) {
        headers["x-portkey-provider"] = config.provider.trim();
      }

      const res = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: config.model,
          messages: [
            systemMessage,
            ...history.map((m) => ({ role: m.role, content: m.content })),
          ],
          max_tokens: 512,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "Unknown error");
        throw new Error(`HTTP ${res.status}: ${errText.slice(0, 300)}`);
      }

      const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
      const content = data.choices?.[0]?.message?.content ?? "(no response)";
      setMessages((prev) => [...prev, { role: "assistant", content }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => [...prev, { role: "assistant", content: msg, error: true }]);
    } finally {
      setIsLoading(false);
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
      {/* Config modal */}
      {showConfig && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
          onClick={() => setShowConfig(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border p-6 shadow-2xl"
            style={{ background: "#13141A", borderColor: NODE_BORDER }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-1">
              <span style={{ color: CLR_BLUE }}>
                <GearIcon />
              </span>
              <h2 className="text-white font-bold text-base">Portkey API Configuration</h2>
            </div>
            <p className="text-xs mb-5" style={{ color: "#6B7280" }}>
              Configure your Portkey gateway connection. Settings are saved in your browser.
            </p>

            <div className="flex flex-col gap-4">
              <ConfigField
                label="API Base URL"
                value={draftConfig.baseUrl}
                onChange={(v) => setDraftConfig((p) => ({ ...p, baseUrl: v }))}
                placeholder="https://aigw.portkey.ai/v1"
              />
              <ConfigField
                label="x-portkey-api-key"
                value={draftConfig.apiKey}
                onChange={(v) => setDraftConfig((p) => ({ ...p, apiKey: v }))}
                placeholder="Your Portkey API key"
                type="password"
              />
              <ConfigField
                label="x-portkey-provider (optional)"
                value={draftConfig.provider}
                onChange={(v) => setDraftConfig((p) => ({ ...p, provider: v }))}
                placeholder="e.g. @gpt-4-1-mini"
              />
              <ConfigField
                label="Model"
                value={draftConfig.model}
                onChange={(v) => setDraftConfig((p) => ({ ...p, model: v }))}
                placeholder="gpt-4-1-mini"
              />
            </div>

            <div className="mt-2 rounded-lg px-3 py-2.5 text-xs font-mono" style={{ background: "#0D0E12", color: "#6B7280" }}>
              <span style={{ color: "#4B5563" }}>POST </span>
              <span style={{ color: CLR_BLUE + "CC" }}>{draftConfig.baseUrl || "https://api.portkey.ai/v1"}/chat/completions</span>
            </div>

            <div className="flex gap-3 mt-5 justify-end">
              <button
                onClick={() => setShowConfig(false)}
                className="px-4 py-2 text-sm rounded-lg border transition-colors hover:bg-[#1A1B22]"
                style={{ color: "#9CA3AF", borderColor: NODE_BORDER }}
              >
                Cancel
              </button>
              <button
                onClick={saveConfig}
                className="px-4 py-2 text-sm font-semibold rounded-lg transition-opacity hover:opacity-90"
                style={{ background: CLR_BLUE, color: "#0D0E12" }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat panel */}
      <div
        className="flex flex-col h-full rounded-2xl border shadow-2xl overflow-hidden"
        style={{ background: "#13141A", borderColor: NODE_BG }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 border-b flex items-center gap-2 shrink-0"
          style={{ borderColor: NODE_BORDER, background: "#0F1015" }}
        >
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: CLR_BLUE }} />
          <span className="text-sm font-semibold text-white">AI Assistant</span>
          <span
            className="ml-2 text-[10px] px-2 py-0.5 rounded-full truncate"
            style={{ background: NODE_BG, color: CLR_BLUE, maxWidth: "130px" }}
            title={config.model}
          >
            {config.model}
          </span>
          <button
            onClick={openConfig}
            className="ml-auto p-1.5 rounded-lg transition-colors"
            style={{ color: "#4B5563" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = CLR_BLUE; (e.currentTarget as HTMLButtonElement).style.background = NODE_BG; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#4B5563"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            title="Configure Portkey API"
            aria-label="Configure Portkey API"
          >
            <GearIcon />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0">
          {messages.length === 0 && !isLoading && (
            <div className="flex-1 flex items-center justify-center h-full">
              <div className="text-center select-none">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-xl"
                  style={{
                    background: CLR_BLUE + "12",
                    border: `1px solid ${CLR_BLUE}25`,
                    color: CLR_BLUE,
                  }}
                >
                  ✦
                </div>
                <p className="text-sm font-medium" style={{ color: "#6B7280" }}>Ask about PAN policies</p>
                <p className="text-xs mt-0.5" style={{ color: "#374151" }}>HR · Expenses · IT Knowledge Base</p>
              </div>
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
                        background: CLR_BLUE + "18",
                        border: `1px solid ${CLR_BLUE}30`,
                        color: "#E5E7EB",
                      }
                    : msg.error
                    ? {
                        background: "#FF4D6A0D",
                        border: "1px solid #FF4D6A25",
                        color: "#FF4D6A",
                      }
                    : {
                        background: NODE_BG,
                        border: `1px solid ${NODE_BORDER}`,
                        color: "#D1D5DB",
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
                style={{ background: NODE_BG, borderColor: NODE_BORDER }}
              >
                <span className="flex gap-1 items-center">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: CLR_BLUE,
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
          style={{ borderColor: NODE_BORDER, background: "#0F1015" }}
        >
          <div className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask about HR, expenses, IT…"
              rows={1}
              className="flex-1 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 resize-none focus:outline-none transition-colors"
              style={{
                background: "#1A1B22",
                border: `1px solid ${NODE_BORDER}`,
                minHeight: "38px",
                maxHeight: "120px",
                lineHeight: "1.5",
              }}
              onFocus={(e) => { e.target.style.borderColor = CLR_BLUE; }}
              onBlur={(e) => { e.target.style.borderColor = NODE_BORDER; }}
            />
            <button
              onClick={() => void sendMessage()}
              disabled={!input.trim() || isLoading}
              className="rounded-lg p-2.5 flex items-center justify-center transition-opacity shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: CLR_BLUE, color: "#0D0E12" }}
              aria-label="Send message"
            >
              <SendIcon />
            </button>
          </div>
          <p className="text-[10px] mt-1.5" style={{ color: "#374151" }}>
            Enter to send · Shift+Enter for new line
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
