import { d3, L, div, slider, plot, legend, COLOR, piFormat } from "./_lib.js";
import { REG } from "../running-example.js";
import { linspace, fmt, lstsq } from "../math.js";

export const bump = (x, c, w) => Math.exp(-0.5 * ((x - c) / w) ** 2);

export function fitBumps(centers, width) {
  const X = REG.data.map(d => [1, ...centers.map(c => bump(d.x, c, width))]);
  return lstsq(X, REG.data.map(d => d.y), 1e-3);
}

export const predict = (wts, centers, width, x) => wts[0] + centers.reduce((s, c, i) => s + wts[i + 1] * bump(x, c, width), 0);

export default function mount(el) {
  const ctl = div(el, "controls");
  const ks = slider(ctl, { label: L("bumps K", "こぶの数 K"), min: 1, max: 15, step: 1, value: 4, format: v => v, onInput: draw });
  const ws = slider(ctl, { label: L("bump width", "こぶの幅"), min: 0.1, max: 2, step: 0.01, value: 0.3, onInput: draw });

  const P = plot(el, { height: 320, x: [0, 2 * Math.PI], y: [-2, 2], xLabel: "x", yLabel: "y", xFormat: piFormat });
  P.g.selectAll("circle").data(REG.data).join("circle").attr("cx", d => P.x(d.x)).attr("cy", d => P.y(d.y)).attr("r", 3.5).style("fill", COLOR.data);
  const grid = linspace(0, 2 * Math.PI, 200);
  P.g.append("path").attr("d", d3.line().x(x => P.x(x)).y(x => P.y(Math.sin(x)))(grid))
    .style("fill", "none").style("stroke", COLOR.p).style("stroke-dasharray", "5 4");
  const parts = P.g.append("g");
  const total = P.g.append("path").style("fill", "none").style("stroke", COLOR.q).style("stroke-width", 3);
  legend(el, [[COLOR.accent, L("each weighted bump wₖφₖ(x)", "重み付きのこぶ wₖφₖ(x)")], [COLOR.q, L("their sum f(x)", "その和 f(x)")], [COLOR.p, L("true mean", "真の平均"), true]]);
  const readout = div(el, "readout");

  function draw() {
    const K = ks.value, w = ws.value;
    const centers = K === 1 ? [Math.PI] : linspace(0.3, 2 * Math.PI - 0.3, K);
    const wts = fitBumps(centers, w);
    const clip = v => Math.max(-2, Math.min(2, v));
    parts.selectAll("path").data(centers).join("path")
      .attr("d", (c, i) => d3.line().x(x => P.x(x)).y(x => P.y(clip(wts[i + 1] * bump(x, c, w))))(grid))
      .style("fill", "none").style("stroke", COLOR.accent).style("opacity", 0.45);
    total.attr("d", d3.line().x(x => P.x(x)).y(x => P.y(clip(predict(wts, centers, w, x))))(grid));
    const err = d3.mean(grid, x => (predict(wts, centers, w, x) - Math.sin(x)) ** 2);
    readout.innerHTML = L(
      `The bump positions are fixed in advance, and only their heights wₖ are fitted (by least squares). Error against the true mean: <b>${fmt(err, 3)}</b>. ${w < 0.25 && K < 10 ? "The bumps are too narrow to cover the gaps between centres, so the sum dips back to the baseline." : ""}`,
      `こぶの位置はあらかじめ固定で、当てはめるのは高さ wₖ だけです（最小二乗法）。真の平均に対する誤差：<b>${fmt(err, 3)}</b>。${w < 0.25 && K < 10 ? "こぶが細すぎて中心の間のすきまを覆えず、和が基準線まで落ち込んでいます。" : ""}`);
  }
  draw();
}
