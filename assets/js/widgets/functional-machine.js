import { d3, L, div, slider, plot, COLOR, tex } from "./_lib.js";
import { linspace, fmt, normPdf } from "../math.js";

export default function mount(el) {
  const ctl = div(el, "controls");
  const mus = slider(ctl, { label: "μ", min: -2, max: 2, step: 0.01, value: 0.8, onInput: draw });
  const sgs = slider(ctl, { label: "σ", min: 0.2, max: 2, step: 0.01, value: 0.6, onInput: draw });

  const row = div(el, "row");
  const P = plot(div(row, ""), { width: 340, height: 230, x: [-4, 4], y: [0, 2.1], xLabel: "y", yLabel: "q(y)", yTicks: 4 });
  const ys = linspace(-4, 4, 200);
  P.g.append("path").attr("d", d3.line().x(y => P.x(y)).y(y => P.y(normPdf(y)))(ys))
    .style("fill", "none").style("stroke", COLOR.p).style("stroke-dasharray", "5 4");
  const qPath = P.g.append("path").style("fill", COLOR.q).style("fill-opacity", 0.25).style("stroke", COLOR.q).style("stroke-width", 2.5);

  const machines = div(row, "");
  machines.style.cssText = "display:grid;gap:.5rem;align-content:start";
  const specs = [
    { name: L("mean", "平均"), f: (m) => m, tex: "\\mathbb E_q[Y]", range: [-2, 2] },
    { name: L("entropy", "エントロピー"), f: (m, s) => Math.log2(s * Math.sqrt(2 * Math.PI * Math.E)), tex: "H(q)", range: [-1, 3] },
    { name: L("KL from reference p", "基準 p からの KL"), f: (m, s) => (Math.log(1 / s) + (s * s + m * m) / 2 - 0.5) / Math.LN2, tex: "D_{KL}(q\\|p)", range: [0, 5] },
  ];
  const meters = specs.map(sp => {
    const box = div(machines, "level");
    box.innerHTML = `<div class="lv">${sp.name}</div><div>${tex(sp.tex)} = <span class="val"></span></div>
      <div style="height:6px;background:var(--grid);border-radius:3px;margin-top:4px"><div class="bar" style="height:6px;border-radius:3px;background:var(--accent)"></div></div>`;
    return { val: box.querySelector(".val"), bar: box.querySelector(".bar"), sp };
  });
  const readout = div(el, "readout");

  function draw() {
    const m = mus.value, s = sgs.value;
    qPath.attr("d", d3.area().x(y => P.x(y)).y0(P.H).y1(y => P.y(Math.min(2.1, normPdf(y, m, s))))(ys));
    meters.forEach(({ val, bar, sp }) => {
      const v = sp.f(m, s);
      val.textContent = fmt(v);
      bar.style.width = `${Math.max(0, Math.min(1, (v - sp.range[0]) / (sp.range[1] - sp.range[0]))) * 100}%`;
    });
    readout.innerHTML = L("Each box is a <b>functional</b>: it swallows the entire orange curve and returns one number. The loss we train with is a functional of exactly this kind. Dashed blue: the reference p = N(0, 1).",
      "どの箱も<b>汎関数</b>です。オレンジの曲線をまるごと飲み込み、数を1つ返します。学習に使う損失も、まさにこの種類の汎関数です。青の破線は基準の分布 p = N(0, 1) です。");
  }
  draw();
}
