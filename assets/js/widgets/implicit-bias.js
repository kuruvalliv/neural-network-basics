import { d3, L, div, button, plot, legend, COLOR, piFormat } from "./_lib.js";
import { REG } from "../running-example.js";
import { linspace, solve, rng, randn, fmt } from "../math.js";

const K = 15;
// High frequencies are scaled down, so a small weight norm means a smooth function.
const feats = x => d3.range(K).flatMap(k => [Math.cos(k * x) / (k + 1), Math.sin((k + 1) * x) / (k + 1)]);

export default function mount(el) {
  const pts = REG.data.filter((_, i) => i % 5 === 0);
  const X = pts.map(p => feats(p.x)), y = pts.map(p => p.y);
  const XXt = X.map(a => X.map(b => d3.sum(a, (v, i) => v * b[i])));
  const rowSpace = v => { const a = solve(XXt, X.map(r => d3.sum(r, (u, i) => u * v[i]))); return v.map((_, j) => d3.sum(a, (ai, i) => ai * X[i][j])); };
  const alpha = solve(XXt, y);
  const wMin = X[0].map((_, j) => d3.sum(alpha, (a, i) => a * X[i][j]));
  let seed = 1, wOther = null;

  const ctl = div(el, "controls");
  button(ctl, L("Show another perfect fit", "別の完璧な当てはめを見る"), () => {
    const r = rng(seed++);
    const z = wMin.map(() => 1.5 * randn(r));
    const proj = rowSpace(z);
    wOther = wMin.map((w, j) => w + z[j] - proj[j]);
    draw();
  });

  const P = plot(el, { height: 300, x: [0, 2 * Math.PI], y: [-3, 3], xLabel: "x", yLabel: "y", xFormat: piFormat });
  const grid = linspace(0, 2 * Math.PI, 300);
  P.g.append("path").attr("d", d3.line().x(x => P.x(x)).y(x => P.y(Math.sin(x)))(grid)).style("fill", "none").style("stroke", COLOR.p).style("stroke-dasharray", "5 4");
  const other = P.g.append("path").style("fill", "none").style("stroke", COLOR.loss).style("stroke-width", 2);
  const minp = P.g.append("path").style("fill", "none").style("stroke", COLOR.q).style("stroke-width", 3);
  P.g.selectAll("circle").data(pts).join("circle").attr("cx", p => P.x(p.x)).attr("cy", p => P.y(p.y)).attr("r", 6).style("fill", COLOR.ink);
  legend(el, [[COLOR.q, L("where gradient descent from 0 ends up (minimum norm)", "0 から出発した勾配降下法の行き着く先（最小ノルム）")], [COLOR.loss, L("another solution with zero training error", "訓練誤差0の別の解")], [COLOR.p, L("truth", "真実"), true]]);
  const readout = div(el, "readout");

  const f = (w, x) => d3.sum(feats(x), (v, i) => v * w[i]);
  const norm = w => Math.hypot(...w);
  const err = w => d3.mean(grid, x => (f(w, x) - Math.sin(x)) ** 2);

  function draw() {
    const clip = v => Math.max(-3, Math.min(3, v));
    minp.attr("d", d3.line().x(x => P.x(x)).y(x => P.y(clip(f(wMin, x))))(grid));
    other.attr("d", wOther ? d3.line().x(x => P.x(x)).y(x => P.y(clip(f(wOther, x))))(grid) : null);
    readout.innerHTML = L(
      `${pts.length} data points, ${2 * K} parameters, so infinitely many functions pass through every point exactly. Minimum-norm fit: weight size ${fmt(norm(wMin))}, error vs truth ${fmt(err(wMin), 3)}.${wOther ? ` Red fit: weight size ${fmt(norm(wOther))}, error vs truth ${fmt(err(wOther), 3)}.` : ""} Training loss cannot tell them apart, but the optimizer can. Gradient descent started at zero never moves in directions the data can't see, so it lands on the smallest-norm, smoothest solution. That preference is an <b>implicit bias</b>.`,
      `データ点は${pts.length}個、パラメータは${2 * K}個なので、すべての点をぴったり通る関数は無数にあります。最小ノルムの当てはめ：重みの大きさ ${fmt(norm(wMin))}、真実に対する誤差 ${fmt(err(wMin), 3)}。${wOther ? `赤の当てはめ：重みの大きさ ${fmt(norm(wOther))}、真実に対する誤差 ${fmt(err(wOther), 3)}。` : ""}訓練損失ではこれらを区別できませんが、最適化手法なら区別できます。0 から出発した勾配降下法は、データから見えない方向には決して動かないので、ノルムが最小で最も滑らかな解に着地します。この好みが<b>暗黙のバイアス</b>です。`);
  }
  draw();
}
