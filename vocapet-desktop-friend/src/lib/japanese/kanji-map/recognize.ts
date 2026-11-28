// Offline handwriting matcher: compares the user's strokes with KanjiVG stroke paths (src/data/kanji/strokes).
// Pure functions (no DOM, no network) so it runs in the browser and in Node tests. Nothing is sent anywhere.

export type Pt = { x: number; y: number };
export type Match = { char: string; score: number; confidence: number };
export type KanjiIndex = Map<string, Pt[][]>;

const N = 16; // points per resampled stroke
const BOX = 109; // KanjiVG viewBox
const STRETCH = 0.5; // 0 = keep aspect ratio, 1 = stretch to fill the box (users draw 日 wider than KanjiVG)
const UNMATCHED = 28; // penalty per stroke that has no partner
const ORDER_PENALTY = 1.25; // free stroke order costs a little, so correct order wins ties
/** Best score above this is reported as "not recognised". Calibrated by tools/kanjiRecognizeTest.ts. */
export const MAX_SCORE = 24;

// ---------- SVG path -> polyline (KanjiVG uses M m C c S s only; L/H/V kept for safety) ----------
function flattenPath(d: string): Pt[] {
  const tok = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  const pts: Pt[] = [];
  let i = 0,
    cmd = "",
    x = 0,
    y = 0,
    sx = 0,
    sy = 0,
    cx = 0,
    cy = 0; // cx,cy: last cubic control point
  const num = () => parseFloat(tok[i++]);
  const cubic = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => {
    for (let t = 1; t <= 12; t++) {
      const u = t / 12,
        a = (1 - u) ** 3,
        b = 3 * u * (1 - u) ** 2,
        c = 3 * u * u * (1 - u),
        e = u ** 3;
      pts.push({ x: a * x + b * x1 + c * x2 + e * x3, y: a * y + b * y1 + c * y2 + e * y3 });
    }
    cx = x2;
    cy = y2;
    x = x3;
    y = y3;
  };
  while (i < tok.length) {
    if (/[a-zA-Z]/.test(tok[i])) cmd = tok[i++];
    const rel = cmd === cmd.toLowerCase();
    const ox = rel ? x : 0,
      oy = rel ? y : 0;
    switch (cmd.toUpperCase()) {
      case "M":
        x = ox + num();
        y = oy + num();
        sx = x;
        sy = y;
        cx = x;
        cy = y;
        pts.push({ x, y });
        cmd = rel ? "l" : "L";
        break;
      case "L":
        x = ox + num();
        y = oy + num();
        pts.push({ x, y });
        break;
      case "H":
        x = (rel ? x : 0) + num();
        pts.push({ x, y });
        break;
      case "V":
        y = (rel ? y : 0) + num();
        pts.push({ x, y });
        break;
      case "C": {
        const a = ox + num(),
          b = oy + num(),
          c = ox + num(),
          e = oy + num();
        cubic(a, b, c, e, ox + num(), oy + num());
        break;
      }
      case "S": {
        const c = ox + num(),
          e = oy + num();
        cubic(2 * x - cx, 2 * y - cy, c, e, ox + num(), oy + num());
        break;
      }
      case "Z":
        x = sx;
        y = sy;
        break;
      default:
        i++; // unknown command: skip a token rather than loop forever
    }
  }
  return pts;
}

/** Resample a polyline to n points evenly spaced along its length. */
function resample(p: Pt[], n = N): Pt[] {
  if (p.length === 1) return Array.from({ length: n }, () => p[0]);
  const len = [0];
  for (let i = 1; i < p.length; i++)
    len.push(len[i - 1] + Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y));
  const total = len[len.length - 1];
  if (total === 0) return Array.from({ length: n }, () => p[0]);
  const out: Pt[] = [];
  let j = 1;
  for (let k = 0; k < n; k++) {
    const t = (total * k) / (n - 1);
    while (j < p.length - 1 && len[j] < t) j++;
    const seg = len[j] - len[j - 1] || 1,
      f = (t - len[j - 1]) / seg;
    out.push({
      x: p[j - 1].x + (p[j].x - p[j - 1].x) * f,
      y: p[j - 1].y + (p[j].y - p[j - 1].y) * f,
    });
  }
  return out;
}

