import { type JSX, useCallback, useEffect, useMemo, useRef, useState } from "react";
import ChatPanel from "./ChatPanel";
import AdminPage from "./AdminPage";
import JsonTree from "./JsonTree";
import { ThemeContext, useTheme } from "../contexts/ThemeContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface NodeDef {
  id: string;
  label: string;
  sublabel?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  activeColor?: string;
  icon: string;
}

interface EdgeDef {
  from: string;
  to: string;
  color: string;
}

interface StepDef {
  activeNodes: string[];
  activeEdges: string[];
  title: string;
  description: string;
  risks?: string[];
  gatewayBadges?: string[];
  holdMs?: number;
}

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------
const CLR_ORANGE = "#FF6B2B";
const CLR_TEAL = "#00C9A7";
const CLR_BLUE = "#4FC3F7";
const CLR_RED = "#FF4D6A";
const CLR_PURPLE = "#B388FF";
const CLR_YELLOW = "#FFD54F";
const DIM = 1;

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------
const ICONS: Record<string, (c: string) => JSX.Element> = {
  endpoint: (c) => (
    <g>
      <rect x="8" y="6" width="16" height="12" rx="1.5" fill="none" stroke={c} strokeWidth="1.5" />
      <line x1="12" y1="20" x2="20" y2="20" stroke={c} strokeWidth="1.5" />
      <line x1="16" y1="18" x2="16" y2="20" stroke={c} strokeWidth="1.5" />
    </g>
  ),
  frontend: (c) => (
    <g>
      <rect x="6" y="4" width="20" height="16" rx="2" fill="none" stroke={c} strokeWidth="1.5" />
      <line x1="6" y1="9" x2="26" y2="9" stroke={c} strokeWidth="1" />
      <circle cx="9" cy="6.5" r="0.8" fill={c} />
      <circle cx="12" cy="6.5" r="0.8" fill={c} />
      <circle cx="15" cy="6.5" r="0.8" fill={c} />
    </g>
  ),
  backend: (c) => (
    <g>
      <ellipse cx="16" cy="8" rx="9" ry="3.5" fill="none" stroke={c} strokeWidth="1.5" />
      <path d="M7 8v6c0 1.93 4.03 3.5 9 3.5s9-1.57 9-3.5V8" fill="none" stroke={c} strokeWidth="1.5" />
      <path d="M7 11.5c0 1.93 4.03 3.5 9 3.5s9-1.57 9-3.5" fill="none" stroke={c} strokeWidth="1" opacity="0.5" />
    </g>
  ),
  gateway: (c) => (
    <g>
      <path d="M16 4 L26 10 L26 18 L16 24 L6 18 L6 10 Z" fill="none" stroke={c} strokeWidth="1.5" />
      <path d="M16 4 L16 24" stroke={c} strokeWidth="1" opacity="0.4" />
      <path d="M6 10 L26 18" stroke={c} strokeWidth="1" opacity="0.4" />
      <path d="M26 10 L6 18" stroke={c} strokeWidth="1" opacity="0.4" />
    </g>
  ),
  scm: (c) => (
    <g>
      <rect x="7" y="6" width="18" height="14" rx="2" fill="none" stroke={c} strokeWidth="1.5" />
      <path d="M12 11h8M12 15h5" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="9.5" cy="11" r="0.8" fill={c} />
      <circle cx="9.5" cy="15" r="0.8" fill={c} />
    </g>
  ),
  intercept: (c) => (
    <g>
      <circle cx="16" cy="13" r="9" fill="none" stroke={c} strokeWidth="1.5" />
      <path d="M16 7v6l4 2" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
    </g>
  ),
  llm: (c) => (
    <g>
      <circle cx="16" cy="13" r="9" fill="none" stroke={c} strokeWidth="1.5" />
      <path d="M11 11c0-2.2 2.2-4 5-4s5 1.8 5 4-2.2 4-5 4h-1v2" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="15" cy="19.5" r="1" fill={c} />
    </g>
  ),
};

// ---------------------------------------------------------------------------
// Scenario data
// ---------------------------------------------------------------------------
const unsecuredNodes: NodeDef[] = [
  { id: "endpoint", label: "Endpoint", sublabel: "Attacker", x: 80, y: 150, width: 140, height: 80, color: CLR_RED, icon: "endpoint" },
  { id: "frontend", label: "Frontend", sublabel: "App UI", x: 340, y: 150, width: 140, height: 80, color: CLR_TEAL, icon: "frontend" },
  { id: "backend", label: "Backend", sublabel: "RAG", x: 600, y: 150, width: 140, height: 80, color: CLR_PURPLE, icon: "backend" },
  { id: "llm", label: "LLM", sublabel: "Single-Model", x: 860, y: 150, width: 140, height: 80, color: "#FFFFFF", activeColor: CLR_RED, icon: "llm" },
];

