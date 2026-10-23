import { d3, L, div, h, plot, COLOR } from "./_lib.js";
import { randomNet, forward } from "./linear-collapse.js";
import { linspace, fmt } from "../math.js";

const DEPTHS = [1, 2, 3, 4], WIDTHS = [2, 4, 8, 16], SEEDS = 6;
const relu = z => Math.max(0, z);
const params = (d, w) => 2 * w + (d - 1) * (w * w + w) + w + 1;

export default function mount(el) {
  const xs = linspace(-3, 3, 1500);
  const pieces = net => {
    let n = 1, prev = null;
    for (const x of xs) { const { pattern } = forward(net, x, relu); if (prev !== null && pattern !== prev) n++; prev = pattern; }
    return n;
  };
  const stats = DEPTHS.map(d => WIDTHS.map(w => {
    const counts = d3.range(SEEDS).map(s => pieces(randomNet(100 + s, d, w, 1.6)));
    return { d, w, mean: d3.mean(counts), max: d3.max(counts), p: params(d, w) };
  }));
  let sel = stats[1][1];

  div(el, "", `<p style="margin:0 0 .4rem">${L(`Random ReLU networks with 1 input. Each cell: average (and best) number of linear pieces on [−3, 3] over ${SEEDS} random draws, plus the parameter count. Click a cell to plot one of them.`,
    `入力1つのランダムな ReLU ネットワーク。各マスは、[−3, 3] での線分の数の平均（と最大）を${SEEDS}回のランダムな引き直しで求めたものと、パラメータ数です。マスをクリックすると、そのうちの1つをプロットします。`)}</p>`);
  const table = h("table", { class: "w-table" });
  el.append(table);
  const maxMean = d3.max(stats.flat(), s => s.mean);
  const color = d3.scaleSequential(d3.interpolateBlues).domain([0, maxMean * 1.3]);
  const P = plot(el, { height: 220, x: [-3, 3], y: [-1, 1], xLabel: "x", yLabel: "f(x)" });
  const path = P.g.append("path").style("fill", "none").style("stroke", COLOR.q).style("stroke-width", 2.5);
  const readout = div(el, "readout");

  function draw() {
    table.innerHTML = `<tr><th>${L("depth ↓ / width →", "深さ ↓ / 幅 →")}</th>${WIDTHS.map(w => `<th>${w}</th>`).join("")}</tr>` +
      stats.map(row => `<tr><th>${row[0].d}</th>${row.map(s => `<td data-d="${s.d}" data-w="${s.w}" style="cursor:pointer;background:${color(s.mean)};${s === sel ? "outline:3px solid var(--q);" : ""}color:${s.mean > maxMean * 0.6 ? "#fff" : "inherit"}"><b>${fmt(s.mean, 1)}</b> (${s.max})<br><small>${s.p} ${L("params", "パラメータ")}</small></td>`).join("")}</tr>`).join("");
    table.querySelectorAll("td").forEach(td => td.addEventListener("click", () => {
      sel = stats[DEPTHS.indexOf(+td.dataset.d)][WIDTHS.indexOf(+td.dataset.w)];
      draw();
    }));
    const net = randomNet(100, sel.d, sel.w, 1.6);
    const ys = xs.map(x => forward(net, x, relu).y);
    const lo = d3.min(ys), hi = d3.max(ys), pad = Math.max(0.1, (hi - lo) * 0.1);
    P.y.domain([lo - pad, hi + pad]);
    P.drawAxes();
    path.attr("d", d3.line().x((_, i) => P.x(xs[i])).y(v => P.y(v))(ys));
    readout.innerHTML = L(
      `Selected: depth ${sel.d}, width ${sel.w}, ${sel.p} parameters. A single hidden layer of width w can make at most w + 1 pieces in 1-D. Compare cells with similar parameter counts: depth buys more pieces per parameter, though random weights rarely reach the maximum.`,
      `選択中：深さ ${sel.d}、幅 ${sel.w}、パラメータ ${sel.p} 個。1次元では、幅 w の隠れ層1つで作れる線分は最大 w + 1 本です。パラメータ数が近いマスどうしを比べてみましょう。深さは、パラメータあたりの線分の数を増やします。ただし、ランダムな重みで最大値に届くことはめったにありません。`);
  }
  draw();
}
