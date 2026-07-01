import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
<<<<<<< HEAD
import type { PetMood, PetVariant, PetStage } from "@/lib/store";
=======
import type { PetMood, PetVariant } from "@/lib/store";
>>>>>>> 40376e2 (UI of choose pet)

type Props = {
  mood?: PetMood;
  variant?: PetVariant;
<<<<<<< HEAD
  stage?: PetStage;
=======
>>>>>>> 40376e2 (UI of choose pet)
  size?: number;
  className?: string;
};

<<<<<<< HEAD
type Species = {
  baseName: string;
  stageNames: [string, string, string];
  desc: string;
  emoji: string;
  body: string;
  bodyDim: string;
  bodySoft: string;
  stroke: string;
  belly: string;
  accent: string;
  inner: string;
  extra?: string;
  aura: string; // glow color for stage 3
};

const SPECIES: Record<PetVariant, Species> = {
  CAT: {
    baseName: "Mochi",
    stageNames: ["Kitten", "Young CAT", "Royal CAT"],
    desc: "A curious tabby who loves naps and new words.",
    emoji: "🐱",
    body: "#ffb066",
    bodyDim: "#f0a25c",
    bodySoft: "#ffc890",
    stroke: "#8a4a17",
    belly: "#fff3e0",
    accent: "#ff8fb0",
    inner: "#ffd1b3",
    aura: "#ffd166",
  },
  FOX: {
    baseName: "Ember",
    stageNames: ["Cub", "FOX", "Spirit FOX"],
    desc: "Clever FOX always sniffing out vocabulary.",
    emoji: "🦊",
    body: "#ff7a3d",
    bodyDim: "#e87035",
    bodySoft: "#ff9466",
    stroke: "#7a2a0a",
    belly: "#fff1e6",
    accent: "#ffb39c",
    inner: "#fff1e6",
    aura: "#a78bfa",
  },
  BUNNY: {
    baseName: "Pippin",
    stageNames: ["Baby BUNNY", "Rabbit", "Moon Rabbit"],
    desc: "Soft hopper who bounces between flashcards.",
    emoji: "🐰",
    body: "#fafafa",
    bodyDim: "#ececec",
    bodySoft: "#ffffff",
    stroke: "#7a6a78",
    belly: "#fff",
    accent: "#ff9bc0",
    inner: "#ffd1e0",
    aura: "#bae6fd",
  },
  PANDA: {
    baseName: "Bao",
    stageNames: ["Cub PANDA", "PANDA", "Master PANDA"],
    desc: "Chill bamboo scholar with infinite focus.",
    emoji: "🐼",
    body: "#fdfdfd",
    bodyDim: "#e8e8e8",
    bodySoft: "#ffffff",
    stroke: "#2a2a2a",
    belly: "#fff",
    accent: "#ffb3c6",
    inner: "#222",
    extra: "#1a1a1a",
    aura: "#86efac",
  },
  DRAGON: {
    baseName: "Zephyr",
    stageNames: ["Baby DRAGON", "DRAGON", "Ancient DRAGON"],
    desc: "Mythic mentor with a hoard of rare words.",
    emoji: "🐲",
    body: "#7ed957",
    bodyDim: "#69c544",
    bodySoft: "#a4e882",
    stroke: "#2f6e1c",
    belly: "#eaffd6",
    accent: "#ff8fb0",
    inner: "#c4f0a0",
    extra: "#ffd95a",
    aura: "#f59e0b",
  },
};

// ---------- Per-species ear / wing geometry ----------

