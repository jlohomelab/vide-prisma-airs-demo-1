import { useState, type JSX } from "react";

type JsonPrimitive = string | number | boolean | null;
interface JsonObject { [key: string]: JsonVal; }
type JsonVal = JsonPrimitive | JsonVal[] | JsonObject;

type Palette = {
  key: string; str: string; num: string; bool: string;
  nil: string; punct: string; toggle: string; strLong: string;
};

function darkPalette(): Palette {
  return {
    key:     "#7FBAFF",
    str:     "#98C379",
    num:     "#D19A66",
    bool:    "#C678DD",
    nil:     "#6B7280",
    punct:   "#ABB2BF",
    toggle:  "#4B5563",
    strLong: "#6A9955",
  };
}

function lightPalette(): Palette {
  return {
    key:     "#0550AE",
    str:     "#22863A",
    num:     "#C25219",
    bool:    "#7A3E9D",
    nil:     "#9CA3AF",
    punct:   "#444",
    toggle:  "#AAA",
    strLong: "#3A7A3A",
  };
}

const MAX_INLINE_STR = 120;

function StringVal({ v, p }: { v: string; p: Palette }): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  if (v.length <= MAX_INLINE_STR) {
    return <span style={{ color: p.str }}>&quot;{v}&quot;</span>;
  }
  return (
    <span style={{ color: p.str }}>
      &quot;{expanded ? v : v.slice(0, MAX_INLINE_STR)}
      <button
        onClick={(e) => { e.stopPropagation(); setExpanded(x => !x); }}
        style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", color: p.strLong, padding: "0 2px" }}
      >
        {expanded ? " ▲ less" : `…+${v.length - MAX_INLINE_STR} more`}
      </button>
      &quot;
    </span>
  );
}

function Node({ val, depth, p }: { val: JsonVal; depth: number; p: Palette }): JSX.Element {
  const [open, setOpen] = useState(depth < 2);

  if (val === null)            return <span style={{ color: p.nil }}>null</span>;
  if (typeof val === "boolean") return <span style={{ color: p.bool }}>{String(val)}</span>;
  if (typeof val === "number")  return <span style={{ color: p.num }}>{val}</span>;
  if (typeof val === "string")  return <StringVal v={val} p={p} />;

  const isArr = Array.isArray(val);
  const entries: [string, JsonVal][] = isArr
    ? (val as JsonVal[]).map((v, i) => [String(i), v])
    : Object.entries(val as Record<string, JsonVal>);
  const [L, R] = isArr ? ["[", "]"] : ["{", "}"];

  if (entries.length === 0) {
    return <span style={{ color: p.punct }}>{L}{R}</span>;
  }

  return (
    <span>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: "inherit" }}
      >
        <span style={{ color: p.toggle, fontSize: "7px", marginRight: "2px" }}>
          {open ? "▼" : "▶"}
        </span>
        <span style={{ color: p.punct }}>{L}</span>
      </button>

      {open ? (
        <>
          {entries.map(([k, v], i) => (
            <div key={k} style={{ paddingLeft: "1.1em" }}>
              {!isArr && (
                <>
                  <span style={{ color: p.key }}>&quot;{k}&quot;</span>
                  <span style={{ color: p.punct }}>: </span>
                </>
              )}
              <Node val={v} depth={depth + 1} p={p} />
              {i < entries.length - 1 && <span style={{ color: p.punct }}>,</span>}
            </div>
          ))}
          <span style={{ color: p.punct }}>{R}</span>
        </>
      ) : (
        <>
          <span style={{ color: p.toggle, fontSize: "10px" }}>
            {" "}{isArr ? `${entries.length} item${entries.length !== 1 ? "s" : ""}` : `${entries.length} key${entries.length !== 1 ? "s" : ""}`}
          </span>
          <span style={{ color: p.punct }}>{R}</span>
        </>
      )}
    </span>
  );
}

export default function JsonTree({ data, darkMode }: { data: unknown; darkMode: boolean }): JSX.Element {
  const p = darkMode ? darkPalette() : lightPalette();
  return (
    <span className="text-[11px] font-mono leading-relaxed">
      <Node val={data as JsonVal} depth={0} p={p} />
    </span>
  );
}
