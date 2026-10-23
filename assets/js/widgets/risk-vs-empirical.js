import { d3, L, div, slider, choice, button, plot, legend, COLOR, tex } from "./_lib.js";
import { CLS } from "../running-example.js";
import { linspace, fmt, sigmoid } from "../math.js";

// One-knob model q_w(rain | h) = σ(w (h − 0.6)); the true w is 12.
const q = (w, h) => sigmoid(w * (h - 0.6));
const surprise = (w, d) => -Math.log2(d.y ? q(w, d.x) : 1 - q(w, d.x));

export default function mount(el) {
  let n = 20, seed = 100;
  const hs = linspace(0.0025, 0.9975, 200);
  const risk = w => d3.mean(hs, h => {
    const p = CLS.pRain(h), m = Math.min(Math.max(q(w, h), 1e-9), 1 - 1e-9);
    return -(p * Math.log2(m) + (1 - p) * Math.log2(1 - m));
  });

  const ctl = div(el, "controls");
  const ws = slider(ctl, { label: "w", min: 0, max: 40, step: 0.1, value: 6, format: v => v.toFixed(1), onInput: draw });
  choice(ctl, {
    label: L("sample size n", "サンプル数 n"),
    options: [5, 20, 100, 1000].map(v => ({ value: v, label: String(v) })),
    value: n, onChange: v => { n = +v; draw(); },
  });
  button(ctl, L("New sample", "サンプルを引き直す"), () => { seed++; draw(); });

  const P = plot(el, { height: 300, x: [0, 40], y: [0, 1.2], xLabel: "w", yLabel: "bits" });
  const wGrid = linspace(0, 40, 161);
  P.g.append("path").attr("d", d3.line().x(w => P.x(w)).y(w => P.y(risk(w)))(wGrid))
    .style("fill", "none").style("stroke", COLOR.p).style("stroke-width", 2.5);
  const emp = P.g.append("path").style("fill", "none").style("stroke", COLOR.loss).style("stroke-width", 2);
  const vTrue = P.g.append("line").style("stroke", COLOR.p).style("stroke-dasharray", "5 4");
  const vEmp = P.g.append("line").style("stroke", COLOR.loss).style("stroke-dasharray", "5 4");
  const dot = P.g.append("circle").attr("r", 6).style("fill", COLOR.q);
  legend(el, [[COLOR.p, L("risk R(w): expected loss on the whole world", "リスク R(w)：世界全体での期待損失")], [COLOR.loss, L("empirical risk R̂(w): average loss on your n days", "経験リスク R̂(w)：手元の n 日での平均損失")]]);
  const readout = div(el, "readout");

  const wTrue = wGrid[d3.minIndex(wGrid, risk)];

  function draw() {
    const data = CLS.sample(n, seed);
    const er = w => d3.mean(data, d => surprise(w, d));
    const ys = wGrid.map(er);
    const top = Math.max(1.2, Math.min(3, d3.max(ys)));
    P.y.domain([0, top]);
    P.drawAxes();
    emp.attr("d", d3.line().x((_, i) => P.x(wGrid[i])).y(v => P.y(Math.min(v, top)))(ys));
    const wEmp = wGrid[d3.minIndex(ys)];
    vTrue.attr("x1", P.x(wTrue)).attr("x2", P.x(wTrue)).attr("y1", 0).attr("y2", P.H);
    vEmp.attr("x1", P.x(wEmp)).attr("x2", P.x(wEmp)).attr("y1", 0).attr("y2", P.H);
    dot.attr("cx", P.x(ws.value)).attr("cy", P.y(Math.min(er(ws.value), top)));
    readout.innerHTML =
      tex(`R(w)=\\mathbb E_{(x,y)\\sim p}\\big[-\\log q_w(y\\mid x)\\big],\\qquad \\hat R(w)=\\tfrac1n\\textstyle\\sum_i -\\log q_w(y_i\\mid x_i)`) + "<br>" +
      L(`With n = ${n}, the data's favourite is w = ${fmt(wEmp, 1)}, while the world's favourite is w = ${fmt(wTrue, 1)}. At your w = ${fmt(ws.value, 1)}: R̂ = ${fmt(er(ws.value), 3)}, R = ${fmt(risk(ws.value), 3)}. Draw new samples with small n to see how much R̂ wobbles.`,
        `n = ${n} のとき、データが最もよいとする w は ${fmt(wEmp, 1)}、世界にとって最もよい w は ${fmt(wTrue, 1)} です。いまの w = ${fmt(ws.value, 1)} では R̂ = ${fmt(er(ws.value), 3)}、R = ${fmt(risk(ws.value), 3)}。n を小さくしてサンプルを引き直し、R̂ がどれだけ揺れるか見てみましょう。`);
  }
  draw();
}
