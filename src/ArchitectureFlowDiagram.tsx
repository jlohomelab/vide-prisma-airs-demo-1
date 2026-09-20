import { type JSX, useCallback, useEffect, useMemo, useRef, useState } from "react";

interface NodeDef {
  id: string;
  label: string;
  sublabel?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  icon: string;
}

interface EdgeDef {
  from: string;
  to: string;
  color: string;
}

const CLR_ORANGE = "#FF6B2B";
const CLR_TEAL = "#00C9A7";
const CLR_BLUE = "#4FC3F7";
const CLR_RED = "#FF4D6A";
const CLR_PURPLE = "#B388FF";
const CLR_YELLOW = "#FFD54F";
const NODE_BG = "#1E2028";
const NODE_BORDER = "#2A2D37";

const ICONS: Record<string, (color: string) => JSX.Element> = {
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

const unsecuredNodes: NodeDef[] = [
  { id: "endpoint", label: "Endpoint", x: 80, y: 220, width: 140, height: 70, color: CLR_BLUE, icon: "endpoint" },
  { id: "frontend", label: "Frontend", x: 340, y: 220, width: 140, height: 70, color: CLR_TEAL, icon: "frontend" },
  { id: "backend", label: "Backend", sublabel: "RAG", x: 600, y: 220, width: 140, height: 70, color: CLR_PURPLE, icon: "backend" },
  { id: "llm", label: "LLM", x: 860, y: 220, width: 140, height: 70, color: CLR_YELLOW, icon: "llm" },
];

const unsecuredEdges: EdgeDef[] = [
  { from: "endpoint", to: "frontend", color: CLR_BLUE },
  { from: "frontend", to: "backend", color: CLR_TEAL },
  { from: "backend", to: "llm", color: CLR_PURPLE },
];

const securedNodes: NodeDef[] = [
  { id: "endpoint", label: "Endpoint", x: 80, y: 220, width: 140, height: 70, color: CLR_BLUE, icon: "endpoint" },
  { id: "frontend", label: "Frontend", x: 290, y: 220, width: 130, height: 70, color: CLR_TEAL, icon: "frontend" },
  { id: "backend", label: "Backend", sublabel: "RAG", x: 490, y: 220, width: 130, height: 70, color: CLR_PURPLE, icon: "backend" },
  { id: "gateway", label: "AIRS AI", sublabel: "Gateway", x: 690, y: 220, width: 130, height: 70, color: CLR_ORANGE, icon: "gateway" },
  { id: "scm", label: "Strata Cloud", sublabel: "Manager", x: 610, y: 80, width: 140, height: 64, color: CLR_RED, icon: "scm" },
  { id: "intercept", label: "AIRS Intercept", sublabel: "DLP / Malware", x: 780, y: 80, width: 150, height: 64, color: CLR_RED, icon: "intercept" },
  { id: "llm", label: "LLM", x: 900, y: 220, width: 130, height: 70, color: CLR_YELLOW, icon: "llm" },
];

const securedEdges: EdgeDef[] = [
  { from: "endpoint", to: "frontend", color: CLR_BLUE },
  { from: "frontend", to: "backend", color: CLR_TEAL },
  { from: "backend", to: "gateway", color: CLR_PURPLE },
  { from: "gateway", to: "scm", color: CLR_ORANGE },
  { from: "gateway", to: "intercept", color: CLR_ORANGE },
  { from: "gateway", to: "llm", color: CLR_ORANGE },
];

function getNodeCenter(node: NodeDef): { x: number; y: number } {
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
      const newOffsets: number[] = [];
      for (let i = 0; i < particleCount; i++) {
        const t = ((elapsed * speed + stagger + i / particleCount) % 1);
        newOffsets.push(t);
      }
      setOffsets(newOffsets);
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [pathData, stagger]);

  const pathLength = useMemo(() => {
    if (!pathRef.current) return 0;
    return pathRef.current.getTotalLength();
  }, [pathData, pathRef.current]);

  return (
    <g>
      <path ref={pathRef} d={pathData} fill="none" stroke="transparent" />
      {pathRef.current &&
        pathLength > 0 &&
        offsets.map((t, i) => {
          const point = pathRef.current!.getPointAtLength(t * pathLength);
          return (
            <g key={i}>
              <circle
                cx={point.x}
                cy={point.y}
                r="8"
                fill={color}
                opacity={0.15}
              />
              <circle
                cx={point.x}
                cy={point.y}
                r="4"
                fill={color}
                opacity={0.4}
              />
              <circle
                cx={point.x}
                cy={point.y}
                r="2"
                fill="white"
                opacity={0.9}
              />
            </g>
          );
        })}
    </g>
  );
}

