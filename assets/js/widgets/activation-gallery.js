import { d3, L, div, choice, plot, COLOR, tex } from "./_lib.js";
import { linspace, sigmoid, erf } from "../math.js";

const Phi = z => 0.5 * (1 + erf(z / Math.SQRT2));
const phi = z => Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
const ACTS = {
  relu: { f: z => Math.max(0, z), d: z => (z > 0 ? 1 : 0), tex: "\\max(0,z)", range: "[0,\\infty)" },
  leaky: { f: z => (z > 0 ? z : 0.1 * z), d: z => (z > 0 ? 1 : 0.1), tex: "\\max(0.1z,z)", range: "(-\\infty,\\infty)" },
  sigmoid: { f: sigmoid, d: z => sigmoid(z) * (1 - sigmoid(z)), tex: "1/(1+e^{-z})", range: "(0,1)" },
  tanh: { f: Math.tanh, d: z => 1 - Math.tanh(z) ** 2, tex: "\\tanh z", range: "(-1,1)" },
  gelu: { f: z => z * Phi(z), d: z => Phi(z) + z * phi(z), tex: "z\\,\\Phi(z)", range: "[-0.17,\\infty)" },
  softplus: { f: z => Math.log1p(Math.exp(z)), d: sigmoid, tex: "\\log(1+e^{z})", range: "(0,\\infty)" },
};

export default function mount(el) {
  let key = "sigmoid";
  choice(div(el, "controls"), {
    label: "σ", value: key,
    options: Object.keys(ACTS).map(k => ({ value: k, label: k === "relu" ? "ReLU" : k === "gelu" ? "GELU" : k === "leaky" ? "Leaky ReLU" : k })),
    onChange: v => { key = v; draw(); },
  });
  const row = div(el, "row");
  const F = plot(div(row, ""), { width: 340, height: 240, x: [-5, 5], y: [-1.5, 4], xLabel: "z", yLabel: "σ(z)" });
  const D = plot(div(row, ""), { width: 340, height: 240, x: [-5, 5], y: [-0.2, 1.2], xLabel: "z", yLabel: "σ′(z)" });
  const zs = linspace(-5, 5, 401);
  const shade = [F, D].map(P => P.g.append("g"));
  const fp = F.g.append("path").style("fill", "none").style("stroke", COLOR.q).style("stroke-width", 3);
  const dp = D.g.append("path").style("fill", "none").style("stroke", COLOR.accent).style("stroke-width", 3);
  const readout = div(el, "readout");

  function draw() {
    const a = ACTS[key];
    fp.attr("d", d3.line().x(z => F.x(z)).y(z => F.y(Math.min(4, a.f(z))))(zs));
    dp.attr("d", d3.line().x(z => D.x(z)).y(z => D.y(a.d(z)))(zs));
    const flat = zs.filter(z => Math.abs(a.d(z)) < 0.05);
    const segs = [];
    flat.forEach(z => { const s = segs.at(-1); if (s && Math.abs(z - s[1]) < 0.03) s[1] = z; else segs.push([z, z]); });
    shade.forEach((g, i) => {
      const P = [F, D][i];
      g.selectAll("rect").data(segs).join("rect").attr("x", s => P.x(s[0])).attr("width", s => P.x(s[1]) - P.x(s[0]))
        .attr("y", 0).attr("height", P.H).style("fill", COLOR.loss).style("opacity", 0.12);
    });
    const satFrac = flat.length / zs.length;
    readout.innerHTML = tex(`\\sigma(z)=${a.tex},\\quad\\text{range } ${a.range}`) + "<br>" +
      L(`Red bands: where the slope is below 0.05, so almost no learning signal passes through (${Math.round(satFrac * 100)}% of this window). ${key === "relu" ? "ReLU is dead for every z &lt; 0 but passes the full signal for z &gt; 0." : key === "sigmoid" ? "The sigmoid's slope is at most 0.25, and both tails are flat." : ""}`,
        `赤い帯：傾きが0.05未満で、学習の信号がほとんど通らない場所です（この範囲の${Math.round(satFrac * 100)}%）。${key === "relu" ? "ReLU は z &lt; 0 ではすべて死んでいますが、z &gt; 0 では信号をそのまま通します。" : key === "sigmoid" ? "sigmoid の傾きは最大でも0.25で、両端は平らです。" : ""}`);
  }
  draw();
}
