import { d3, L, div, slider, choice, button, plot, COLOR, tex } from "./_lib.js";
import { linspace, fmt, rng } from "../math.js";

const ACT = { none: z => z, relu: z => Math.max(0, z), tanh: Math.tanh };

export default function mount(el) {
  let act = "relu", timer = null;
  const ctl = div(el, "controls");
  const th = slider(ctl, { label: L("rotate", "回転"), min: -180, max: 180, step: 1, value: 30, format: v => `${v}°`, onInput: draw });
  const sx = slider(ctl, { label: "s₁", min: -2, max: 2, step: 0.01, value: 1.4, onInput: draw });
  const sy = slider(ctl, { label: "s₂", min: -2, max: 2, step: 0.01, value: 0.8, onInput: draw });
  const b1 = slider(ctl, { label: "b₁", min: -1.5, max: 1.5, step: 0.01, value: 0.3, onInput: draw });
  const b2 = slider(ctl, { label: "b₂", min: -1.5, max: 1.5, step: 0.01, value: -0.2, onInput: draw });
  const ctl2 = div(el, "controls");
  choice(ctl2, {
    label: "σ", value: act,
    options: [{ value: "none", label: L("none", "なし") }, { value: "relu", label: "ReLU" }, { value: "tanh", label: "tanh" }],
    onChange: v => { act = v; draw(); },
  });
  const ts = slider(ctl2, { label: L("stage", "段階"), min: 0, max: 2, step: 0.01, value: 2, format: v => (v <= 1 ? "Wx+b" : "σ(Wx+b)"), onInput: draw });
  button(ctl2, L("▶ Play", "▶ 再生"), () => {
    timer?.stop();
    const t0 = performance.now();
    timer = d3.timer(() => {
      const t = Math.min(2, (performance.now() - t0) / 1500);
      ts.set(t);
      if (t >= 2) timer.stop();
    });
  });

  const P = plot(el, { height: 400, width: 460, x: [-3.5, 3.5], y: [-3.5, 3.5], xLabel: "h₁", yLabel: "h₂", xTicks: 7, yTicks: 7 });
  const lines = [];
  linspace(-2, 2, 9).forEach(v => {
    lines.push({ c: "h", pts: linspace(-2, 2, 50).map(u => [u, v]) });
    lines.push({ c: "v", pts: linspace(-2, 2, 50).map(u => [v, u]) });
  });
  const r = rng(2);
  const pts = Array.from({ length: 150 }, () => [r() * 4 - 2, r() * 4 - 2]);
  const hue = p => d3.interpolateRainbow((Math.atan2(p[1], p[0]) + Math.PI) / (2 * Math.PI));
  const gl = P.g.append("g"), gp = P.g.append("g");
  const readout = div(el, "readout");

  function draw() {
    const a = (th.value * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    const W = [[c * sx.value, -s * sy.value], [s * sx.value, c * sy.value]], b = [b1.value, b2.value];
    const t = ts.value, f = ACT[act];
    const map = ([x, y]) => {
      const z = [W[0][0] * x + W[0][1] * y + b[0], W[1][0] * x + W[1][1] * y + b[1]];
      if (t <= 1) return [x + (z[0] - x) * t, y + (z[1] - y) * t];
      const u = t - 1;
      return [z[0] + (f(z[0]) - z[0]) * u, z[1] + (f(z[1]) - z[1]) * u];
    };
    const clip = v => Math.max(-3.5, Math.min(3.5, v));
    gl.selectAll("path").data(lines).join("path")
      .attr("d", d => d3.line().x(p => P.x(clip(p[0]))).y(p => P.y(clip(p[1])))(d.pts.map(map)))
      .style("fill", "none").style("stroke", COLOR.muted).style("opacity", 0.5);
    gp.selectAll("circle").data(pts).join("circle")
      .attr("cx", p => P.x(clip(map(p)[0]))).attr("cy", p => P.y(clip(map(p)[1]))).attr("r", 3.2).style("fill", hue);
    readout.innerHTML =
      tex(`W=\\begin{pmatrix}${fmt(W[0][0])}&${fmt(W[0][1])}\\\\${fmt(W[1][0])}&${fmt(W[1][1])}\\end{pmatrix},\\; b=(${fmt(b[0])},${fmt(b[1])})`) + "<br>" +
      L(`Stage 0→1: the linear part rotates, stretches, and shifts the grid, but lines stay straight and parallel. Stage 1→2: ${act === "relu" ? "ReLU folds everything with a negative coordinate onto the axes, so whole regions get squashed together." : act === "tanh" ? "tanh squeezes everything into the square (−1, 1)², bending the grid lines." : "with no nonlinearity nothing happens, and the layer stays an affine map."}`,
        `段階0→1：線形部分が格子を回転・伸縮・平行移動しますが、直線はまっすぐで平行なままです。段階1→2：${act === "relu" ? "ReLU は負の座標を持つ点をすべて軸の上に折りたたみ、領域ごと押しつぶします。" : act === "tanh" ? "tanh はすべてを正方形 (−1, 1)² の中に押し込み、格子の線を曲げます。" : "非線形性がないので何も起きず、層はアフィン写像のままです。"}`);
  }
  draw();
}