function Ears({ variant, p, stage }: { variant: PetVariant; p: Species; stage: PetStage }) {
  const scale = stage === 1 ? 0.8 : stage === 3 ? 1.15 : 1;
  switch (variant) {
    case "CAT":
      return (
        <g transform={`translate(50 30) scale(${scale}) translate(-50 -30)`}>
          <path
            d="M22 36 L18 16 L36 28 Z"
            fill={p.body}
            stroke={p.stroke}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M78 36 L82 16 L64 28 Z"
            fill={p.body}
            stroke={p.stroke}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M24 32 L22 22 L31 28 Z" fill={p.inner} />
          <path d="M76 32 L78 22 L69 28 Z" fill={p.inner} />
        </g>
      );
    case "FOX":
      return (
        <g transform={`translate(50 28) scale(${scale}) translate(-50 -28)`}>
          <path
            d="M18 36 L12 10 L36 26 Z"
            fill={p.body}
            stroke={p.stroke}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M82 36 L88 10 L64 26 Z"
            fill={p.body}
            stroke={p.stroke}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M22 30 L18 16 L30 26 Z" fill={p.inner} />
          <path d="M78 30 L82 16 L70 26 Z" fill={p.inner} />
        </g>
      );
    case "BUNNY": {
      const h = stage === 1 ? 12 : stage === 3 ? 20 : 16;
      return (
        <g>
          <ellipse
            cx="36"
            cy={30 - h}
            rx="6"
            ry={h}
            fill={p.body}
            stroke={p.stroke}
            strokeWidth="2"
            transform={`rotate(-12 36 ${30 - h})`}
          />
          <ellipse
            cx="64"
            cy={30 - h}
            rx="6"
            ry={h}
            fill={p.body}
            stroke={p.stroke}
            strokeWidth="2"
            transform={`rotate(12 64 ${30 - h})`}
          />
          <ellipse
            cx="36"
            cy={32 - h}
            rx="2.5"
            ry={h - 4}
            fill={p.inner}
            transform={`rotate(-12 36 ${32 - h})`}
          />
          <ellipse
            cx="64"
            cy={32 - h}
            rx="2.5"
            ry={h - 4}
            fill={p.inner}
            transform={`rotate(12 64 ${32 - h})`}
          />
        </g>
      );
    }
    case "PANDA":
      return (
        <g>
          <circle
            cx="24"
            cy="26"
            r={stage === 1 ? 7 : stage === 3 ? 10 : 9}
            fill={p.inner}
            stroke={p.stroke}
            strokeWidth="2"
          />
          <circle
            cx="76"
            cy="26"
            r={stage === 1 ? 7 : stage === 3 ? 10 : 9}
            fill={p.inner}
            stroke={p.stroke}
            strokeWidth="2"
          />
        </g>
      );
    case "DRAGON":
      return (
        <g>
          <path d="M30 26 L26 14 L36 22 Z" fill={p.extra} stroke={p.stroke} strokeWidth="1.5" />
          <path d="M70 26 L74 14 L64 22 Z" fill={p.extra} stroke={p.stroke} strokeWidth="1.5" />
          {stage >= 2 && (
            <>
              <path
                d="M18 56 Q4 50 6 70 Q16 64 22 66 Z"
                fill={p.inner}
                stroke={p.stroke}
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M82 56 Q96 50 94 70 Q84 64 78 66 Z"
                fill={p.inner}
                stroke={p.stroke}
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </>
          )}
          {stage === 3 && (
            <g fill={p.extra} stroke={p.stroke} strokeWidth="1">
              <path d="M22 22 L18 8 L28 18 Z" />
              <path d="M78 22 L82 8 L72 18 Z" />
            </g>
          )}
        </g>
      );
  }
}

