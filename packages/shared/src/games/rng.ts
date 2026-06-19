// ─────────────────────────────────────────────────────────────
// Deterministic, seedable RNG so dice / shuffle games stay pure and
// replayable. The seed is threaded through game state; every draw both
// returns a value and the advanced seed, so the same seed + move log
// reproduces a match exactly. (mulberry32 — small, fast, good enough.)
// ─────────────────────────────────────────────────────────────

/** One step of the generator: returns a float in [0, 1) and the next seed. */
export function nextRng(seed: number): { value: number; seed: number } {
  let a = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, seed: a >>> 0 };
}

/** Roll an n-sided die (default 6). */
export function rollDie(seed: number, sides = 6): { roll: number; seed: number } {
  const { value, seed: next } = nextRng(seed);
  return { roll: 1 + Math.floor(value * sides), seed: next };
}

/** Inclusive random integer in [min, max]. */
export function randomInt(seed: number, min: number, max: number): { value: number; seed: number } {
  const { value, seed: next } = nextRng(seed);
  return { value: min + Math.floor(value * (max - min + 1)), seed: next };
}

/** Fisher–Yates shuffle returning a new array + the advanced seed. */
export function shuffle<T>(arr: readonly T[], seed: number): { result: T[]; seed: number } {
  const a = arr.slice();
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    const r = nextRng(s);
    s = r.seed;
    const j = Math.floor(r.value * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return { result: a, seed: s };
}

/** A fixed fallback seed when none is supplied (keeps engines deterministic). */
export const DEFAULT_SEED = 0x9e3779b9;

export function seedFromOptions(options?: Record<string, unknown>): number {
  const s = options?.seed;
  return typeof s === 'number' && Number.isFinite(s) ? s >>> 0 : DEFAULT_SEED;
}
