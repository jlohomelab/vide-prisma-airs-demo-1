import { type JSX, useCallback, useEffect, useMemo, useRef, useState } from "react";
import ChatPanel from "./ChatPanel";
import RagAdmin from "./RagAdmin";

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
const NODE_BG = "#1E2028";
const NODE_BORDER = "#2A2D37";
const DIM = 0.7;

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
  { id: "endpoint", label: "Endpoint", sublabel: "Attacker", x: 80, y: 200, width: 140, height: 70, color: CLR_RED, icon: "endpoint" },
  { id: "frontend", label: "Frontend", sublabel: "App UI", x: 340, y: 200, width: 140, height: 70, color: CLR_TEAL, icon: "frontend" },
  { id: "backend", label: "Backend", sublabel: "RAG", x: 600, y: 200, width: 140, height: 70, color: CLR_PURPLE, icon: "backend" },
  { id: "llm", label: "LLM", sublabel: "Single-Model", x: 860, y: 200, width: 140, height: 70, color: "#FFFFFF", activeColor: CLR_RED, icon: "llm" },
];

const unsecuredEdges: EdgeDef[] = [
  { from: "endpoint", to: "frontend", color: CLR_RED },
  { from: "frontend", to: "backend", color: CLR_TEAL },
  { from: "backend", to: "llm", color: CLR_PURPLE },
];

const unsecuredSteps: StepDef[] = [
  {
    activeNodes: ["endpoint", "frontend"],
    activeEdges: ["endpoint-frontend"],
    title: "Step 1 — User Request",
    description:
      "End user sends a prompt request through the application endpoint to the frontend interface.",
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
    risks: ["Prompt Injection", "Sensitive Data Leakage", "Model Evasion"],
    holdMs: 5000,
  },
];

