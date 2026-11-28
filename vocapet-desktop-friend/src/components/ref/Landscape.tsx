import type { ReactNode } from "react";

/**
 * Layered SVG Japanese scenery (Fuji, pagoda, pine, cherry branches, hills, petals, flowers) in the reference
 * palette. One viewBox, anchored bottom with `slice`, so it fills any container; each page picks a variant.
 */
export type LandscapeVariant = "welcome" | "today" | "plan" | "library" | "flash" | "progress";

const C = {
  fuji: "#c9d3d0",
  fujiShade: "#b3c0bd",
  snow: "#fbfaf6",
  hill1: "#e1e9d6",
  hill2: "#cfdcc4",
  hill3: "#b9cba9",
  forest: "#3d6f58",
  roof: "#3b6a55",
  wall: "#efc4b3",
  wallDark: "#dd9b84",
  trunk: "#6b5a4f",
  blossom: ["#f6cfcb", "#f2b9b4", "#f9dedb", "#eaa8a6"],
  petal: "#f5c9b8",
  cloud: "#ffffff",
};

/** Deterministic pseudo-random so server and client render identical blossoms. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function Fuji({ x, y, s = 1, o = 1 }: { x: number; y: number; s?: number; o?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o}>
      <path d="M0 0 L168 -142 Q200 -160 232 -142 L400 0Z" fill={C.fuji} />
      <path d="M232 -142 L400 0 L300 0 L240 -70Z" fill={C.fujiShade} opacity=".55" />
      <path
        d="M146 -121 L168 -142 Q200 -160 232 -142 L254 -121 L238 -129 L224 -112 L208 -130 L192 -111 L176 -128Z"
        fill={C.snow}
      />
    </g>
  );
}

function Cloud({ x, y, s = 1, o = 0.75 }: { x: number; y: number; s?: number; o?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o} fill={C.cloud}>
      <ellipse cx="0" cy="0" rx="60" ry="10" />
      <ellipse cx="-22" cy="-9" rx="28" ry="11" />
      <ellipse cx="18" cy="-12" rx="32" ry="13" />
    </g>
  );
}

function Roof({ cx, y, w }: { cx: number; y: number; w: number }) {
  const l = cx - w / 2;
  const r = cx + w / 2;
  return (
    <path
      d={`M${l - 10} ${y + 7} Q${l + 4} ${y + 5} ${l + 14} ${y - 8} L${r - 14} ${y - 8} Q${r - 4} ${y + 5} ${r + 10} ${y + 7} Q${cx} ${y + 13} ${l - 10} ${y + 7}Z`}
      fill={C.roof}
    />
  );
}

function Pagoda({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const tiers = [
    { w: 92, y: -176, h: 26 },
    { w: 78, y: -140, h: 24 },
    { w: 64, y: -106, h: 22 },
    { w: 50, y: -74, h: 20 },
  ];
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-2" y="-232" width="4" height="48" fill={C.roof} />
      {[-222, -212, -202].map((ty) => (
        <rect key={ty} x="-6" y={ty} width="12" height="3" rx="1.5" fill={C.roof} />
      ))}
      {tiers.map((t, i) => (
        <g key={i}>
          <rect x={-t.w / 2 + 10} y={t.y + 2} width={t.w - 20} height={t.h} fill={C.wall} />
          <rect x={-t.w / 2 + 10} y={t.y + t.h - 2} width={t.w - 20} height="4" fill={C.wallDark} />
          {[-1, 0, 1].map((k) => (
            <rect key={k} x={k * 16 - 4} y={t.y + 8} width="8" height={t.h - 12} rx="1" fill={C.wallDark} opacity=".8" />
          ))}
          <Roof cx={0} y={t.y} w={t.w} />
        </g>
      ))}
      <rect x="-30" y="-52" width="60" height="42" fill={C.wall} />
      <rect x="-9" y="-40" width="18" height="30" rx="2" fill={C.wallDark} />
      <Roof cx={0} y={-52} w={74} />
      <path d="M-46 -8 H46 L40 0 H-40Z" fill={C.roof} opacity=".85" />
    </g>
  );
}

/** Rounded-cloud pine (niwaki) with a leaning trunk. */
function Pine({ x, y, s = 1, o = 1 }: { x: number; y: number; s?: number; o?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o}>
      <path d="M0 0 Q-6 -34 8 -62 Q16 -80 6 -96" stroke={C.trunk} strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M8 -50 Q34 -56 46 -72" stroke={C.trunk} strokeWidth="4" fill="none" strokeLinecap="round" />
      <ellipse cx="2" cy="-104" rx="38" ry="13" fill={C.forest} />
      <ellipse cx="48" cy="-78" rx="26" ry="9" fill={C.forest} opacity=".9" />
      <ellipse cx="-18" cy="-74" rx="22" ry="8" fill={C.forest} opacity=".85" />
    </g>
  );
}

