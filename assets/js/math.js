export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randn(r) {
  let u = 0;
  while (u === 0) u = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
}

export const sigmoid = z => 1 / (1 + Math.exp(-z));
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const linspace = (a, b, n) => Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));
export const sum = xs => xs.reduce((a, b) => a + b, 0);
export const log2 = Math.log2;

export function erf(x) {
  // Abramowitz & Stegun 7.1.26, |error| < 1.5e-7
  const s = Math.sign(x);
  x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
}

export const normPdf = (y, mu = 0, s = 1) => Math.exp(-0.5 * ((y - mu) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));
export const normCdf = (y, mu = 0, s = 1) => 0.5 * (1 + erf((y - mu) / (s * Math.SQRT2)));

export const entropy = p => -sum(p.map(v => (v > 0 ? v * log2(v) : 0)));
export const crossEntropy = (p, q) => -sum(p.map((v, i) => (v > 0 ? v * log2(q[i]) : 0)));
export const kl = (p, q) => crossEntropy(p, q) - entropy(p);
export const bernoulliKL = (p, q) => kl([p, 1 - p], [q, 1 - q]);

export const fmt = (v, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : "∞");

export function solve(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    const piv = M[c][c] || 1e-12;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / piv;
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[n] / (row[i] || 1e-12));
}

// Ridge-regularized least squares: argmin ||Xw − y||² + λ||w||²
export function lstsq(X, y, lambda = 1e-8) {
  const d = X[0].length;
  const A = Array.from({ length: d }, (_, i) => Array.from({ length: d }, (_, j) => sum(X.map(r => r[i] * r[j])) + (i === j ? lambda : 0)));
  const b = Array.from({ length: d }, (_, i) => sum(X.map((r, k) => r[i] * y[k])));
  return solve(A, b);
}

export const relu = z => Math.max(0, z);
