import { d3, L, div, slider, choice, plot, COLOR, tex } from "./_lib.js";
import { linspace, fmt, sigmoid } from "../math.js";

const FUNCS = {
  sq: { f: x => x * x, d: x => 2 * x, t: "x^2", dom: [-2, 2], y: [-1, 4] },
  sig: { f: x => sigmoid(x), d: x => sigmoid(x) * (1 - sigmoid(x)), t: "\\sigma(x)", dom: [-6, 6], y: [-0.2, 1.2] },
  log: { f: x => -Math.log(x), d: x => -1 / x, t: "-\\ln x", dom: [0.05, 3], y: [-1.5, 3.2] },
  comp: { f: x => sigmoid(3 * x - 1), d: x => 3 * sigmoid(3 * x - 1) * (1 - sigmoid(3 * x - 1)), t: "\\sigma(3x-1)", dom: [-3, 3], y: [-0.2, 1.2] },
};

export default function mount(el) {
  let key = "sq";
  const ctl = div(el, "controls");
  choice(ctl, { label: "f", value: key, options: Object.keys(FUNCS).map(k => ({ value: k, label: tex(FUNCS[k].t) })), onChange: v => { key = v; setup(); } });
  const xBox = div(el, "controls");
  const box = div(el, "");
  const readout = div(el, "readout");
  let xs, P, curve, tan, dot;

  function setup() {
    const F = FUNCS[key];
    xBox.innerHTML = "";
    xs = slider(xBox, { label: "x", min: F.dom[0], max: F.dom[1], step: 0.01, value: (F.dom[0] + F.dom[1]) / 2 + 0.3, onInput: draw });
    box.innerHTML = "";
    P = plot(box, { height: 260, x: F.dom, y: F.y, xLabel: "x", yLabel: "f(x)" });
    curve = P.g.append("path").attr("d", d3.line().x(x => P.x(x)).y(x => P.y(F.f(x)))(linspace(F.dom[0], F.dom[1], 200)))
      .style("fill", "none").style("stroke", COLOR.q).style("stroke-width", 2.5);
    tan = P.g.append("line").style("stroke", COLOR.accent).style("stroke-width", 2);
    dot = P.g.append("circle").attr("r", 6).style("fill", COLOR.accent);
    draw();
  }

  function draw() {
    const F = FUNCS[key], x = xs.value, y = F.f(x), m = F.d(x), w = (F.dom[1] - F.dom[0]) / 4;
    const clip = v => Math.max(F.y[0], Math.min(F.y[1], v));
    tan.attr("x1", P.x(x - w)).attr("y1", P.y(clip(y - m * w))).attr("x2", P.x(x + w)).attr("y2", P.y(clip(y + m * w)));
    dot.attr("cx", P.x(x)).attr("cy", P.y(y));
    readout.innerHTML = tex(`f'(${fmt(x)})=${fmt(m, 3)}`) + "&emsp;" + (key === "comp"
      ? L("Chain rule: (σ(3x − 1))′ = σ′(3x − 1) · 3. The outer slope times the inner slope.", "連鎖律：(σ(3x − 1))′ = σ′(3x − 1) · 3。外側の傾き × 内側の傾き。")
      : L("The derivative is the slope of the line that just touches the curve. Zoom in far enough and every smooth curve looks like this line.", "微分とは、曲線にちょうど接する直線の傾きです。十分に拡大すれば、どんな滑らかな曲線もこの直線のように見えます。"));
  }
  setup();
}
