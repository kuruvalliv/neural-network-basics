import { d3, L, div, slider, plot, COLOR, tex } from "./_lib.js";
import { linspace, fmt } from "../math.js";

export default function mount(el) {
  const ctl = div(el, "controls");
  const ps = slider(ctl, { label: L("true chance of rain p", "本当の降水確率 p"), min: 0.05, max: 0.95, step: 0.01, value: 0.7, onInput: draw });
  const rs = slider(ctl, { label: L("you announce r", "あなたが発表する r"), min: 0.01, max: 0.99, step: 0.01, value: 0.95, onInput: draw });

  const row = div(el, "row");
  const mk = (parent, label, color) => {
    const P = plot(parent, { width: 300, height: 220, x: [0, 1], y: [0, 1], xLabel: "r", yLabel: label, xTicks: 5, yTicks: 4 });
    return { P, path: P.g.append("path").style("fill", "none").style("stroke", color).style("stroke-width", 2.5),
      vline: P.g.append("line").style("stroke", COLOR.p).style("stroke-dasharray", "5 4"),
      dot: P.g.append("circle").attr("r", 6).style("fill", COLOR.q) };
  };
  const A = mk(div(row, ""), "log score", COLOR.loss);
  const B = mk(div(row, ""), "Brier", COLOR.loss);
  const readout = div(el, "readout");

  function draw() {
    const p = ps.value, r = rs.value;
    const logS = x => -(p * Math.log2(x) + (1 - p) * Math.log2(1 - x));
    const brier = x => p * (1 - x) ** 2 + (1 - p) * x ** 2;
    const xs = linspace(0.01, 0.99, 150);
    [[A, logS], [B, brier]].forEach(([w, f]) => {
      const ys = xs.map(f);
      w.P.y.domain([0, Math.min(d3.max(ys), w === A ? 4 : 1) * 1.05]);
      w.P.drawAxes();
      w.path.attr("d", d3.line().x((_, i) => w.P.x(xs[i])).y(v => w.P.y(Math.min(v, w.P.y.domain()[1])))(ys));
      w.vline.attr("x1", w.P.x(p)).attr("x2", w.P.x(p)).attr("y1", 0).attr("y2", w.P.H);
      w.dot.attr("cx", w.P.x(r)).attr("cy", w.P.y(Math.min(f(r), w.P.y.domain()[1])));
    });
    readout.innerHTML =
      tex(`\\mathbb E_p[-\\log_2 q_r(Y)]=${fmt(logS(r), 3)}\\;(\\text{best }${fmt(logS(p), 3)}),\\quad \\mathbb E_p[\\text{Brier}]=${fmt(brier(r), 3)}\\;(\\text{best }${fmt(brier(p), 3)})`) + "<br>" +
      L("Both expected penalties are lowest exactly when you announce the true chance (dashed line). Exaggerating confidence <b>always</b> costs you. Scores with this property are called <b>proper</b>.",
        "どちらの期待ペナルティも、本当の確率（破線）をそのまま発表したときに最小になります。自信を誇張すると<b>必ず</b>損をします。この性質を持つスコアを<b>適切な（proper）</b>スコアと呼びます。");
  }
  draw();
}