const securedNodes: NodeDef[] = [
  { id: "endpoint", label: "Endpoint", sublabel: "Attacker", x: 60, y: 220, width: 120, height: 70, color: CLR_RED, icon: "endpoint" },
  { id: "frontend", label: "Frontend", sublabel: "App UI", x: 240, y: 220, width: 120, height: 70, color: CLR_TEAL, icon: "frontend" },
  { id: "backend", label: "Backend", sublabel: "RAG", x: 420, y: 220, width: 120, height: 70, color: CLR_PURPLE, icon: "backend" },
  { id: "gateway", label: "AIRS AI", sublabel: "Gateway", x: 600, y: 220, width: 130, height: 70, color: CLR_BLUE, icon: "gateway" },
  { id: "scm", label: "Strata Cloud", sublabel: "Manager", x: 540, y: 68, width: 130, height: 60, color: CLR_YELLOW, icon: "scm" },
  { id: "intercept", label: "AIRS API", sublabel: "DLP / Threats", x: 720, y: 68, width: 140, height: 60, color: CLR_BLUE, icon: "intercept" },
  { id: "llm", label: "LLM", sublabel: "Multi-Model", x: 900, y: 220, width: 130, height: 70, color: "#FFFFFF", icon: "llm" },
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
    activeNodes: ["endpoint", "frontend"],
    activeEdges: ["endpoint-frontend"],
    title: "Step 1 — User Request",
    description:
      "End user sends a prompt request through the application endpoint to the frontend interface.",
  },
  {
    activeNodes: ["frontend", "backend"],
    activeEdges: ["frontend-backend"],
    title: "Step 2 — RAG Data Retrieval",
    description:
      "Frontend forwards the request to the backend, which performs Retrieval-Augmented Generation to gather relevant context data.",
  },
  {
    activeNodes: ["backend", "gateway", "scm", "intercept"],
    activeEdges: ["backend-gateway", "gateway-scm", "gateway-intercept"],
    title: "Step 3 — AIRS Gateway & Policy Sync",
    description:
      "Backend routes the request through the AIRS AI Gateway, which synchronizes security policies from Strata Cloud Manager in real time.",
  },
  {
    activeNodes: ["gateway", "scm", "intercept"],
    activeEdges: ["gateway-scm", "gateway-intercept"],
    title: "Step 4 — DLP & Security Scanning",
    description:
      "AIRS API performs real-time Data Loss Prevention and malware scanning on the request payload before it reaches any LLM.",
  },
  {
    activeNodes: ["gateway", "llm"],
    activeEdges: ["gateway-llm"],
    title: "Step 5 — Secure Multi-LLM Distribution",
    description:
      "After passing all security checks, the AIRS Gateway routes the sanitized request to the optimal LLM with full observability and guardrails.",
    gatewayBadges: [
      "Observability",
      "Budget / Token Limits",
      "Load Balancing",
      "Security Guardrails",
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
  const icon = ICONS[node.icon];
  const nodeColor = active && node.activeColor ? node.activeColor : node.color;
  const opacity = active ? 1 : DIM;
  const glowOpacity = active ? "0.35" : "0";
  const borderOpacity = active ? 0.7 : 0.15;
  const filterId = `glow-${node.id}-${active ? "on" : "off"}`;

  return (
    <g
      style={{ transition: "opacity 0.4s", opacity, cursor: onClick ? "pointer" : "default" }}
      onClick={onClick}
    >
      <defs>
        <filter id={filterId}>
          <feGaussianBlur stdDeviation={active ? "4" : "2"} result="blur" />
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
        fill={NODE_BG}
        stroke={NODE_BORDER}
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
        y={node.y + node.height - (node.sublabel ? 18 : 12)}
        textAnchor="middle"
        fill="white"
        fontSize="11"
        fontWeight="600"
        fontFamily="Inter, system-ui, sans-serif"
      >
        {node.label}
      </text>
      {node.sublabel && (
        <text
          x={node.x + node.width / 2}
          y={node.y + node.height - 6}
          textAnchor="middle"
          fill="#9CA3AF"
          fontSize="9.5"
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
        const w = label.length * 6.5 + 20;
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
              fontSize="9.5"
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
        const w = label.length * 6 + 22;
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
              fontSize="9"
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
// Main component
// ---------------------------------------------------------------------------
export default function ArchitectureFlowDiagram() {
  const [secured, setSecured] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [svgReady, setSvgReady] = useState(false);
  const [autoplay, setAutoplay] = useState(true);

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

  const toggleAutoplay = useCallback(() => setAutoplay((a) => !a), []);

  useEffect(() => {
    if (!autoplay) return;
    const delay = step.holdMs ?? 2000;
    const id = setTimeout(() => {
      setCurrentStep((s) => (s + 1) % totalSteps);
    }, delay);
    return () => clearTimeout(id);
  }, [autoplay, totalSteps, currentStep, step]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setSvgReady(true));
    return () => cancelAnimationFrame(frame);
  }, [secured]);

  const svgHeight = secured ? 420 : 380;

  return (
    <div className="min-h-screen bg-[#0D0E12] flex flex-row items-start p-6 pt-[80px] gap-4 font-[Inter,system-ui,sans-serif]">
      {/* Left: diagram content */}
      <div className="flex-1 min-w-0 flex flex-col items-center">
      <div className="w-full max-w-[1100px]">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">
            Prisma AIRS AI Security Architecture
          </h1>
          <p className="text-gray-500 text-sm">
            Interactive step-by-step data flow visualization
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
            className="relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0D0E12]"
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
            className="px-4 py-1.5 text-xs font-semibold rounded-lg border border-[#2A2D37] text-gray-400 bg-[#1A1B22] hover:bg-[#22232C] transition-all duration-200"
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

          <div className="w-px h-5 bg-[#2A2D37] mx-1" />

          <button
            onClick={toggleAutoplay}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-200 flex items-center gap-1.5"
            style={{
              borderColor: autoplay ? "#22C55E80" : "#2A2D37",
              color: autoplay ? "#22C55E" : "#9CA3AF",
              background: autoplay ? "#22C55E14" : "#1A1B22",
            }}
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-full transition-colors duration-200"
              style={{ backgroundColor: autoplay ? "#22C55E" : "#6B7280" }}
            />
            {autoplay ? "Auto-playing" : "Auto-play"}
          </button>
        </div>

        {/* SVG diagram */}
        <div
          className="rounded-2xl border border-[#1E2028] bg-[#13141A] p-4 shadow-2xl overflow-hidden"
          style={{
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
              const active = activeEdgeSet.has(e.key);
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
                active={activeNodeSet.has(node.id)}
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
            <div className="text-xs text-gray-400 leading-relaxed">
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
              <span className="text-[11px] text-gray-500">
                {node.label}
                {node.sublabel ? ` (${node.sublabel})` : ""}
              </span>
            </div>
          ))}
        </div>
      </div>
      </div>
      {/* Right: chat panel — sticky so it stays in view while diagram scrolls */}
      <div
        className="w-[360px] shrink-0 sticky top-[80px]"
        style={{ height: "calc(100vh - 104px)" }}
      >
        <ChatPanel secured={secured} />
      </div>
      {/* Admin panel — renders its own fixed-position trigger button */}
      <RagAdmin />
    </div>
  );
}