function Branch({ x, y, s = 1, flip = false, seed = 1, o = 1 }: { x: number; y: number; s?: number; flip?: boolean; seed?: number; o?: number }) {
  const r = rng(seed);
  const stems = [
    "M0 0 Q120 40 210 20 T400 70",
    "M120 28 Q150 90 130 140",
    "M240 24 Q280 -20 330 -30",
    "M300 50 Q340 100 330 160",
  ];
  const dots: ReactNode[] = [];
  const spots: Array<[number, number, number]> = [[190, 18, 50], [300, 54, 58], [130, 120, 40], [340, -20, 40], [330, 140, 44], [60, 24, 36]];
  spots.forEach(([cx, cy, spread], k) => {
    for (let i = 0; i < 34; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * spread;
      dots.push(
        <circle
          key={`${k}-${i}`}
          cx={cx + Math.cos(a) * d}
          cy={cy + Math.sin(a) * d * 0.75}
          r={3 + r() * 5.5}
          fill={C.blossom[Math.floor(r() * C.blossom.length)]}
          opacity={0.55 + r() * 0.4}
        />,
      );
    }
  });
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`} opacity={o}>
      {stems.map((d, i) => (
        <path key={i} d={d} stroke={C.trunk} strokeWidth={i === 0 ? 6 : 3} fill="none" strokeLinecap="round" />
      ))}
      {dots}
    </g>
  );
}

function Flower({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0 Q-4 30 2 60" stroke="#7f9a72" strokeWidth="3" fill="none" />
      <path d="M2 44 Q-18 34 -22 46 Q-6 52 2 44Z" fill="#9db58d" />
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="0" cy="-10" rx="7" ry="11" fill="#fbeceb" stroke="#f1c2c0" strokeWidth="1" transform={`rotate(${a})`} />
      ))}
      <circle r="4" fill="#f0c36a" />
    </g>
  );
}

function Petals({ seed = 7, n = 14, w = 1000, h = 420 }: { seed?: number; n?: number; w?: number; h?: number }) {
  const r = rng(seed);
  return (
    <g fill={C.petal}>
      {Array.from({ length: n }, (_, i) => (
        <ellipse
          key={i}
          cx={r() * w}
          cy={r() * h}
          rx={4 + r() * 3}
          ry={2.6 + r() * 1.6}
          opacity={0.55 + r() * 0.4}
          transform={`rotate(${r() * 180} ${0} ${0})`}
          style={{ transformOrigin: "center", transformBox: "fill-box" }}
        />
      ))}
    </g>
  );
}

function Hills({ high = 0 }: { high?: number }) {
  // pushed down so the hills read as a low horizon, with soft overlapping ridges (no hard edges)
  return (
    <g transform={`translate(0 ${70 - high})`}>
      <path d="M-20 600 V470 Q140 410 360 470 T700 500 T1020 470 V600Z" fill={C.hill1} />
      <path d="M-20 600 V520 Q260 450 560 520 T1020 500 V600Z" fill={C.hill2} opacity=".9" />
      <path d="M-20 600 V560 Q240 520 520 565 T1020 545 V600Z" fill={C.hill3} opacity=".8" />
    </g>
  );
}

export function Landscape({
  variant,
  className = "",
}: {
  variant: LandscapeVariant;
  className?: string;
}) {
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 1000 600"
      preserveAspectRatio="xMidYMax slice"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    >
      {variant === "welcome" && (
        <>
          <circle cx="620" cy="200" r="170" fill="#f8e2dc" opacity=".7" />
          <Cloud x={420} y={180} s={1.1} />
          <Cloud x={820} y={150} s={0.8} />
          <Fuji x={300} y={560} s={1.5} o={0.9} />
          <Hills />
          <Pagoda x={730} y={490} s={1.15} />
          <Pine x={860} y={520} s={0.85} o={0.95} />
          <Branch x={900} y={-10} s={1} flip seed={3} />
          <Petals seed={11} n={18} />
        </>
      )}
      {variant === "today" && (
        <>
          <Cloud x={820} y={110} s={1} o={0.6} />
          <Fuji x={560} y={600} s={1.3} o={0.7} />
          <Hills high={0} />
          <Pine x={960} y={520} s={0.7} o={0.8} />
          <Branch x={1030} y={-20} s={0.9} flip seed={5} o={0.9} />
          <Petals seed={4} n={10} />
        </>
      )}
      {variant === "plan" && (
        <>
          <circle cx="880" cy="110" r="150" fill="#f8e2dc" opacity=".55" />
          <Hills high={20} />
          <Branch x={1030} y={-10} s={0.9} flip seed={9} o={0.9} />
          <Petals seed={2} n={14} />
        </>
      )}
      {variant === "library" && (
        <>
          <Cloud x={860} y={120} s={0.9} o={0.6} />
          <Fuji x={540} y={600} s={1.2} o={0.75} />
          <Hills high={30} />
          <Flower x={900} y={510} s={0.9} />
          <Flower x={950} y={535} s={0.6} />
          <Pine x={60} y={560} s={0.6} o={0.75} />
          <Petals seed={8} n={8} />
        </>
      )}
      {variant === "flash" && (
        <>
          <Cloud x={200} y={120} s={0.9} o={0.55} />
          <Hills high={40} />
          <Flower x={80} y={490} s={1.5} />
          <Flower x={150} y={525} s={0.9} />
          <Flower x={940} y={520} s={0.8} />
          <Petals seed={13} n={10} />
        </>
      )}
      {variant === "progress" && (
        <>
          <circle cx="840" cy="130" r="160" fill="#f8e2dc" opacity=".5" />
          <Fuji x={540} y={600} s={1.2} o={0.6} />
          <Hills high={0} />
          <Branch x={1030} y={-30} s={0.9} flip seed={17} o={0.9} />
          <Petals seed={6} n={14} />
        </>
      )}
    </svg>
  );
}
