import { d3, L, div, slider, choice, button, plot, COLOR } from "./_lib.js";
import { linspace, rng, randn } from "../math.js";

const ACT = { none: z => z, relu: z => Math.max(0, z), tanh: Math.tanh };

export function randomNet(seed, depth, width, gain = 1.6, inDim = 1) {
  const r = rng(seed);
  const layers = [];
  let fanIn = inDim;
  for (let l = 0; l < depth; l++) {
    layers.push({
      W: Array.from({ length: width }, () => Array.from({ length: fanIn }, () => (gain * randn(r)) / Math.sqrt(fanIn))),
      b: Array.from({ length: width }, () => 0.6 * randn(r)),
    });
    fanIn = width;
  }
  const out = Array.from({ length: fanIn }, () => randn(r) / Math.sqrt(fanIn));
  return { layers, out };
}

export function forward(net, x, act) {
  let h = Array.isArray(x) ? x : [x];
  const pattern = [];
  for (const { W, b } of net.layers) {
    const z = W.map((row, i) => row.reduce((s, w, j) => s + w * h[j], b[i]));
    pattern.push(...z.map(v => (v > 0 ? 1 : 0)));
    h = z.map(act);
  }
  return { y: net.out.reduce((s, w, i) => s + w * h[i], 0), pattern: pattern.join("") };
}

export default function mount(el) {
  let act = "none", seed = 1;
  const ctl = div(el, "controls");
  const ds = slider(ctl, { label: L("layers", "層の数"), min: 1, max: 10, step: 1, value: 4, format: v => v, onInput: draw });
  choice(ctl, {
    label: "σ", value: act,
    options: [{ value: "none", label: L("none (linear)", "なし（線形）") }, { value: "relu", label: "ReLU" }, { value: "tanh", label: "tanh" }],
    onChange: v => { act = v; draw(); },
  });
  button(ctl, L("New random weights", "重みを引き直す"), () => { seed++; draw(); });

  const P = plot(el, { height: 300, x: [-3, 3], y: [-3, 3], xLabel: "x", yLabel: "f(x)" });
  const path = P.g.append("path").style("fill", "none").style("stroke", COLOR.q).style("stroke-width", 3);
  const readout = div(el, "readout");
  const xs = linspace(-3, 3, 600);

  function draw() {
    const net = randomNet(seed, ds.value, 6);
    const res = xs.map(x => forward(net, x, ACT[act]));
    const ys = res.map(r => r.y);
    const lo = d3.min(ys), hi = d3.max(ys), pad = Math.max(0.2, (hi - lo) * 0.1);
    P.y.domain([lo - pad, hi + pad]);
    P.drawAxes();
    path.attr("d", d3.line().x((_, i) => P.x(xs[i])).y(v => P.y(v))(ys));
    const pieces = act === "relu" ? 1 + res.reduce((n, r, i) => n + (i && r.pattern !== res[i - 1].pattern ? 1 : 0), 0) : null;
    readout.innerHTML = act === "none"
      ? L(`${ds.value} layers of width 6, and still a straight line. Multiplying matrices gives another matrix, W<sub>L</sub>⋯W<sub>1</sub> = W, so every linear network, however deep, is a single linear map.`,
          `幅6の層を${ds.value}枚重ねても、やはり直線です。行列の積はまた行列（W<sub>L</sub>⋯W<sub>1</sub> = W）なので、どんなに深い線形ネットワークも、ただ1つの線形写像にすぎません。`)
      : act === "relu"
        ? L(`Piecewise linear with <b>${pieces}</b> straight pieces on this window. Add layers and watch the count grow.`, `この範囲で、<b>${pieces}</b>本の線分からなる区分線形関数です。層を増やすと、線分の数が増えていく様子が見られます。`)
        : L("Smooth and curved. tanh bends everywhere a little, rather than folding at sharp corners.", "滑らかで曲がっています。tanh は鋭い角で折るのではなく、あらゆる場所を少しずつ曲げます。");
  }
  draw();
}
