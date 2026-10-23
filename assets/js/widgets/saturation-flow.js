import { d3, L, div, slider, choice, plot, COLOR } from "./_lib.js";
import { rng, randn, sigmoid, fmt } from "../math.js";

const ACTS = {
  sigmoid: { f: sigmoid, d: z => sigmoid(z) * (1 - sigmoid(z)) },
  tanh: { f: Math.tanh, d: z => 1 - Math.tanh(z) ** 2 },
  relu: { f: z => Math.max(0, z), d: z => (z > 0 ? 1 : 0) },
};
const WIDTH = 16;

export default function mount(el) {
  let act = "sigmoid";
  const ctl = div(el, "controls");
  choice(ctl, {
    label: "σ", value: act,
    options: [{ value: "sigmoid", label: "sigmoid" }, { value: "tanh", label: "tanh" }, { value: "relu", label: "ReLU" }],
    onChange: v => { act = v; draw(); },
  });
  const ds = slider(ctl, { label: L("depth", "深さ"), min: 2, max: 30, step: 1, value: 15, format: v => v, onInput: draw });
  const gs = slider(ctl, { label: L("weight scale", "重みのスケール"), min: 0.2, max: 4, step: 0.05, value: 1, onInput: draw });

  const P = plot(el, { height: 280, xBand: ["1"], y: [-8, 2], yLabel: "log₁₀ ‖gradient‖", yFormat: v => v });
  P.g.append("line").attr("x1", 0).attr("x2", P.W).attr("y1", P.y(0)).attr("y2", P.y(0)).style("stroke", COLOR.muted).style("stroke-dasharray", "3 3");
  const bars = P.g.append("g");
  const readout = div(el, "readout");

  function draw() {
    const L_ = ds.value, g = gs.value, a = ACTS[act], r = rng(4);
    const Ws = Array.from({ length: L_ }, () => Array.from({ length: WIDTH }, () => Array.from({ length: WIDTH }, () => (g * randn(r)) / Math.sqrt(WIDTH))));
    let h = Array.from({ length: WIDTH }, () => randn(r));
    const zs = [];
    for (const W of Ws) {
      const z = W.map(row => row.reduce((s, w, j) => s + w * h[j], 0));
      zs.push(z);
      h = z.map(a.f);
    }
    let grad = Array(WIDTH).fill(1 / Math.sqrt(WIDTH));
    const norms = [];
    for (let l = L_ - 1; l >= 0; l--) {
      const gz = grad.map((v, i) => v * a.d(zs[l][i]));
      grad = Array.from({ length: WIDTH }, (_, j) => Ws[l].reduce((s, row, i) => s + row[j] * gz[i], 0));
      norms[l] = Math.hypot(...grad);
    }
    const cats = norms.map((_, i) => String(i + 1));
    P.x.domain(cats);
    const lg = norms.map(n => Math.max(-8, Math.min(2, Math.log10(n || 1e-12))));
    P.drawAxes();
    P.root.select(".axis").selectAll(".tick text").style("display", (_, i) => (L_ > 15 && i % 5 ? "none" : null));
    bars.selectAll("rect").data(lg).join("rect")
      .attr("x", (_, i) => P.x(cats[i])).attr("width", P.x.bandwidth())
      .attr("y", v => P.y(Math.max(v, 0))).attr("height", v => Math.abs(P.y(v) - P.y(0)))
      .style("fill", v => (v < -2 ? COLOR.loss : v > 1 ? COLOR.q : COLOR.p));
    const first = norms[0];
    readout.innerHTML = L(
      `Bars show the size of the learning signal reaching each layer (layer 1 = input side), on a log scale. At layer 1 it is <b>${first < 1e-3 ? first.toExponential(1) : fmt(first, 3)}</b>. ${first < 1e-2 ? "It has <b>vanished</b>: the early layers barely learn." : first > 10 ? "It has <b>exploded</b>: updates will be wildly unstable." : "It arrives at a healthy size."} The signal is multiplied by w·σ′(z) once per layer, so anything consistently below or above 1 compounds exponentially.`,
      `棒は、各層に届く学習の信号の大きさを対数目盛りで表しています（層1 = 入力側）。層1では <b>${first < 1e-3 ? first.toExponential(1) : fmt(first, 3)}</b> です。${first < 1e-2 ? "信号は<b>消失</b>しています。前のほうの層はほとんど学習できません。" : first > 10 ? "信号は<b>爆発</b>しています。更新がひどく不安定になります。" : "健全な大きさで届いています。"}信号は層ごとに1回 w·σ′(z) 倍されるので、いつも1より小さい（または大きい）と、その効果は指数的に積み重なります。`);
  }
  draw();
}