function Extras({ variant, p, stage }: { variant: PetVariant; p: Species; stage: PetStage }) {
  switch (variant) {
    case "CAT":
      return stage === 1 ? null : (
        <g stroke={p.stroke} strokeWidth="1.2" strokeLinecap="round">
          <path d="M18 60 L30 58" />
          <path d="M18 64 L30 62" />
          <path d="M82 60 L70 58" />
          <path d="M82 64 L70 62" />
          {stage === 3 && (
            <>
              <path d="M18 56 L30 56" />
              <path d="M82 56 L70 56" />
            </>
          )}
        </g>
      );
    case "FOX":
      return (
        <path
          d="M50 28 L46 38 L54 38 Z"
          fill={p.belly}
          stroke={p.stroke}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      );
    case "PANDA":
      return (
        <g>
          <ellipse
            cx="38"
            cy="50"
            rx={stage === 1 ? 6 : 8}
            ry={stage === 1 ? 7 : 9}
            fill={p.extra}
          />
          <ellipse
            cx="62"
            cy="50"
            rx={stage === 1 ? 6 : 8}
            ry={stage === 1 ? 7 : 9}
            fill={p.extra}
          />
        </g>
      );
    case "DRAGON":
      return (
        <g fill={p.extra}>
          {stage >= 2 && <path d="M50 28 L48 33 L52 33 Z" />}
          {stage === 3 && <path d="M50 30 L46 26 L54 26 Z" stroke={p.stroke} strokeWidth="1" />}
        </g>
      );
    default:
      return null;
  }
}

// ---------- Stage 3 species crowns / accessories ----------

function Stage3Accessory({ variant, p }: { variant: PetVariant; p: Species }) {
  switch (variant) {
    case "CAT":
      // Royal crown
      return (
        <g>
          <path
            d="M30 22 L36 10 L42 18 L50 6 L58 18 L64 10 L70 22 Z"
            fill="#ffd700"
            stroke="#8a6500"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <rect
            x="30"
            y="22"
            width="40"
            height="5"
            fill="#ffb700"
            stroke="#8a6500"
            strokeWidth="1.2"
          />
          <circle cx="50" cy="14" r="2.2" fill="#ff4d6d" stroke="#8a0020" strokeWidth="0.6" />
          <circle cx="38" cy="20" r="1.4" fill="#3ddc97" />
          <circle cx="62" cy="20" r="1.4" fill="#3d9fdc" />
        </g>
      );
    case "FOX":
      // Floating halo + spirit flames
      return (
        <g>
          <ellipse
            cx="50"
            cy="10"
            rx="22"
            ry="5"
            fill="none"
            stroke={p.aura}
            strokeWidth="2.5"
            opacity="0.9"
          />
          <ellipse
            cx="50"
            cy="10"
            rx="14"
            ry="3"
            fill="none"
            stroke={p.aura}
            strokeWidth="1.4"
            opacity="0.7"
          />
          <path d="M20 70 Q14 60 22 56 Q18 66 26 64 Z" fill={p.aura} opacity="0.7" />
          <path d="M80 70 Q86 60 78 56 Q82 66 74 64 Z" fill={p.aura} opacity="0.7" />
        </g>
      );
    case "BUNNY":
      // Moon behind + sparkles
      return (
        <g>
          <circle cx="50" cy="20" r="14" fill="#fef3c7" opacity="0.55" />
          <circle cx="50" cy="20" r="9" fill="#fde68a" opacity="0.7" />
          <g fill="#fef3c7">
            <circle cx="18" cy="30" r="1.5" />
            <circle cx="82" cy="36" r="1.2" />
            <circle cx="14" cy="68" r="1.2" />
            <circle cx="86" cy="60" r="1.5" />
          </g>
        </g>
      );
    case "PANDA":
      // Sage hat + bamboo
      return (
        <g>
          <path
            d="M22 24 Q50 4 78 24 L72 26 Q50 16 28 26 Z"
            fill="#7a3b1f"
            stroke="#3a1a09"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <ellipse cx="50" cy="24" rx="30" ry="3" fill="#a14e2a" stroke="#3a1a09" strokeWidth="1" />
          <g stroke="#3a8a2a" strokeWidth="2" fill="#7ed957" strokeLinecap="round">
            <rect x="86" y="40" width="4" height="40" rx="1.5" />
            <path d="M88 50 L94 46" />
            <path d="M88 60 L94 56" />
            <path d="M88 70 L94 66" />
          </g>
        </g>
      );
    case "DRAGON":
      // Ancient horns + glowing orb
      return (
        <g>
          <path
            d="M34 18 Q26 4 18 14 Q24 8 32 22 Z"
            fill={p.extra}
            stroke={p.stroke}
            strokeWidth="1.4"
          />
          <path
            d="M66 18 Q74 4 82 14 Q76 8 68 22 Z"
            fill={p.extra}
            stroke={p.stroke}
            strokeWidth="1.4"
          />
          <circle cx="50" cy="14" r="4" fill={p.aura} opacity="0.9" />
          <circle cx="50" cy="14" r="6" fill="none" stroke={p.aura} strokeWidth="1" opacity="0.6" />
        </g>
      );
  }
}

