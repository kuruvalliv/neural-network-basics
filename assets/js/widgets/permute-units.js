import { d3, L, div, button, plot, COLOR, tex } from "./_lib.js";
import { linspace, fmt } from "../math.js";

const UNIT_COLORS = ["#2b6cb0", "#dd6b20", "#2f855a"];

export default function mount(el) {
  let units = [
    { w: 1.6, b: 0.4, v: 1.0, id: 0 },
    { w: -2.2, b: 1.2, v: 0.8, id: 1 },
    { w: 0.9, b: -1.0, v: -1.3, id: 2 },
  ];
  const c = 0.1;
  const f = (us, x) => c + us.reduce((s, u) => s + u.v * Math.tanh(u.w * x + u.b), 0);
  const original = units.map(u => ({ ...u }));

  const ctl = div(el, "controls");
  button(ctl, L("Swap units 1 ↔ 2", "ユニット1 ↔ 2を入れ替え"), () => { units = [units[1], units[0], units[2]]; draw(); });
  button(ctl, L("Rotate all units", "全ユニットを巡回"), () => { units = [units[2], units[0], units[1]]; draw(); });
  button(ctl, L("Flip signs of unit 3", "ユニット3の符号を反転"), () => { const u = units[2]; units[2] = { ...u, w: -u.w, b: -u.b, v: -u.v }; draw(); });
  button(ctl, L("Reset", "リセット"), () => { units = original.map(u => ({ ...u })); draw(); });

  const row = div(el, "row");
  const names = ["w₁", "w₂", "w₃", "b₁", "b₂", "b₃", "v₁", "v₂", "v₃"];
  const T = plot(div(row, ""), { width: 360, height: 240, xBand: names, y: [-2.5, 2.5], yLabel: "θ", yTicks: 5 });
  T.g.append("line").attr("x1", 0).attr("x2", T.W).attr("y1", T.y(0)).attr("y2", T.y(0)).style("stroke", COLOR.muted);
  const F = plot(div(row, ""), { width: 320, height: 240, x: [-3, 3], y: [-3, 3], xLabel: "x", yLabel: "f(x)" });
  const xs = linspace(-3, 3, 200);
  F.g.append("path").attr("d", d3.line().x(x => F.x(x)).y(x => F.y(f(original, x)))(xs))
    .style("fill", "none").style("stroke", COLOR.muted).style("stroke-width", 6).style("opacity", 0.35);
  const curve = F.g.append("path").style("fill", "none").style("stroke", COLOR.q).style("stroke-width", 2.5);
  const readout = div(el, "readout");

  function draw() {
    const theta = [...units.map(u => u.w), ...units.map(u => u.b), ...units.map(u => u.v)];
    const ids = [...units, ...units, ...units].map(u => u.id);
    T.g.selectAll("rect").data(theta).join("rect").transition().duration(300)
      .attr("x", (_, i) => T.x(names[i])).attr("width", T.x.bandwidth())
      .attr("y", v => T.y(Math.max(0, v))).attr("height", v => Math.abs(T.y(v) - T.y(0)))
      .style("fill", (_, i) => UNIT_COLORS[ids[i]]);
    curve.attr("d", d3.line().x(x => F.x(x)).y(x => F.y(f(units, x)))(xs));
    const orig = [...original.map(u => u.w), ...original.map(u => u.b), ...original.map(u => u.v)];
    const dist = Math.hypot(...theta.map((v, i) => v - orig[i]));
    readout.innerHTML = tex(`f_\\theta(x)=c+\\textstyle\\sum_{k=1}^{3} v_k\\tanh(w_kx+b_k)`) + "<br>" +
      L(`Distance moved in parameter space: <b>${fmt(dist)}</b>. Change in the function: <b>0</b>. The orange curve sits exactly on the grey original. Hidden units can be reordered (3! = 6 ways), and since tanh(−z) = −tanh(z) each can also flip sign (2³ = 8 ways). So every function this network computes has at least 48 addresses.`,
        `パラメータ空間で動いた距離：<b>${fmt(dist)}</b>。関数の変化：<b>0</b>。オレンジの曲線は灰色の元の曲線にぴったり重なっています。隠れユニットは並べ替えられ（3! = 6通り）、tanh(−z) = −tanh(z) なので符号も反転できます（2³ = 8通り）。つまり、このネットワークが計算するどの関数にも、少なくとも48個の住所があります。`);
  }
  draw();
}
