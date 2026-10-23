import { rng, randn, sigmoid } from "./math.js";

// Regression: y = sin(x) + ε, ε ~ N(0, 0.3²), x ∈ [0, 2π]
export const REG = (() => {
  const r = rng(7);
  const sigma = 0.3;
  const xmax = 2 * Math.PI;
  const data = Array.from({ length: 40 }, () => {
    const x = r() * xmax;
    return { x, y: Math.sin(x) + sigma * randn(r) };
  });
  return { f: Math.sin, sigma, xmin: 0, xmax, data };
})();

// Classification: humidity h ∈ [0, 1] → rain (1) / no rain (0)
export const CLS = (() => {
  const w = 12, b = -7.2;
  const pRain = h => sigmoid(w * h + b);
  const sample = (n, seed) => {
    const rr = rng(seed);
    return Array.from({ length: n }, () => {
      const x = rr();
      return { x, y: rr() < pRain(x) ? 1 : 0 };
    });
  };
  const data = sample(60, 11);
  return { w, b, pRain, data, sample };
})();
