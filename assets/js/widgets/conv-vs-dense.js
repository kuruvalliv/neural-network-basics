import { d3, L, div, slider, plot, COLOR } from "./_lib.js";
import { rng, randn } from "../math.js";

const N = 32;
const KERNEL = [-1, 2, -1];

export default function mount(el) {
  const r = rng(8);
  const dense = Array.from({ length: N }, () => Array.from({ length: N }, () => randn(r) / Math.sqrt(N)));

  const ctl = div(el, "controls");
  const ps = slider(ctl, { label: L("bump position", "こぶの位置"), min: 3, max: N - 4, step: 1, value: 10, format: v => v, onInput: draw });

  const cats = d3.range(N).map(String);
  const mk = (title, color) => {
    const box = div(el, "");
    div(box, "", `<div style="font-weight:600;margin:.4rem 0 0">${title}</div>`);
    const P = plot(box, { height: 130, xBand: cats, y: [-1.2, 1.2], yTicks: 3, margin: { bottom: 10 } });
    P.root.select(".axis").style("display", "none");
    return { P, color };
  };
  const I = mk(L("input signal", "入力信号"), COLOR.data);
  const C = mk(L("convolution: the same 3 weights slid along (3 parameters)", "畳み込み：同じ3つの重みをずらしながら適用（パラメータ3個）"), COLOR.q);
  const D = mk(L("dense layer: a separate weight for every pair (1,024 parameters)", "全結合層：すべての組に別々の重み（パラメータ1,024個）"), COLOR.accent);
  const readout = div(el, "readout");

  const bars = ({ P, color }, vals) => P.g.selectAll("rect").data(vals).join("rect")
    .attr("x", (_, i) => P.x(cats[i])).attr("width", P.x.bandwidth())
    .attr("y", v => P.y(Math.max(0, v))).attr("height", v => Math.abs(P.y(v) - P.y(0))).style("fill", color);

  function draw() {
    const p = ps.value;
    const x = d3.range(N).map(i => Math.exp(-0.5 * ((i - p) / 1.2) ** 2));
    const conv = d3.range(N).map(i => KERNEL.reduce((s, k, j) => s + k * (x[i + j - 1] ?? 0), 0));
    const den = dense.map(row => row.reduce((s, w, j) => s + w * x[j], 0));
    const scale = v => { const m = d3.max(v, Math.abs) || 1; return v.map(a => a / m); };
    bars(I, x);
    bars(C, scale(conv));
    bars(D, scale(den));
    readout.innerHTML = L(
      "Move the bump. The convolution's response moves with it, keeping the same shape: it is <b>equivariant to shifts</b>, because the same small detector is reused at every position. The dense layer's response is scrambled differently at every position. It <em>could</em> learn the conv behaviour, but it would have to learn it separately for each position, using 340× more parameters.",
      "こぶを動かしてみましょう。畳み込みの応答は、同じ形のまま一緒に動きます。同じ小さな検出器をすべての位置で使い回しているので、<b>平行移動に対して同変</b>なのです。全結合層の応答は、位置ごとにばらばらにかき混ぜられます。全結合層でも畳み込みと同じ振る舞いを学ぶこと<em>は</em>できますが、位置ごとに別々に学ばなければならず、340倍のパラメータを使うことになります。");
  }
  draw();
}