/** Fit all strokes into the KanjiVG box (partial stretch, centred). Same transform for user and templates. */
function normalize(strokes: Pt[][]): Pt[][] {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const s of strokes)
    for (const p of s) {
      x0 = Math.min(x0, p.x);
      y0 = Math.min(y0, p.y);
      x1 = Math.max(x1, p.x);
      y1 = Math.max(y1, p.y);
    }
  const w = Math.max(x1 - x0, 1),
    h = Math.max(y1 - y0, 1),
    m = Math.max(w, h);
  // aspect' = aspect^(1-STRETCH); the longer side is always 100.
  const ratio = (Math.min(w, h) / m) ** (1 - STRETCH);
  const tw = w >= h ? 100 : 100 * ratio,
    th = w >= h ? 100 * ratio : 100;
  const sx = tw / w,
    sy = th / h,
    ox = (BOX - tw) / 2,
    oy = (BOX - th) / 2;
  return strokes.map((s) => s.map((p) => ({ x: ox + (p.x - x0) * sx, y: oy + (p.y - y0) * sy })));
}

/** Template features for every kanji: `paths` maps a kanji to its KanjiVG path strings. */
export function buildIndex(paths: Record<string, string[]>): KanjiIndex {
  const idx: KanjiIndex = new Map();
  for (const [c, ds] of Object.entries(paths)) {
    const strokes = ds.map((d) => flattenPath(d)).filter((p) => p.length > 0);
    if (strokes.length) idx.set(c, normalize(strokes.map((s) => resample(s))));
  }
  return idx;
}

// ---------- matching ----------
const dist = (a: Pt[], b: Pt[]) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.hypot(a[i].x - b[i].x, a[i].y - b[i].y);
  return s / a.length;
};

/** Min-cost assignment on a square matrix (Hungarian algorithm, O(n^3)). Returns the total cost. */
function assign(c: number[][]): number {
  const n = c.length,
    u = new Array(n + 1).fill(0),
    v = new Array(n + 1).fill(0),
    p = new Array(n + 1).fill(0),
    way = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array(n + 1).fill(Infinity),
      used = new Array(n + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let d = Infinity,
        j1 = 0;
      for (let j = 1; j <= n; j++)
        if (!used[j]) {
          const cur = c[i0 - 1][j - 1] - u[i0] - v[j];
          if (cur < minv[j]) {
            minv[j] = cur;
            way[j] = j0;
          }
          if (minv[j] < d) {
            d = minv[j];
            j1 = j;
          }
        }
      for (let j = 0; j <= n; j++)
        if (used[j]) {
          u[p[j]] += d;
          v[j] -= d;
        } else minv[j] -= d;
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0);
  }
  let total = 0;
  for (let j = 1; j <= n; j++) total += c[p[j] - 1][j - 1];
  return total;
}

/** Score of user strokes against one template (lower = closer). */
function score(user: Pt[][], tpl: Pt[][]): number {
  const n = user.length,
    m = tpl.length,
    k = Math.max(n, m);
  if (Math.abs(n - m) > Math.max(1, Math.round(m * 0.2))) return Infinity;
  const cost = Array.from({ length: k }, (_, i) =>
    Array.from({ length: k }, (_, j) => (i < n && j < m ? dist(user[i], tpl[j]) : UNMATCHED)),
  );
  let inOrder = 0;
  for (let i = 0; i < k; i++) inOrder += cost[i][i];
  const best = Math.min(inOrder, assign(cost) * ORDER_PENALTY);
  return best / k;
}

/** Up to `limit` closest kanji, best first. Empty when nothing is close enough. */
export function recognize(strokes: Pt[][], index: KanjiIndex, limit = 12): Match[] {
  const pts = strokes.filter((s) => s.length > 0);
  if (!pts.length) return [];
  const user = normalize(pts.map((s) => resample(s)));
  const all: { char: string; score: number }[] = [];
  for (const [char, tpl] of index) {
    const s = score(user, tpl);
    if (s < Infinity) all.push({ char, score: s });
  }
  all.sort((a, b) => a.score - b.score);
  // Relative confidence: how good the score is on the absolute scale (0 at MAX_SCORE).
  return all
    .filter((r) => r.score <= MAX_SCORE)
    .slice(0, limit)
    .map((r) => ({ ...r, confidence: Math.round(100 * (1 - r.score / MAX_SCORE)) }));
}
