import { d3, L, div, slider, button, plot, COLOR, piFormat } from "./_lib.js";
import { REG } from "../running-example.js";
import { linspace, fmt, clamp } from "../math.js";
import { bump, fitBumps, predict } from "./rbf-fixed.js";

export default function mount(el) {
  const even = () => linspace(0.6, 2 * Math.PI - 0.6, 3);
  let centers = even();
  const ctl = div(el, "controls");
  const ws = slider(ctl, { label: L("bump width", "こぶの幅"), min: 0.2, max: 1.5, step: 0.01, value: 0.45, onInput: draw });
  button(ctl, L("Back to evenly spaced", "等間隔に戻す"), () => { centers = even(); draw(); });
  div(ctl, "", `<span style="color:var(--muted)">${L("Drag the ◆ handles to move each bump.", "◆ をドラッグすると、こぶを動かせます。")}</span>`);

  const P = plot(el, { height: 340, x: [0, 2 * Math.PI], y: [-2.2, 2], xLabel: "x", yLabel: "y", xFormat: piFormat });
  P.g.selectAll("circle").data(REG.data).join("circle").attr("cx", d => P.x(d.x)).attr("cy", d => P.y(d.y)).attr("r", 3.5).style("fill", COLOR.data);
  const grid = linspace(0, 2 * Math.PI, 200);
  P.g.append("path").attr("d", d3.line().x(x => P.x(x)).y(x => P.y(Math.sin(x)))(grid))
    .style("fill", "none").style("stroke", COLOR.p).style("stroke-dasharray", "5 4");
  const ghost = P.g.append("path").style("fill", "none").style("stroke", COLOR.muted).style("stroke-width", 2).style("stroke-dasharray", "2 3");
  const parts = P.g.append("g");
  const total = P.g.append("path").style("fill", "none").style("stroke", COLOR.q).style("stroke-width", 3);
  const handles = P.g.append("g");
  const readout = div(el, "readout");

  const drag = d3.drag().on("drag", (ev, d) => { centers[d.i] = clamp(P.x.invert(ev.x), 0, 2 * Math.PI); draw(); });
  const mse = (wts, cs, w) => d3.mean(REG.data, d => (predict(wts, cs, w, d.x) - d.y) ** 2);

  function draw() {
    const w = ws.value, clip = v => Math.max(-2.2, Math.min(2, v));
    const wts = fitBumps(centers, w);
    const ev = even(), evW = fitBumps(ev, w);
    ghost.attr("d", d3.line().x(x => P.x(x)).y(x => P.y(clip(predict(evW, ev, w, x))))(grid));
    parts.selectAll("path").data(centers).join("path")
      .attr("d", (c, i) => d3.line().x(x => P.x(x)).y(x => P.y(clip(wts[i + 1] * bump(x, c, w))))(grid))
      .style("fill", "none").style("stroke", COLOR.accent).style("opacity", 0.45);
    total.attr("d", d3.line().x(x => P.x(x)).y(x => P.y(clip(predict(wts, centers, w, x))))(grid));
    handles.selectAll("path").data(centers.map((c, i) => ({ c, i }))).join("path").attr("class", "handle")
      .attr("d", d3.symbol(d3.symbolDiamond, 180)).attr("transform", d => `translate(${P.x(d.c)},${P.y(-2.05)})`)
      .style("fill", COLOR.accent).style("stroke", "var(--panel)").call(drag);
    const mine = mse(wts, centers, w), fixed = mse(evW, ev, w);
    readout.innerHTML = L(
      `Three bumps only. Training error, evenly spaced (dotted grey): <b>${fmt(fixed, 3)}</b>. Yours (orange): <b>${fmt(mine, 3)}</b>. ${mine < fixed - 0.005 ? "You beat the fixed layout by <em>learning the features</em>." : "Try putting the bumps where the curve has its peaks and troughs."}`,
      `こぶは3つだけです。等間隔に置いた場合（灰色の点線）の訓練誤差：<b>${fmt(fixed, 3)}</b>。あなたの配置（オレンジ）：<b>${fmt(mine, 3)}</b>。${mine < fixed - 0.005 ? "<em>特徴を学習する</em>ことで、固定の配置に勝ちました。" : "曲線の山と谷のあたりにこぶを置いてみましょう。"}`);
  }
  draw();
}