// ---------- Main Pet ----------

export function Pet({ mood = "happy", variant = "CAT", stage = 2, size = 96, className }: Props) {
  const p = SPECIES[variant] ?? SPECIES.CAT;
  const bodyColor = mood === "sad" ? p.bodySoft : mood === "sleepy" ? p.bodyDim : p.body;
=======
const PALETTES: Record<
  PetVariant,
  {
    body: string;
    bodyDim: string;
    bodySoft: string;
    stroke: string;
    belly: string;
    leaf: string;
    leafStroke: string;
    accent: string;
  }
> = {
  leaf: {
    body: "#7ed957",
    bodyDim: "#8fcf6a",
    bodySoft: "#a7e26d",
    stroke: "#3a8a2e",
    belly: "#f4ffe5",
    leaf: "#a8e063",
    leafStroke: "#3a8a2e",
    accent: "#ffb3c6",
  },
  ocean: {
    body: "#5fb8ff",
    bodyDim: "#6fbff0",
    bodySoft: "#9ed8ff",
    stroke: "#1d6fb8",
    belly: "#eaf6ff",
    leaf: "#a0d8ff",
    leafStroke: "#1d6fb8",
    accent: "#ffd1e0",
  },
  blossom: {
    body: "#ff9bc6",
    bodyDim: "#f4a8c8",
    bodySoft: "#ffc1d9",
    stroke: "#c34a85",
    belly: "#fff0f6",
    leaf: "#ffd1e6",
    leafStroke: "#c34a85",
    accent: "#ffe0a8",
  },
  sunny: {
    body: "#ffd95a",
    bodyDim: "#f5cf5c",
    bodySoft: "#ffe89a",
    stroke: "#c48a13",
    belly: "#fffbe7",
    leaf: "#ffeaa1",
    leafStroke: "#c48a13",
    accent: "#ffb37a",
  },
  cocoa: {
    body: "#b07853",
    bodyDim: "#a87856",
    bodySoft: "#caa07f",
    stroke: "#5e3a22",
    belly: "#fbeede",
    leaf: "#caa07f",
    leafStroke: "#5e3a22",
    accent: "#ffb3c6",
  },
};

export function Pet({ mood = "happy", variant = "leaf", size = 96, className }: Props) {
  const p = PALETTES[variant] ?? PALETTES.leaf;
  const bodyColor = mood === "hungry" ? p.bodySoft : mood === "sleepy" ? p.bodyDim : p.body;
>>>>>>> 40376e2 (UI of choose pet)
  const cheek = mood === "excited" ? "#ff8fb0" : p.accent;
  const eyeShape = mood === "sleepy" ? "sleepy" : "open";
  const eyeColor = variant === "PANDA" ? "#fff" : "#1b1b1b";
  const eyeStroke = variant === "PANDA" ? "#fff" : "#1b1b1b";

  // proportions per stage
  const head =
    stage === 1
      ? { cx: 50, cy: 56, rx: 34, ry: 32, bellyRy: 14, eyeY: 50, eyeR: 5, footY: 88 }
      : stage === 3
        ? { cx: 50, cy: 58, rx: 34, ry: 31, bellyRy: 19, eyeY: 50, eyeR: 4, footY: 88 }
        : { cx: 50, cy: 58, rx: 32, ry: 30, bellyRy: 18, eyeY: 50, eyeR: 4, footY: 88 };

  return (
    <motion.div
      className={cn("relative inline-block animate-bob", className)}
      style={{ width: size, height: size }}
      animate={mood === "excited" ? { rotate: [-4, 4, -4] } : {}}
      transition={{ repeat: mood === "excited" ? Infinity : 0, duration: 0.6 }}
    >
      <svg viewBox="0 0 100 100" width={size} height={size}>
<<<<<<< HEAD
        <defs>
          <radialGradient id={`aura-${variant}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={p.aura} stopOpacity="0.55" />
            <stop offset="70%" stopColor={p.aura} stopOpacity="0" />
          </radialGradient>
        </defs>

        {stage === 3 && <circle cx="50" cy="55" r="48" fill={`url(#aura-${variant})`} />}

        <ellipse cx="50" cy="92" rx="28" ry="4" fill="rgba(0,0,0,0.12)" />
        <Ears variant={variant} p={p} stage={stage} />

        {/* body */}
        <ellipse
          cx={head.cx}
          cy={head.cy}
          rx={head.rx}
          ry={head.ry}
=======
        <ellipse cx="50" cy="92" rx="28" ry="4" fill="rgba(0,0,0,0.12)" />
        <ellipse
          cx="50"
          cy="58"
          rx="32"
          ry="30"
>>>>>>> 40376e2 (UI of choose pet)
          fill={bodyColor}
          stroke={p.stroke}
          strokeWidth="2.5"
        />
<<<<<<< HEAD
        <ellipse
          cx={head.cx}
          cy={head.cy + 6}
          rx={head.rx * 0.62}
          ry={head.bellyRy}
          fill={p.belly}
        />

        <Extras variant={variant} p={p} stage={stage} />

        {/* cheeks */}
        <circle cx="28" cy="62" r={stage === 1 ? 5.5 : 5} fill={cheek} opacity="0.85" />
        <circle cx="72" cy="62" r={stage === 1 ? 5.5 : 5} fill={cheek} opacity="0.85" />

        {/* eyes */}
=======
        <ellipse cx="50" cy="64" rx="20" ry="18" fill={p.belly} />
        <path d="M22 36 L18 18 L34 28 Z" fill={bodyColor} stroke={p.stroke} strokeWidth="2" />
        <path d="M78 36 L82 18 L66 28 Z" fill={bodyColor} stroke={p.stroke} strokeWidth="2" />
        <circle cx="28" cy="60" r="5" fill={cheek} opacity="0.8" />
        <circle cx="72" cy="60" r="5" fill={cheek} opacity="0.8" />
>>>>>>> 40376e2 (UI of choose pet)
        {eyeShape === "open" ? (
          <g className="animate-blink">
            <ellipse cx="38" cy={head.eyeY} rx={head.eyeR} ry={head.eyeR + 1.5} fill={eyeColor} />
            <ellipse cx="62" cy={head.eyeY} rx={head.eyeR} ry={head.eyeR + 1.5} fill={eyeColor} />
            <circle cx="39.5" cy={head.eyeY - 2} r="1.4" fill="#fff" />
            <circle cx="63.5" cy={head.eyeY - 2} r="1.4" fill="#fff" />
            {stage === 3 && (
              <g fill={p.aura}>
                <circle cx="36.5" cy={head.eyeY + 3} r="0.9" />
                <circle cx="60.5" cy={head.eyeY + 3} r="0.9" />
              </g>
            )}
          </g>
        ) : (
          <g stroke={eyeStroke} strokeWidth="2.5" fill="none" strokeLinecap="round">
            <path d={`M33 ${head.eyeY} Q38 ${head.eyeY + 4} 43 ${head.eyeY}`} />
            <path d={`M57 ${head.eyeY} Q62 ${head.eyeY + 4} 67 ${head.eyeY}`} />
          </g>
        )}
<<<<<<< HEAD

        {/* mouth */}
        {variant === "DRAGON" ? (
          <g>
            <path
              d="M44 62 Q50 70 56 62"
              stroke={p.stroke}
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
            {stage >= 2 && (
              <path
                d="M52 66 L55 70"
                stroke={p.belly}
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
              />
            )}
          </g>
        ) : mood === "sad" ? (
          <path
            d="M44 68 Q50 62 56 68"
            stroke="#3a1f1f"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        ) : mood === "sleepy" ? (
          <path
            d="M46 66 Q50 68 54 66"
=======
        {mood === "hungry" ? (
          <ellipse cx="50" cy="64" rx="4" ry="5" fill="#3a1f1f" />
        ) : mood === "sleepy" ? (
          <path
            d="M46 64 Q50 66 54 64"
>>>>>>> 40376e2 (UI of choose pet)
            stroke="#3a1f1f"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
<<<<<<< HEAD
        ) : mood === "waiting" ? (
          <path
            d="M44 65 L56 65"
            stroke={p.stroke}
            strokeWidth="2.2"
            fill="none"
            strokeLinecap="round"
          />
        ) : (
          <g>
            <ellipse cx="50" cy="60" rx="2.2" ry="1.6" fill={p.stroke} />
            <path
              d="M44 64 Q50 70 56 64"
              stroke={p.stroke}
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            {stage === 1 && <ellipse cx="50" cy="67" rx="1.6" ry="1.1" fill="#fff" />}
          </g>
        )}

        {/* feet */}
        <ellipse cx="38" cy={head.footY} rx={stage === 1 ? 6 : 7} ry="4" fill={p.stroke} />
        <ellipse cx="62" cy={head.footY} rx={stage === 1 ? 6 : 7} ry="4" fill={p.stroke} />

        {/* baby pacifier sparkle */}
        {stage === 1 && (
          <g fill={p.accent}>
            <circle cx="20" cy="40" r="1.6" />
            <circle cx="80" cy="42" r="1.2" />
          </g>
        )}

        {stage === 3 && <Stage3Accessory variant={variant} p={p} />}
=======
        ) : (
          <path
            d="M44 62 Q50 70 56 62"
            stroke="#3a1f1f"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
        )}
        <path
          d="M50 22 Q56 14 64 16 Q60 24 52 26 Z"
          fill={p.leaf}
          stroke={p.leafStroke}
          strokeWidth="1.5"
        />
        <ellipse cx="38" cy="88" rx="7" ry="4" fill={p.stroke} />
        <ellipse cx="62" cy="88" rx="7" ry="4" fill={p.stroke} />
>>>>>>> 40376e2 (UI of choose pet)
      </svg>
      {mood === "sleepy" && (
        <div className="absolute -top-2 right-0 text-info text-lg font-bold animate-bob">z</div>
      )}
    </motion.div>
  );
}

<<<<<<< HEAD
export function getStageName(variant: PetVariant, stage: PetStage) {
  return SPECIES[variant].stageNames[stage - 1];
}

export const PET_VARIANTS: {
  id: PetVariant;
  name: string;
  desc: string;
  emoji: string;
  stageNames: [string, string, string];
}[] = (Object.keys(SPECIES) as PetVariant[]).map((id) => ({
  id,
  name: SPECIES[id].baseName,
  desc: SPECIES[id].desc,
  emoji: SPECIES[id].emoji,
  stageNames: SPECIES[id].stageNames,
}));
=======
export const PET_VARIANTS: { id: PetVariant; name: string; desc: string }[] = [
  { id: "leaf", name: "Sprout", desc: "Loves forests and fresh starts." },
  { id: "ocean", name: "Splash", desc: "A curious tide-pool explorer." },
  { id: "blossom", name: "Petal", desc: "Sweet, gentle, always cheering you on." },
  { id: "sunny", name: "Sunny", desc: "Warm energy, never misses a streak." },
  { id: "cocoa", name: "Cocoa", desc: "Cozy bookworm who adores study time." },
];
>>>>>>> 40376e2 (UI of choose pet)
