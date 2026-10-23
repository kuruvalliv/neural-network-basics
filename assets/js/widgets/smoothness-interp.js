import { d3, L, div, slider, plot, legend, COLOR, piFormat } from "./_lib.js";
import { REG } from "../running-example.js";
import { linspace, fmt } from "../math.js";

export default function mount(el) {
  const grid = linspace(0, 2 * Math.PI, 160);
  const smooth = (bw, x) => {
    let num = 0, den = 0;
    for (const d of REG.data) { const w = Math.exp(-0.5 * ((x - d.x) / bw) ** 2); num += w * d.y; den += w; }
    return den > 1e-300 ? num / den : 0;
  };
  const truthErr = bw => d3.mean(grid, x => (smooth(bw, x) - Math.sin(x)) ** 2);
  const bws = linspace(Math.log10(0.03), Math.log10(3), 40).map(v => 10 ** v);
  const errs = bws.map(truthErr);

  const ctl = div(el, "controls");
  const bs = slider(ctl, { label: L("smoothing width", "滑らかさの幅"), min: Math.log10(0.03), max: Math.log10(3), step: 0.01, value: Math.log10(0.05), format: v => fmt(10 ** v), onInput: draw });

  const row = div(el, "row");
  const mainBox = div(row, "");
  mainBox.style.flex = "2 1 340px";
  const M = plot(mainBox, { width: 440, height: 300, x: [0, 2 * Math.PI], y: [-2, 2], xLabel: "x", yLabel: "y", xFormat: piFormat });
  M.g.selectAll("circle").data(REG.data).join("circle").attr("cx", d => M.x(d.x)).attr("cy", d => M.y(d.y)).attr("r", 3.5).style("fill", COLOR.data);
  M.g.append("path").attr("d", d3.line().x(x => M.x(x)).y(x => M.y(Math.sin(x)))(grid))
    .style("fill", "none").style("stroke", COLOR.p).style("stroke-dasharray", "5 4");
  const fit = M.g.append("path").style("fill", "none").style("stroke", COLOR.q).style("stroke-width", 2.5);
  legend(mainBox, [[COLOR.p, L("true mean sin x", "真の平均 sin x"), true], [COLOR.q, L("smoothed estimate", "平滑化した推定")]]);

  const E = plot(div(row, ""), { width: 260, height: 300, x: [0.03, 3], xLog: true, y: [0, d3.max(errs) * 1.05], xLabel: "width", yLabel: "error vs truth", xTicks: 3, yTicks: 4 });
  E.g.append("path").attr("d", d3.line().x((_, i) => E.x(bws[i])).y(v => E.y(v))(errs))
    .style("fill", "none").style("stroke", COLOR.loss).style("stroke-width", 2.5);
  const dot = E.g.append("circle").attr("r", 6).style("fill", COLOR.q);
  const readout = div(el, "readout");

  function draw() {
    const bw = 10 ** bs.value;
    fit.attr("d", d3.line().x(x => M.x(x)).y(x => M.y(Math.max(-2, Math.min(2, smooth(bw, x)))))(grid));
    const e = truthErr(bw);
    dot.attr("cx", E.x(bw)).attr("cy", E.y(e));
    const best = bws[d3.minIndex(errs)];
    readout.innerHTML = L(
      `Each estimate is a weighted average of nearby points, and the width decides what “nearby” means. ${bw < 0.12 ? "Too narrow: the curve chases every noisy point." : bw > 1.2 ? "Too wide: the curve flattens away the real wiggle." : "Here the curve follows the signal and ignores the noise."} The best width is ≈ ${fmt(best)}.`,
      `各推定値は近くの点の重み付き平均で、幅が「近く」の意味を決めます。${bw < 0.12 ? "狭すぎます。曲線がノイズの点を一つひとつ追いかけています。" : bw > 1.2 ? "広すぎます。本物のうねりまで平らにならしています。" : "ここでは曲線が信号に沿い、ノイズを無視しています。"}最適な幅は ≈ ${fmt(best)} です。`);
  }
  draw();
}