function FlowNode({ node }: { node: NodeDef }) {
  const icon = ICONS[node.icon];
  return (
    <g>
      <defs>
        <filter id={`glow-${node.id}`}>
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feFlood floodColor={node.color} floodOpacity="0.3" result="color" />
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
        filter={`url(#glow-${node.id})`}
      />

      <rect
        x={node.x}
        y={node.y}
        width={node.width}
        height={node.height}
        rx="12"
        fill="none"
        stroke={node.color}
        strokeWidth="1"
        opacity="0.4"
      />

      <g transform={`translate(${node.x + node.width / 2 - 16}, ${node.y + 8})`}>
        {icon(node.color)}
      </g>

      <text
        x={node.x + node.width / 2}
        y={node.y + node.height - (node.sublabel ? 18 : 12)}
        textAnchor="middle"
        fill="white"
        fontSize="12"
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
          fontSize="12"
          fontFamily="Inter, system-ui, sans-serif"
        >
          {node.sublabel}
        </text>
      )}
    </g>
  );
}

export default function ArchitectureFlowDiagram() {
  const [secured, setSecured] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const [svgReady, setSvgReady] = useState(false);

  const nodes = secured ? securedNodes : unsecuredNodes;
  const edges = secured ? securedEdges : unsecuredEdges;

  const nodeMap = useMemo(() => {
    const map: Record<string, NodeDef> = {};
    for (const n of nodes) map[n.id] = n;
    return map;
  }, [nodes]);

  const edgePaths = useMemo(
    () =>
      edges.map((e) => ({
        ...e,
        path: buildCurvePath(nodeMap[e.from], nodeMap[e.to]),
      })),
    [edges, nodeMap]
  );

  const handleToggle = useCallback(() => {
    setSvgReady(false);
    setSecured((s) => !s);
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setSvgReady(true));
    return () => cancelAnimationFrame(frame);
  }, [secured]);

  return (
    <div className="min-h-screen bg-[#0D0E12] flex flex-col items-center justify-center p-8 font-[Inter,system-ui,sans-serif]">
      <div className="w-full max-w-[1100px]">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
            Prisma AIRS AI Gateway and Security Guardrails Demo
          </h1>
          <p className="text-gray-400 text-sm">
            Interactive live demo with step-by-step data flow visualization
          </p>
        </div>

        <div className="flex items-center justify-center gap-4 mb-8">
          <span
            className={`text-sm font-medium transition-colors duration-300 ${
              !secured ? "text-[#4FC3F7]" : "text-gray-500"
            }`}
          >
            Unsecured
          </span>

          <button
            onClick={handleToggle}
            className="relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0D0E12]"
            style={{
              backgroundColor: secured ? CLR_ORANGE : "#3B3E4A",
            }}
            aria-label={`Switch to ${secured ? "unsecured" : "secured"} flow`}
          >
            <span
              className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300"
              style={{
                transform: secured ? "translateX(28px)" : "translateX(0)",
              }}
            />
          </button>

          <span
            className={`text-sm font-medium transition-colors duration-300 ${
              secured ? "text-[#FF6B2B]" : "text-gray-500"
            }`}
          >
            Secured
          </span>
        </div>

        <div
          className="rounded-2xl border border-[#1E2028] bg-[#13141A] p-4 shadow-2xl overflow-hidden"
          style={{
            boxShadow: secured
              ? `0 0 80px ${CLR_ORANGE}10, 0 0 30px ${CLR_ORANGE}08`
              : "0 0 80px rgba(0,0,0,0.3)",
          }}
        >
          <svg
            ref={svgRef}
            viewBox="0 0 1080 340"
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

            {edgePaths.map((e, i) => (
              <g key={`${e.from}-${e.to}`}>
                <path
                  d={e.path}
                  fill="none"
                  stroke={e.color}
                  strokeWidth="2"
                  opacity="0.2"
                  filter="url(#line-glow)"
                />
                <path
                  d={e.path}
                  fill="none"
                  stroke={e.color}
                  strokeWidth="1"
                  opacity="0.5"
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
                {svgReady && (
                  <AnimatedParticles
                    pathData={e.path}
                    color={e.color}
                    edgeIndex={i}
                  />
                )}
              </g>
            ))}

            {nodes.map((node) => (
              <FlowNode key={node.id} node={node} />
            ))}
          </svg>
        </div>

        <div className="mt-6 flex items-center justify-center gap-6 flex-wrap">
          {nodes.map((node) => (
            <div key={node.id} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: node.color }}
              />
              <span className="text-xs text-gray-400">
                {node.label}
                {node.sublabel ? ` (${node.sublabel})` : ""}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
