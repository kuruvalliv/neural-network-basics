import { d3, L, div, slider, choice, plot, COLOR } from "./_lib.js";
import { rng, randn, fmt } from "../math.js";

const DEPTH = 20, WIDTH = 64;
const ACTS = { tanh: Math.tanh, relu: z => Math.max(0, z) };

export default function mount(el) {
  let act = "tanh", norm = "off";
  const ctl = div(el, "controls");
  choice(ctl, { label: "σ", value: act, options: [{ value: "tanh", label: "tanh" }, { value: "relu", label: "ReLU" }], onChange: v => { act = v; draw(); } });
  const gs = slider(ctl, { label: L("init scale g (weights ~ g/√n)", "初期化のスケール g（重み ~ g/√n）"), min: 0.3, max: 3, step: 0.05, value: 0.6, onInput: draw });
  choice(ctl, {
    label: L("normalization", "正規化"), value: norm,
    options: [{ value: "off", label: L("off", "なし") }, { value: "on", label: L("on", "あり") }],
    onChange: v => { norm = v; draw(); },
  });

  const cats = d3.range(1, DEPTH + 1).map(String);
  const P = plot(el, { height: 260, xBand: cats, y: [-6, 3], yLabel: "log₁₀ std(h)", yFormat: v => v });
  P.g.append("line").attr("x1", 0).attr("x2", P.W).attr("y1", P.y(0)).attr("y2", P.y(0)).style("stroke", COLOR.muted).style("stroke-dasharray", "3 3");
  const bars = P.g.append("g");
  const readout = div(el, "readout");

  function draw() {
    const r = rng(6), g = gs.value, f = ACTS[act];
    let h = Array.from({ length: WIDTH }, () => randn(r));
    const stds = [];
    for (let l = 0; l < DEPTH; l++) {
      let z = Array.from({ length: WIDTH }, () => h.reduce((s, v) => s + (g * randn(r) / Math.sqrt(WIDTH)) * v, 0));
      if (norm === "on") {
        const m = d3.mean(z), sd = d3.deviation(z) || 1;
        z = z.map(v => (v - m) / sd);
      }
      h = z.map(f);
      stds.push(d3.deviation(h) || 1e-12);
    }
    const lg = stds.map(s => Math.max(-6, Math.min(3, Math.log10(s))));
    bars.selectAll("rect").data(lg).join("rect").attr("x", (_, i) => P.x(cats[i])).attr("width", P.x.bandwidth())
      .attr("y", v => P.y(Math.max(0, v))).attr("height", v => Math.abs(P.y(v) - P.y(0)))
      .style("fill", v => (v < -1.5 ? COLOR.loss : v > 1 ? COLOR.q : COLOR.p));
    const last = stds.at(-1);
    const good = act === "tanh" ? "≈ 1" : "≈ √2";
    readout.innerHTML = L(
      `Spread of the activations at each of ${DEPTH} layers. At layer ${DEPTH}: <b>${last < 1e-3 ? last.toExponential(1) : fmt(last, 3)}</b>. ${norm === "on" ? "Normalization rescales every layer, so depth no longer compounds the error." : `Without normalization each layer multiplies the spread by roughly the same factor, so the signal ${last < 0.05 ? "<b>dies out</b>" : last > 10 ? "<b>explodes</b>" : "stays healthy"}. A scale of g ${good} keeps it stable for ${act} (Xavier/He initialization).`}`,
      `${DEPTH}層それぞれでの活性の広がり。層${DEPTH}では <b>${last < 1e-3 ? last.toExponential(1) : fmt(last, 3)}</b> です。${norm === "on" ? "正規化が層ごとにスケールを整えるので、深さによって誤差が積み重ならなくなります。" : `正規化がないと、各層が広がりをおよそ同じ倍率で掛けていくので、信号は${last < 0.05 ? "<b>消えてしまいます</b>" : last > 10 ? "<b>爆発します</b>" : "健全なままです"}。${act} では g ${good} にすると安定します（Xavier/He の初期化）。`}`);
  }
  draw();
}
