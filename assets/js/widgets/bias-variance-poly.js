import { d3, L, div, slider, plot, legend, COLOR, piFormat } from "./_lib.js";
import { REG } from "../running-example.js";
import { linspace, fmt, lstsq, rng, randn } from "../math.js";

const MAXD = 15;
const toT = x => x / Math.PI - 1;
const cheb = (t, d) => { const T = [1, t]; for (let k = 2; k <= d; k++) T.push(2 * t * T[k - 1] - T[k - 2]); return T.slice(0, d + 1); };

export default function mount(el) {
  const r = rng(77);
  const test = Array.from({ length: 300 }, () => { const x = r() * 2 * Math.PI; return { x, y: Math.sin(x) + REG.sigma * randn(r) }; });
  const fits = d3.range(MAXD + 1).map(d => lstsq(REG.data.map(p => cheb(toT(p.x), d)), REG.data.map(p => p.y), 1e-9));
  const pred = (d, x) => cheb(toT(x), d).reduce((s, v, i) => s + v * fits[d][i], 0);
  const mse = (d, set) => d3.mean(set, p => (pred(d, p.x) - p.y) ** 2);
  const trainE = fits.map((_, d) => mse(d, REG.data)), testE = fits.map((_, d) => mse(d, test));

  const ctl = div(el, "controls");
  const ds = slider(ctl, { label: L("polynomial degree", "多項式の次数"), min: 0, max: MAXD, step: 1, value: 1, format: v => v, onInput: draw });

  const row = div(el, "row");
  const F = plot(div(row, ""), { width: 380, height: 280, x: [0, 2 * Math.PI], y: [-2, 2], xLabel: "x", yLabel: "y", xFormat: piFormat });
  F.g.selectAll("circle").data(REG.data).join("circle").attr("cx", d => F.x(d.x)).attr("cy", d => F.y(d.y)).attr("r", 3.5).style("fill", COLOR.data);
  const grid = linspace(0, 2 * Math.PI, 300);
  F.g.append("path").attr("d", d3.line().x(x => F.x(x)).y(x => F.y(Math.sin(x)))(grid)).style("fill", "none").style("stroke", COLOR.p).style("stroke-dasharray", "5 4");
  const fitPath = F.g.append("path").style("fill", "none").style("stroke", COLOR.q).style("stroke-width", 2.5);

  const E = plot(div(row, ""), { width: 320, height: 280, x: [0, MAXD], y: [0, 0.6], xLabel: "degree", yLabel: "MSE", xTicks: 5, yTicks: 4 });
  const ln = (arr, c, dash) => E.g.append("path").attr("d", d3.line().x((_, i) => E.x(i)).y(v => E.y(Math.min(0.6, v)))(arr))
    .style("fill", "none").style("stroke", c).style("stroke-width", 2.5).style("stroke-dasharray", dash);
  ln(trainE, COLOR.data);
  ln(testE, COLOR.loss);
  E.g.append("line").attr("x1", 0).attr("x2", E.W).attr("y1", E.y(REG.sigma ** 2)).attr("y2", E.y(REG.sigma ** 2)).style("stroke", COLOR.p).style("stroke-dasharray", "3 3");
  const vline = E.g.append("line").style("stroke", COLOR.q).style("stroke-width", 2);
  legend(el, [[COLOR.data, L("training error", "訓練誤差")], [COLOR.loss, L("test error (new data)", "テスト誤差（新しいデータ）")], [COLOR.p, L("noise floor σ² = 0.09", "ノイズの床 σ² = 0.09"), true]]);
  const readout = div(el, "readout");

  function draw() {
    const d = ds.value;
    fitPath.attr("d", d3.line().x(x => F.x(x)).y(x => F.y(Math.max(-2, Math.min(2, pred(d, x)))))(grid));
    vline.attr("x1", E.x(d)).attr("x2", E.x(d)).attr("y1", 0).attr("y2", E.H);
    const best = d3.minIndex(testE);
    readout.innerHTML = L(
      `Degree ${d}: training ${fmt(trainE[d], 3)}, test ${fmt(testE[d], 3)}. ${d < 3 ? "<b>Too simple</b>: the family cannot bend like sin x, so both errors are high (approximation error)." : d > 9 ? "<b>Too flexible</b>: training error keeps falling, but the curve now fits the noise, and test error rises (estimation error)." : "A good balance."} The best test error is at degree ${best}.`,
      `次数 ${d}：訓練 ${fmt(trainE[d], 3)}、テスト ${fmt(testE[d], 3)}。${d < 3 ? "<b>単純すぎます</b>。この関数族は sin x のように曲がれないので、どちらの誤差も大きくなります（近似誤差）。" : d > 9 ? "<b>柔軟すぎます</b>。訓練誤差は下がり続けますが、曲線がノイズまで当てはめてしまい、テスト誤差が上がります（推定誤差）。" : "ちょうどよいバランスです。"}テスト誤差が最小になるのは次数 ${best} です。`);
  }
  draw();
}
