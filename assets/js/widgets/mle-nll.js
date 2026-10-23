import { d3, L, div, slider, choice, plot, legend, COLOR, tex } from "./_lib.js";
import { CLS } from "../running-example.js";
import { linspace, fmt } from "../math.js";

export default function mount(el) {
  let n = 10;
  const ctl = div(el, "controls");
  const th = slider(ctl, { label: "θ = q(☂)", min: 0.01, max: 0.99, step: 0.01, value: 0.2, onInput: draw });
  choice(ctl, {
    label: L("days of data", "データの日数"),
    options: [10, 30, 60].map(v => ({ value: v, label: String(v) })),
    value: n,
    onChange: v => { n = +v; draw(); },
  });
  const icons = div(el, "");
  icons.style.cssText = "font-size:18px;letter-spacing:1px;margin:.3rem 0;word-break:break-all";

  const P = plot(el, { height: 260, x: [0, 1], y: [0, 3], xLabel: "θ", yLabel: "bits" });
  const curve = P.g.append("path").style("fill", "none").style("stroke", COLOR.loss).style("stroke-width", 2.5);
  const vline = P.g.append("line").style("stroke", COLOR.p).style("stroke-dasharray", "5 4");
  const dot = P.g.append("circle").attr("r", 6).style("fill", COLOR.q);
  legend(el, [[COLOR.loss, L("average −log₂ q(yᵢ) over the data", "データ全体での −log₂ q(yᵢ) の平均")], [COLOR.p, L("rain frequency k/n", "雨の頻度 k/n"), true]]);
  const readout = div(el, "readout");

  function draw() {
    const ys = CLS.data.slice(0, n).map(d => d.y);
    const k = d3.sum(ys);
    const nll = t => -(k * Math.log2(t) + (n - k) * Math.log2(1 - t)) / n;
    icons.textContent = ys.map(y => (y ? "☂" : "☀")).join("");
    curve.attr("d", d3.line().x(d => P.x(d)).y(d => P.y(Math.min(3, nll(d))))(linspace(0.01, 0.99, 200)));
    const t = th.value, best = k / n;
    vline.attr("x1", P.x(best)).attr("x2", P.x(best)).attr("y1", 0).attr("y2", P.H);
    dot.attr("cx", P.x(t)).attr("cy", P.y(Math.min(3, nll(t))));
    readout.innerHTML =
      tex(`\\frac1n\\sum_i -\\log_2 q_\\theta(y_i)=-\\tfrac{${k}}{${n}}\\log_2\\theta-\\tfrac{${n - k}}{${n}}\\log_2(1-\\theta)=${fmt(nll(t), 3)}`) + "<br>" +
      L(`${k} rainy days out of ${n}. The bottom of the curve sits at θ = ${k}/${n} = ${fmt(best)}: <b>the maximum-likelihood estimate is the θ that is least surprised by the data.</b> More data makes the valley narrower.`,
        `${n}日中 ${k}日が雨。曲線の底は θ = ${k}/${n} = ${fmt(best)} にあります。<b>最尤推定とは、データに最も驚かない θ のことです。</b>データが増えるほど谷は狭くなります。`);
  }
  draw();
}
