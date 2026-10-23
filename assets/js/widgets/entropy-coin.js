import { d3, L, div, slider, plot, COLOR, tex } from "./_lib.js";
import { linspace, fmt, entropy, rng } from "../math.js";

export default function mount(el) {
  const ctl = div(el, "controls");
  const ps = slider(ctl, { label: L("p(rain)", "p(雨)"), min: 0, max: 1, step: 0.01, value: 0.5, onInput: draw });

  const P = plot(el, { height: 240, x: [0, 1], y: [0, 1.05], xLabel: "p", yLabel: "H(p)  [bits]" });
  P.g.append("path").attr("d", d3.line().x(d => P.x(d)).y(d => P.y(entropy([d, 1 - d])))(linspace(0, 1, 201)))
    .style("fill", "none").style("stroke", COLOR.p).style("stroke-width", 2.5);
  const dot = P.g.append("circle").attr("r", 6).style("fill", COLOR.p);
  const seq = div(el, "", "");
  seq.style.cssText = "font-size:20px;letter-spacing:2px;margin:.4rem 0;word-break:break-all";
  const readout = div(el, "readout");
  const u = (() => { const r = rng(5); return Array.from({ length: 40 }, r); })();

  function draw() {
    const p = ps.value, H = entropy([p, 1 - p]);
    dot.attr("cx", P.x(p)).attr("cy", P.y(H));
    seq.textContent = u.map(v => (v < p ? "☂" : "☀")).join("");
    readout.innerHTML = tex(`H(p)=-p\\log_2 p-(1-p)\\log_2(1-p)=${fmt(H, 3)}\\text{ bits}`) + "<br>" +
      L(`Forty sample days are shown above. ${H < 0.3 ? "Almost every day looks the same, so there is little to be surprised by." : H > 0.95 ? "Each day is a coin flip, so you cannot do better than 1 bit of surprise per day on average." : "Some pattern, some surprise."}`,
        `上に40日分のサンプルを表示しています。${H < 0.3 ? "ほぼ毎日同じなので、驚くことはほとんどありません。" : H > 0.95 ? "毎日がコイン投げなので、平均して1日1ビットより少ない驚きにはできません。" : "ある程度の偏りと、ある程度の驚きがあります。"}`);
  }
  draw();
}
