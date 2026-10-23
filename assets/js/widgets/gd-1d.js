import { d3, L, div, slider, plot, COLOR, tex } from "./_lib.js";
import { linspace, fmt } from "../math.js";

export default function mount(el) {
  const ctl = div(el, "controls");
  const es = slider(ctl, { label: L("learning rate η", "学習率 η"), min: 0.02, max: 1.1, step: 0.01, value: 0.15, onInput: draw });
  const ks = slider(ctl, { label: L("steps", "ステップ数"), min: 1, max: 30, step: 1, value: 10, format: v => v, onInput: draw });

  const P = plot(el, { height: 300, x: [-3.2, 3.2], y: [0, 10.5], xLabel: "θ", yLabel: "L(θ) = θ²" });
  const Lf = t => t * t;
  P.g.append("path").attr("d", d3.line().x(t => P.x(t)).y(t => P.y(Lf(t)))(linspace(-3.2, 3.2, 200)))
    .style("fill", "none").style("stroke", COLOR.loss).style("stroke-width", 2.5);
  const zig = P.g.append("path").style("fill", "none").style("stroke", COLOR.accent).style("stroke-width", 1.5);
  const dots = P.g.append("g");
  const readout = div(el, "readout");

  function draw() {
    const eta = es.value, pts = [-2.5];
    for (let k = 0; k < ks.value; k++) pts.push(pts.at(-1) - eta * 2 * pts.at(-1));
    const clip = t => Math.max(-3.2, Math.min(3.2, t));
    zig.attr("d", d3.line().x(t => P.x(clip(t))).y(t => P.y(Math.min(10.5, Lf(t))))(pts));
    dots.selectAll("circle").data(pts).join("circle").attr("cx", t => P.x(clip(t))).attr("cy", t => P.y(Math.min(10.5, Lf(t))))
      .attr("r", (_, i) => (i ? 4 : 6)).style("fill", (_, i) => (i ? COLOR.q : COLOR.ink));
    const r = 1 - 2 * eta;
    const verdict = Math.abs(r) >= 1
      ? L("<b>Diverges</b>: each step overshoots by more than it corrects.", "<b>発散</b>：1歩ごとに、修正する量より行き過ぎる量のほうが大きくなります。")
      : r < 0
        ? L("Converges, but <b>zig-zags</b> across the minimum.", "収束しますが、最小点をまたいで<b>ジグザグ</b>します。")
        : eta < 0.1
          ? L("Converges, but <b>crawls</b>.", "収束しますが、<b>這うように</b>遅いです。")
          : L("Converges smoothly.", "滑らかに収束します。");
    readout.innerHTML = tex(`\\theta_{k+1}=\\theta_k-\\eta\\,L'(\\theta_k)=\\theta_k-2\\eta\\,\\theta_k=(${fmt(r)})\\,\\theta_k`) + "<br>" + verdict + " " +
      L("For a bowl with curvature c, gradient descent is stable only when η &lt; 2/c. That is why steep directions limit the step size for every direction.",
        "曲率 c のお椀では、勾配降下法が安定するのは η &lt; 2/c のときだけです。だから、急な方向がすべての方向の歩幅を制限してしまうのです。");
  }
  draw();
}
