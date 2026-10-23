import { d3, COLOR } from "./_lib.js";
import { CLS } from "../running-example.js";
import { sigmoid } from "../math.js";

const rainNll = (w, b) => d3.mean(CLS.data, d => {
  const q = Math.min(Math.max(sigmoid(w * d.x + b), 1e-9), 1 - 1e-9);
  return -Math.log2(d.y ? q : 1 - q);
});

export const SURFACES = {
  bowl: { f: (x, y) => x * x + 3 * y * y, dom: [[-2, 2], [-2, 2]], lr: 0.08 },
  ravine: { f: (x, y) => 0.5 * (x + y) ** 2 + 12 * (x - y) ** 2 / 2, dom: [[-2, 2], [-2, 2]], lr: 0.04 },
  twin: { f: (x, y) => (x * x - 1) ** 2 + y * y, dom: [[-2, 2], [-2, 2]], lr: 0.05 },
  plateau: { f: (x, y) => 1 - Math.exp(-((x - 0.8) ** 2 + (y - 0.8) ** 2) / 0.4), dom: [[-2, 2], [-2, 2]], lr: 0.3 },
  golf: { f: (x, y) => 0.12 * ((x + 0.9) ** 2 + (y + 0.6) ** 2) - 1.0 * Math.exp(-((x - 1.2) ** 2 + (y - 1.1) ** 2) / 0.03), dom: [[-2, 2], [-2, 2]], lr: 0.05 },
  rosen: { f: (x, y) => (1 - x) ** 2 + 8 * (y - x * x) ** 2, dom: [[-2, 2], [-1, 3]], lr: 0.01 },
  rain: { f: rainNll, dom: [[-5, 25], [-15, 5]], lr: 6 },
};

export function grad(f, x, y, h = 1e-4) {
  return [(f(x + h, y) - f(x - h, y)) / (2 * h), (f(x, y + h) - f(x, y - h)) / (2 * h)];
}

export function drawContours(P, f, dom, n = 70) {
  const [[x0, x1], [y0, y1]] = dom;
  const vals = new Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) vals[j * n + i] = f(x0 + ((x1 - x0) * i) / (n - 1), y1 - ((y1 - y0) * j) / (n - 1));
  const lo = d3.min(vals), hi = d3.quantile([...vals].sort((a, b) => a - b), 0.95);
  const thresholds = d3.range(18).map(k => lo + (hi - lo) * (k / 17) ** 1.6);
  const contours = d3.contours().size([n, n]).thresholds(thresholds)(vals);
  const color = d3.scaleSequential(d3.interpolateViridis).domain([hi, lo]);
  const proj = d3.geoTransform({
    point(px, py) { this.stream.point(P.x(x0 + ((x1 - x0) * px) / (n - 1)), P.y(y1 - ((y1 - y0) * py) / (n - 1))); },
  });
  const g = P.g.append("g").attr("class", "contours");
  g.selectAll("path").data(contours).join("path").attr("d", d3.geoPath(proj))
    .style("fill", d => color(d.value)).style("stroke", COLOR.panel || "rgba(255,255,255,.35)").style("stroke-width", 0.5).style("opacity", 0.85);
  return { g, lo };
}