const unsecuredEdges: EdgeDef[] = [
  { from: "endpoint", to: "frontend", color: CLR_RED },
  { from: "frontend", to: "backend", color: CLR_TEAL },
  { from: "backend", to: "llm", color: CLR_PURPLE },
];

const unsecuredSteps: StepDef[] = [
  {
    activeNodes: ["endpoint"],
    activeEdges: ["endpoint"],
    title: "Step 0 — Attacker Endpoint",
    description:
      "Pontentially malicious user sends a prompt request through the application endpoint to the frontend interface.",
  },
  {
    activeNodes: ["endpoint", "frontend"],
    activeEdges: ["endpoint-frontend"],
    title: "Step 1 — Sending Request",
    description:
      "Attacker sends a prompt request through the application endpoint to the frontend interface.",
  },
  {
    activeNodes: ["frontend", "backend"],
    activeEdges: ["frontend-backend"],
    title: "Step 2 — RAG Data Retrieval",
    description:
      "Frontend forwards the request to the backend, which performs Retrieval-Augmented Generation to gather relevant context data.",
  },
  {
    activeNodes: ["backend", "llm"],
    activeEdges: ["backend-llm"],
    title: "Step 3 — Unprotected LLM Access",
    description:
      "Backend sends the prompt directly to the LLM with no security inspection — leaving the system exposed to critical AI threats.",
    risks: ["Prompt Injection", "Model Evasion","Sensitive Data Leakage", ],
    holdMs: 5000,
  },
];

const securedNodes: NodeDef[] = [
  { id: "endpoint", label: "Endpoint", sublabel: "Attacker", x: 60, y: 180, width: 110, height: 80, color: CLR_RED, icon: "endpoint" },
  { id: "frontend", label: "Frontend", sublabel: "App UI", x: 240, y: 180, width: 110, height: 80, color: CLR_TEAL, icon: "frontend" },
  { id: "backend", label: "Backend", sublabel: "RAG", x: 420, y: 180, width: 110, height: 80, color: CLR_PURPLE, icon: "backend" },
  { id: "gateway", label: "AI Gateway", sublabel: "Prisma AIRS", x: 640, y: 180, width: 150, height: 80, color: CLR_BLUE, icon: "gateway" },
  { id: "scm", label: "SCM", sublabel: "Policy & Reporting", x: 570, y: 50, width: 150, height: 80, color: CLR_YELLOW, icon: "scm" },
  { id: "intercept", label: "Prisma AIRS API", sublabel: "Security Guardrails", x: 730, y: 50, width: 150, height: 80, color: CLR_BLUE, icon: "intercept" },
  { id: "llm", label: "LLM", sublabel: "Multi-Model", x: 900, y: 180, width: 110, height: 80, color: CLR_BLUE, icon: "llm" },
];

const securedEdges: EdgeDef[] = [
  { from: "endpoint", to: "frontend", color: CLR_RED },
  { from: "frontend", to: "backend", color: CLR_TEAL },
  { from: "backend", to: "gateway", color: CLR_PURPLE },
  { from: "gateway", to: "scm", color: CLR_BLUE },
  { from: "gateway", to: "intercept", color: CLR_BLUE },
  { from: "gateway", to: "llm", color: CLR_BLUE },
];

const securedSteps: StepDef[] = [
  {
    activeNodes: ["endpoint"],
    activeEdges: ["endpoint"],
    title: "Step 0 — Attacker Endpoint",
    description:
      "Pontentially malicious user sends a prompt request through the application endpoint to the frontend interface.",
  },
  {
    activeNodes: ["endpoint", "frontend"],
    activeEdges: ["endpoint-frontend"],
    title: "Step 1 — Sending Request",
    description:
      "Attacker sends a prompt request through the application endpoint to the frontend interface.",
  },
  {
    activeNodes: ["frontend", "backend"],
    activeEdges: ["frontend-backend"],
    title: "Step 2 — RAG Data Retrieval",
    description:
      "Frontend forwards the request to the backend, which performs Retrieval-Augmented Generation to gather relevant context data.",
  },
  {
    activeNodes: ["backend", "gateway", "intercept"],
    activeEdges: ["backend-gateway", "gateway-intercept"],
    title: "Step 3 — Security Guardrails, DLP and Malware Scanning",
    description:
      "AIRS API performs real-time Security Guardrails, DLP and malware scanning on the request payload before it reaches any LLM.",
    gatewayBadges: [
      "Security Guardrails",
      "DLP / Malware Scanning",
    ],
    holdMs: 2000,
  },
  {
    activeNodes: ["backend","gateway", "scm"],
    activeEdges: ["backend-gateway","gateway-scm"],
    title: "Step 4 — LLM Routing and Metering",
    description:
      "The Prisma AIRS AI Gateway routes the request to the optimal LLM based on policy, load balancing, and budget / token limits.",
    gatewayBadges: [
      "Load Balancing",
      "Budget / Token Limits",
      "Observability",
    ],
    holdMs: 2000,
  },
  {
    activeNodes: ["gateway", "llm"],
    activeEdges: ["gateway-llm"],
    title: "Step 5 — Secure LLM Distribution",
    description:
      "After passing all security checks, the Prisma AIRS AI Gateway routes the sanitized request to the optimal LLM with full observability and guardrails.",
    gatewayBadges: [
      "Security Guardrails",
      "DLP / Malware Scanning",
      "Load Balancing | Budget/Token Limits | Observability",
    ],
    holdMs: 5000,
  },
];

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------
function getNodeCenter(node: NodeDef) {
  return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
}

