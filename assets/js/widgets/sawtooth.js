import { d3, L, div, slider, plot, COLOR, tex } from "./_lib.js";
import { linspace, relu } from "../math.js";

// Tent map built from 2 ReLUs: t(x) = 2·ReLU(x) − 4·ReLU(x − ½) on [0, 1].
const tent = x => 2 * relu(x) - 4 * relu(x - 0.5);

export default function mount(el) {
  const ctl = div(el, "controls");
  const ls = slider(ctl, { label: L("layers L", "層の数 L"), min: 1, max: 7, step: 1, value: 3, format: v => v, onInput: draw });

  const row = div(el, "row");
  const one = plot(div(row, ""), { width: 260, height: 240, x: [0, 1], y: [0, 1.05], xLabel: "x", yLabel: "t(x)", xTicks: 2, yTicks: 2 });
  one.g.append("path").attr("d", d3.line().x(x => one.x(x)).y(x => one.y(tent(x)))(linspace(0, 1, 101)))
    .style("fill", "none").style("stroke", COLOR.accent).style("stroke-width", 3);
  const P = plot(div(row, ""), { width: 440, height: 240, x: [0, 1], y: [0, 1.05], xLabel: "x", yLabel: "t∘⋯∘t (x)", xTicks: 4, yTicks: 2 });
  const path = P.g.append("path").style("fill", "none").style("stroke", COLOR.q).style("stroke-width", 2);
  const readout = div(el, "readout");
  const xs = linspace(0, 1, 2049);

  function draw() {
    const Lc = ls.value;
    path.attr("d", d3.line().x(x => P.x(x)).y(x => { let v = x; for (let i = 0; i < Lc; i++) v = tent(v); return P.y(v); })(xs));
    const pieces = 2 ** Lc;
    readout.innerHTML = tex(`\\underbrace{t\\circ t\\circ\\cdots\\circ t}_{L=${Lc}}`) + "&emsp;" +
      L(`<b>${pieces}</b> linear pieces from just <b>${2 * Lc}</b> ReLU units (2 per layer). A single hidden layer adds at most one bend per unit, so it would need at least <b>${pieces - 1}</b> units to draw the same thing. Every extra layer doubles the pieces, while width only adds.`,
        `ReLU ユニットたった <b>${2 * Lc}</b> 個（1層あたり2個）で <b>${pieces}</b> 本の線分ができます。隠れ層1つではユニット1個につき曲がりを最大1つしか加えられないので、同じものを描くには少なくとも <b>${pieces - 1}</b> 個のユニットが必要です。層を1つ足すと線分は倍になりますが、幅は足し算でしか効きません。`);
  }
  draw();
}