function buildCurvePath(from: NodeDef, to: NodeDef): string {
  const fc = getNodeCenter(from);
  const tc = getNodeCenter(to);
  const dx = tc.x - fc.x;
  const dy = tc.y - fc.y;

  let sx: number, sy: number, ex: number, ey: number;

  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0) {
      sx = from.x + from.width;
      sy = fc.y;
      ex = to.x;
      ey = tc.y;
    } else {
      sx = from.x;
      sy = fc.y;
      ex = to.x + to.width;
      ey = tc.y;
    }
  } else {
    if (dy < 0) {
      sx = fc.x;
      sy = from.y;
      ex = tc.x;
      ey = to.y + to.height;
    } else {
      sx = fc.x;
      sy = from.y + from.height;
      ex = tc.x;
      ey = to.y;
    }
  }

  const cpx1 = sx + (ex - sx) * 0.5;
  const cpy1 = sy;
  const cpx2 = sx + (ex - sx) * 0.5;
  const cpy2 = ey;

  return `M ${sx} ${sy} C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${ex} ${ey}`;
}

function edgeKey(e: EdgeDef) {
  return `${e.from}-${e.to}`;
}

// ---------------------------------------------------------------------------
// Animated particles along a path
// ---------------------------------------------------------------------------
function AnimatedParticles({
  pathData,
  color,
  edgeIndex,
}: {
  pathData: string;
  color: string;
  edgeIndex: number;
}) {
  const pathRef = useRef<SVGPathElement>(null);
  const [offsets, setOffsets] = useState<number[]>([]);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const particleCount = 3;
  const speed = 0.15;
  const stagger = edgeIndex * 0.12;

  useEffect(() => {
    startTimeRef.current = performance.now();
    const animate = (now: number) => {
      const elapsed = (now - startTimeRef.current) / 1000;
      const arr: number[] = [];
      for (let i = 0; i < particleCount; i++) {
        arr.push((elapsed * speed + stagger + i / particleCount) % 1);
      }
      setOffsets(arr);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [pathData, stagger]);

  const pathLength = useMemo(() => {
    if (!pathRef.current) return 0;
    return pathRef.current.getTotalLength();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathData, pathRef.current]);

  return (
    <g>
      <path ref={pathRef} d={pathData} fill="none" stroke="transparent" />
      {pathRef.current &&
        pathLength > 0 &&
        offsets.map((t, i) => {
          const pt = pathRef.current!.getPointAtLength(t * pathLength);
          return (
            <g key={i}>
              <circle cx={pt.x} cy={pt.y} r="8" fill={color} opacity={0.15} />
              <circle cx={pt.x} cy={pt.y} r="4" fill={color} opacity={0.4} />
              <circle cx={pt.x} cy={pt.y} r="2" fill="white" opacity={0.9} />
            </g>
          );
        })}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Single node renderer
// ---------------------------------------------------------------------------
function FlowNode({
  node,
  active,
  onClick,
}: {
  node: NodeDef;
  active: boolean;
  onClick?: () => void;
}) {
  const { darkMode } = useTheme();
  const nodeBg      = darkMode ? "#1E2028" : "#FFFFFF";
  const nodeBorder  = darkMode ? "#2A2D37" : "#E2E8F0";
  const nodeText    = darkMode ? "#FFFFFF"  : "#1F2937";
  const nodeSubText = darkMode ? "#9CA3AF"  : "#6B7280";
  const icon = ICONS[node.icon];
  const nodeColor = active && node.activeColor ? node.activeColor : node.color;
  const opacity = active ? 1 : DIM;
  const glowOpacity = active ? "0.7" : "0";
  const borderOpacity = active ? 0.7 : 0.15;
  const filterId = `glow-${node.id}-${active ? "on" : "off"}`;

  return (
    <g
      style={{ transition: "opacity 0.4s", opacity, cursor: onClick ? "pointer" : "default" }}
      onClick={onClick}
    >
      <defs>
        <filter id={filterId}>
          <feGaussianBlur stdDeviation={active ? "4" : "1"} result="blur" />
          <feFlood floodColor={nodeColor} floodOpacity={glowOpacity} result="color" />
          <feComposite in="color" in2="blur" operator="in" result="shadow" />
          <feMerge>
            <feMergeNode in="shadow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect
        x={node.x}
        y={node.y}
        width={node.width}
        height={node.height}
        rx="12"
        fill={nodeBg}
        stroke={nodeBorder}
        strokeWidth="1.5"
        filter={`url(#${filterId})`}
      />

      <rect
        x={node.x}
        y={node.y}
        width={node.width}
        height={node.height}
        rx="12"
        fill="none"
        stroke={nodeColor}
        strokeWidth={active ? "1.5" : "1"}
        opacity={borderOpacity}
      />

      <g transform={`translate(${node.x + node.width / 2 - 16}, ${node.y + 8})`}>
        {icon(nodeColor)}
      </g>

      <text
        x={node.x + node.width / 2}
        y={node.y + node.height - (node.sublabel ? 30 : 12)}
        textAnchor="middle"
        fill={nodeText}
        fontSize="14"
        fontWeight="600"
        fontFamily="Inter, system-ui, sans-serif"
      >
        {node.label}
      </text>
      {node.sublabel && (
        <text
          x={node.x + node.width / 2}
          y={node.y + node.height - 15}
          textAnchor="middle"
          fill={nodeSubText}
          fontSize="14"
          fontFamily="Inter, system-ui, sans-serif"
        >
          {node.sublabel}
        </text>
      )}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Risk callout badges (unsecured final step)
// ---------------------------------------------------------------------------
function RiskBadges({ node }: { node: NodeDef; risks: string[] }) {
  const risks = ["Prompt Injection", "Data Leakage", "Model Evasion"];
  const cx = node.x + node.width / 2;
  const baseY = node.y + node.height + 14;
  return (
    <g>
      {risks.map((label, i) => {
        const w = label.length * 6.5 + 50;
        const y = baseY + i * 26;
        return (
          <g key={label}>
            <rect
              x={cx - w / 2}
              y={y}
              width={w}
              height={20}
              rx="10"
              fill={CLR_RED}
              opacity={0.15}
            />
            <rect
              x={cx - w / 2}
              y={y}
              width={w}
              height={20}
              rx="10"
              fill="none"
              stroke={CLR_RED}
              strokeWidth="1"
              opacity={0.6}
            />
            <text
              x={cx - w / 2 + 8}
              y={y + 13.5}
              fill={CLR_RED}
              fontSize="14"
              fontWeight="600"
              fontFamily="Inter, system-ui, sans-serif"
            >
              {"⚠ " + label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Gateway value badges (secured final step)
// ---------------------------------------------------------------------------
function GatewayBadges({
  node,
  badges,
}: {
  node: NodeDef;
  badges: string[];
}) {
  const cx = node.x + node.width / 2;
  const baseY = node.y + node.height + 14;
  return (
    <g>
      {badges.map((label, i) => {
        const w = label.length * 6 + 60;
        const y = baseY + i * 24;
        return (
          <g key={label}>
            <rect
              x={cx - w / 2}
              y={y}
              width={w}
              height={18}
              rx="9"
              fill={CLR_BLUE}
              opacity={0.12}
            />
            <rect
              x={cx - w / 2}
              y={y}
              width={w}
              height={18}
              rx="9"
              fill="none"
              stroke={CLR_BLUE}
              strokeWidth="1"
              opacity={0.5}
            />
            <text
              x={cx}
              y={y + 12.5}
              textAnchor="middle"
              fill={CLR_BLUE}
              fontSize="14"
              fontWeight="600"
              fontFamily="Inter, system-ui, sans-serif"
            >
              {label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Theme icons
// ---------------------------------------------------------------------------
function SunIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Step progress dots
// ---------------------------------------------------------------------------
function StepProgress({
  total,
  current,
  color,
}: {
  total: number;
  current: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="transition-all duration-300 rounded-full"
          style={{
            width: i === current ? 28 : 10,
            height: 10,
            backgroundColor: i <= current ? color : "#2A2D37",
            boxShadow: i === current ? `0 0 10px ${color}60` : "none",
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function extractSessionId(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  type HookGroup = Array<{ checks?: Array<{ data?: { session_id?: string } }> }>;
  const hr = d.hook_results as { after_request_hooks?: HookGroup; before_request_hooks?: HookGroup } | undefined;
  for (const hooks of [hr?.after_request_hooks, hr?.before_request_hooks]) {
    for (const hook of hooks ?? []) {
      for (const check of hook.checks ?? []) {
        if (check.data?.session_id) return check.data.session_id;
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
type ChatPhase =
  | "idle" | "typing" | "backend" | "processing"
  | "resp0" | "resp1" | "resp2" | "resp3" | "endpoint";

export default function ArchitectureFlowDiagram() {
  const [darkMode, setDarkMode] = useState(true);
  const [secured, setSecured] = useState(false);
  const [rawResponse, setRawResponse] = useState<unknown>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [svgReady, setSvgReady] = useState(false);
  const [autoplay, setAutoplay] = useState(false);
  const [chatPhase, setChatPhase] = useState<ChatPhase>("idle");
  const chatPhaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [scmUrlTemplate, setScmUrlTemplate] = useState(
    (import.meta.env.VITE_PORTKEY_SCM_REPORT_URL as string | undefined) ?? ""
  );

  // Load scmReportUrl from server config on mount so it survives page reloads.
  // Falls back to the VITE_ build-time value if not available.
  useEffect(() => {
    const token = localStorage.getItem("chat-admin-password");
    if (!token) return;
    fetch("/api/config", { headers: { "x-admin-password": token } })
      .then(r => r.ok ? r.json() as Promise<{ portkey?: { scmReportUrl?: string } }> : null)
      .then(cfg => { if (cfg?.portkey?.scmReportUrl) setScmUrlTemplate(cfg.portkey.scmReportUrl); })
      .catch(() => {});
  }, []);

  const nodes = secured ? securedNodes : unsecuredNodes;
  const edges = secured ? securedEdges : unsecuredEdges;
  const steps = secured ? securedSteps : unsecuredSteps;
  const step = steps[currentStep];
  const totalSteps = steps.length;
  const accentColor = secured ? CLR_BLUE : CLR_ORANGE;

  const nodeMap = useMemo(() => {
    const map: Record<string, NodeDef> = {};
    for (const n of nodes) map[n.id] = n;
    return map;
  }, [nodes]);

  const edgePaths = useMemo(
    () =>
      edges.map((e) => ({
        ...e,
        key: edgeKey(e),
        path: buildCurvePath(nodeMap[e.from], nodeMap[e.to]),
      })),
    [edges, nodeMap]
  );

  const activeNodeSet = useMemo(() => new Set(step.activeNodes), [step]);

  const TRANSIENT_EDGES = new Set(["gateway-scm", "gateway-intercept"]);

  const activeEdgeSet = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i <= currentStep; i++) {
      for (const e of steps[i].activeEdges) {
        if (!TRANSIENT_EDGES.has(e)) set.add(e);
      }
    }
    for (const e of step.activeEdges) {
      set.add(e);
    }
    return set;
  }, [currentStep, step, steps]);

  const nodeToStep = useMemo(() => {
    const map: Record<string, number> = {};
    for (let i = steps.length - 1; i >= 0; i--) {
      for (const nid of steps[i].activeNodes) {
        map[nid] = i;
      }
    }
    return map;
  }, [steps]);

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      const stepIdx = nodeToStep[nodeId];
      if (stepIdx !== undefined) {
        setAutoplay(false);
        setCurrentStep(stepIdx);
      }
    },
    [nodeToStep]
  );

  const handleToggle = useCallback(() => {
    setSvgReady(false);
    setSecured((s) => !s);
    setCurrentStep(0);
  }, []);

  const nextStep = useCallback(
    () => setCurrentStep((s) => Math.min(s + 1, totalSteps - 1)),
    [totalSteps]
  );
  const prevStep = useCallback(
    () => setCurrentStep((s) => Math.max(s - 1, 0)),
    []
  );
  const resetStep = useCallback(() => {
    setCurrentStep(0);
  }, []);

  // ---- Chat-phase callbacks ------------------------------------------------
  const clearChatTimer = () => {
    if (chatPhaseTimer.current) { clearTimeout(chatPhaseTimer.current); chatPhaseTimer.current = null; }
  };

  const handleChatFocus = useCallback(() => {
    clearChatTimer();
    setCurrentStep(1);
    setAutoplay(false);
    setChatPhase("typing");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChatBlur = useCallback(() => {
    setChatPhase((p) => {
      if (p === "typing") { setCurrentStep(0); return "idle"; }
      return p;
    });
  }, []);

  const handleChatSend = useCallback(() => {
    clearChatTimer();
    setChatPhase("backend");
    chatPhaseTimer.current = setTimeout(() => setChatPhase("processing"), 800);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChatResponse = useCallback(() => {
    clearChatTimer();
    const seq: ChatPhase[] = ["resp0", "resp1", "resp2", "resp3", "endpoint"];
    let i = 0;
    const advance = () => {
      setChatPhase(seq[i]);
      i++;
      if (i < seq.length) {
        chatPhaseTimer.current = setTimeout(advance, 100);
      } else {
        // Hold "endpoint" then return to idle
        chatPhaseTimer.current = setTimeout(() => setChatPhase("idle"), 5000);
      }
    };
    advance();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Clean up timer on unmount
  useEffect(() => () => clearChatTimer(), []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Live node/edge overrides from chat phase ----------------------------
  const liveActiveNodes = useMemo((): Set<string> | null => {
    switch (chatPhase) {
      case "idle":       return null;
      case "typing":     return new Set(["endpoint", "frontend"]);
      case "backend":    return new Set(["frontend", "backend"]);
      case "processing": return secured
        ? new Set(["backend", "gateway", "scm", "intercept"])
        : new Set(["backend", "llm"]);
      // Response reverse-walk (secured: gateway→llm → gateway→backend → backend→frontend → endpoint→frontend)
      // Response reverse-walk (unsecured: llm→backend → backend→frontend → endpoint→frontend → endpoint)
      case "resp0": return secured ? new Set(["gateway", "llm"])     : new Set(["llm", "backend"]);
      case "resp1": return secured ? new Set(["gateway", "backend"]) : new Set(["backend", "frontend"]);
      case "resp2": return secured ? new Set(["backend", "frontend"]) : new Set(["endpoint", "frontend"]);
      case "resp3": return secured ? new Set(["endpoint", "frontend"]) : new Set(["endpoint"]);
      case "endpoint":   return new Set(["endpoint"]);
    }
  }, [chatPhase, secured]);

  const liveActiveEdges = useMemo((): Set<string> | null => {
    switch (chatPhase) {
      case "idle":       return null;
      case "typing":     return new Set(["endpoint-frontend"]);
      case "backend":    return new Set(["frontend-backend"]);
      case "processing": return secured
        ? new Set(["backend-gateway", "gateway-scm", "gateway-intercept"])
        : new Set(["backend-llm"]);
      case "resp0": return secured ? new Set(["gateway-llm"])     : new Set(["backend-llm"]);
      case "resp1": return secured ? new Set(["backend-gateway"]) : new Set(["frontend-backend"]);
      case "resp2": return secured ? new Set(["frontend-backend"]) : new Set(["endpoint-frontend"]);
      case "resp3": return secured ? new Set(["endpoint-frontend"]) : new Set<string>();
      case "endpoint":   return new Set<string>();
    }
  }, [chatPhase, secured]);

  const effectiveActiveNodes = liveActiveNodes ?? activeNodeSet;
  const effectiveActiveEdges = liveActiveEdges ?? activeEdgeSet;

  const toggleAutoplay = useCallback(() => setAutoplay((a) => !a), []);

  useEffect(() => {
    if (!autoplay) return;
    const delay = step.holdMs ?? 1000;
    const id = setTimeout(() => {
      setCurrentStep((s) => (s + 1) % totalSteps);
    }, delay);
    return () => clearTimeout(id);
  }, [autoplay, totalSteps, currentStep, step]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setSvgReady(true));
    return () => cancelAnimationFrame(frame);
  }, [secured]);

  const svgHeight = secured ? 360 : 360;

  const th = {
    appBg:          darkMode ? "#0D0E12"  : "#F0F4F8",
    titleColor:     darkMode ? "#FFFFFF"  : "#111827",
    subtitleColor:  darkMode ? "#6B7280"  : "#6B7280",
    controlBg:      darkMode ? "#1A1B22"  : "#FFFFFF",
    controlBgHover: darkMode ? "#22232C"  : "#F1F5F9",
    controlBorder:  darkMode ? "#2A2D37"  : "#D1D5DB",
    controlText:    darkMode ? "#9CA3AF"  : "#6B7280",
    dividerBg:      darkMode ? "#2A2D37"  : "#D1D5DB",
    stepDescText:   darkMode ? "#9CA3AF"  : "#6B7280",
    legendText:     darkMode ? "#6B7280"  : "#6B7280",
    toggleOffset:   darkMode ? "#0D0E12"  : "#F0F4F8",
    diagramBg:      darkMode ? "#13141A"  : "#F5F7FA",
    diagramBorder:  darkMode ? "#1E2028"  : "#CBD5E1",
  };

  const rp = {
    bg:           darkMode ? "#13141A" : "#FFFFFF",
    border:       darkMode ? "#1E2028" : "#E2E8F0",
    headerBg:     darkMode ? "#0F1015" : "#F5F7FA",
    headerBorder: darkMode ? "#2A2D37" : "#D1D5DB",
    text:         darkMode ? "#9CA3AF" : "#4B5563",
    muted:        darkMode ? "#6B7280" : "#9CA3AF",
  };

  const sessionId = extractSessionId(rawResponse);
  const scmUrl = sessionId
    ? scmUrlTemplate.replace("${sessionId}", sessionId)
    : null;

  return (
    <ThemeContext.Provider value={{ darkMode, toggleTheme: () => setDarkMode((d) => !d) }}>
    <div
      className="min-h-screen flex flex-row items-start p-6 pt-[30px] gap-4 font-[Inter,system-ui,sans-serif]"
      style={{ backgroundColor: th.appBg }}
    >
      {/* Left: diagram content */}
      <div className="flex-1 min-w-0 flex flex-col items-center">
      <div className="w-full max-w-[1100px]">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="font-bold mb-1 tracking-tight" style={{ color: th.titleColor, fontSize: "1.5625rem" }}>
            Prisma AIRS AI Gateway and Security Guardrails Demo
          </h1>
          <p className="text-sm" style={{ color: th.subtitleColor }}>
            Interactive live demo with step-by-step data flow visualization
          </p>
        </div>

        {/* Scenario toggle */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <span
            className="text-sm font-medium transition-colors duration-300"
            style={{ color: !secured ? CLR_ORANGE : "#6B7280" }}
          >
            Unsecured
          </span>
          <button
            onClick={handleToggle}
            className="relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{ backgroundColor: secured ? CLR_BLUE : "#3B3E4A" }}
            aria-label={`Switch to ${secured ? "unsecured" : "secured"} flow`}
          >
            <span
              className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300"
              style={{ transform: secured ? "translateX(28px)" : "translateX(0)" }}
            />
          </button>
          <span
            className="text-sm font-medium transition-colors duration-300"
            style={{ color: secured ? CLR_BLUE : "#6B7280" }}
          >
            Secured
          </span>
        </div>

        {/* Step controls */}
        <div className="flex items-center justify-center gap-3 mb-5">
          <button
            onClick={prevStep}
            disabled={currentStep === 0 || autoplay}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              borderColor: accentColor + "50",
              color: accentColor,
              background: accentColor + "10",
            }}
          >
            Previous Step
          </button>
          <button
            onClick={resetStep}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-200"
            style={{ borderColor: th.controlBorder, color: th.controlText, background: th.controlBg }}
          >
            Reset
          </button>
          <button
            onClick={nextStep}
            disabled={currentStep === totalSteps - 1 || autoplay}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              borderColor: accentColor + "50",
              color: "#fff",
              background: accentColor,
            }}
          >
            Next Step
          </button>

          <div className="w-px h-5 mx-1" style={{ backgroundColor: th.dividerBg }} />

          <button
            onClick={toggleAutoplay}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-200 flex items-center gap-1.5"
            style={{
              borderColor: autoplay ? "#22C55E80" : th.controlBorder,
              color: autoplay ? "#22C55E" : th.controlText,
              background: autoplay ? "#22C55E14" : th.controlBg,
            }}
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-full transition-colors duration-200"
              style={{ backgroundColor: autoplay ? "#22C55E" : th.controlText }}
            />
            {autoplay ? "Auto-playing" : "Auto-play"}
          </button>
        </div>

        {/* SVG diagram */}
        <div
          className="rounded-2xl border p-4 shadow-2xl overflow-hidden"
          style={{
            background: th.diagramBg,
            borderColor: th.diagramBorder,
            boxShadow: secured
              ? `0 0 80px ${CLR_BLUE}10, 0 0 30px ${CLR_BLUE}08`
              : `0 0 80px ${CLR_RED}10, 0 0 30px ${CLR_RED}08`,
          }}
        >
          <svg
            viewBox={`0 0 1080 ${svgHeight}`}
            className="w-full h-auto"
            style={{ minHeight: 280 }}
          >
            <defs>
              <filter id="line-glow">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Edges */}
            {edgePaths.map((e, i) => {
              const active = effectiveActiveEdges.has(e.key);
              return (
                <g
                  key={e.key}
                  style={{ transition: "opacity 0.4s", opacity: active ? 1 : 0.3 }}
                >
                  <path
                    d={e.path}
                    fill="none"
                    stroke={e.color}
                    strokeWidth="2"
                    opacity="0.25"
                    filter="url(#line-glow)"
                  />
                  <path
                    d={e.path}
                    fill="none"
                    stroke={e.color}
                    strokeWidth="1"
                    opacity="0.6"
                    strokeDasharray="6 4"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="0"
                      to="-20"
                      dur="1s"
                      repeatCount="indefinite"
                    />
                  </path>
                  {svgReady && active && (
                    <AnimatedParticles
                      pathData={e.path}
                      color={e.color}
                      edgeIndex={i}
                    />
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {nodes.map((node) => (
              <FlowNode
                key={node.id}
                node={node}
                active={effectiveActiveNodes.has(node.id)}
                onClick={() => handleNodeClick(node.id)}
              />
            ))}

            {/* Risk callouts — unsecured final step */}
            {!secured && step.risks && nodeMap["llm"] && (
              <RiskBadges node={nodeMap["llm"]} risks={step.risks} />
            )}

            {/* Gateway badges — secured final step */}
            {secured && step.gatewayBadges && nodeMap["gateway"] && (
              <GatewayBadges
                node={nodeMap["gateway"]}
                badges={step.gatewayBadges}
              />
            )}
          </svg>
        </div>

        {/* Step indicator */}
        <div className="mt-5 flex flex-col items-center gap-3">
          <StepProgress total={totalSteps} current={currentStep} color={accentColor} />

          <div
            className="w-full rounded-xl border px-5 py-4 transition-all duration-300"
            style={{
              borderColor: accentColor + "30",
              background: accentColor + "08",
              minHeight: 80,
            }}
          >
            <div
              className="text-sm font-bold mb-1"
              style={{ color: accentColor }}
            >
              {step.title}
            </div>
            <div className="text-xs leading-relaxed" style={{ color: th.stepDescText }}>
              {step.description}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-5 flex items-center justify-center gap-5 flex-wrap">
          {nodes.map((node) => (
            <div key={node.id} className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: node.color }}
              />
              <span className="text-[11px]" style={{ color: th.legendText }}>
                {node.label}
                {node.sublabel ? ` (${node.sublabel})` : ""}
              </span>
            </div>
          ))}
        </div>
      </div>
      </div>
      {/* Right: chat panel + API response box */}
      <div
        className="w-[420px] shrink-0 sticky top-[35px] flex flex-col gap-2"
        style={{ height: "calc(100vh - 80px)" }}
      >
        {/* Chat panel — 70% */}
        <div style={{ flex: 7, minHeight: 0, overflow: "hidden" }}>
          <ChatPanel
            secured={secured}
            onRawResponse={setRawResponse}
            onInputFocus={handleChatFocus}
            onInputBlur={handleChatBlur}
            onSend={handleChatSend}
            onResponse={handleChatResponse}
          />
        </div>

        {/* API Response box — 30% */}
        <div
          className="rounded-2xl border overflow-hidden flex flex-col"
          style={{ flex: 3, minHeight: 0, background: rp.bg, borderColor: rp.border }}
        >
          {/* Header */}
          <div
            className="px-3 py-2 border-b shrink-0 flex items-center gap-2"
            style={{ background: rp.headerBg, borderColor: rp.headerBorder }}
          >
            <div className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: secured ? CLR_BLUE : CLR_ORANGE }} />
            <span className="text-xs font-semibold" style={{ color: rp.text }}>
              API Response
            </span>
            <div className="ml-auto flex items-center gap-2">
              {scmUrl && (
                <a
                  href={scmUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] px-2 py-0.5 rounded font-semibold transition-opacity hover:opacity-80"
                  style={{ background: CLR_BLUE + "22", color: CLR_BLUE, border: `1px solid ${CLR_BLUE}40` }}
                >
                  View Report ↗
                </a>
              )}
              {!!rawResponse && (
                <span className="text-[11px] px-1.5 py-0.5 rounded"
                  style={{ background: CLR_TEAL + "18", color: CLR_TEAL }}>
                  JSON
                </span>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-3 min-h-0">
            {rawResponse ? (
              <JsonTree data={rawResponse} darkMode={darkMode} />
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-xs text-center select-none" style={{ color: rp.muted }}>
                  Response will appear here<br />after sending a message
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Theme toggle — fixed bottom-left, to the left of the Admin button */}
      <button
        onClick={() => setDarkMode((d) => !d)}
        className="fixed bottom-4 left-4 z-40 flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all shadow-lg"
        style={{
          background: darkMode ? "#0F1015" : "#FFFFFF",
          borderColor: th.controlBorder,
          color: th.controlText,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = CLR_TEAL + "80";
          e.currentTarget.style.color = CLR_TEAL;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = th.controlBorder;
          e.currentTarget.style.color = th.controlText;
        }}
        title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
      >
        {darkMode ? <SunIcon /> : <MoonIcon />}
      </button>
      {/* Admin panel — renders its own fixed-position trigger button */}
      <AdminPage onScmReportUrl={setScmUrlTemplate} />
    </div>
    </ThemeContext.Provider>
  );
}
