import { d3, L, div, slider, choice, plot, legend, COLOR } from "./_lib.js";
import { normPdf, normCdf, linspace, fmt } from "../math.js";

export default function mount(el) {
  const lo = -4, hi = 4;
  let mode = "prob";

  const ctl = div(el, "controls");
  const bins = slider(ctl, { label: L("bins", "区間の数"), min: 4, max: 80, step: 1, value: 8, format: v => v, onInput: draw });
  const sig = slider(ctl, { label: "σ", min: 0.15, max: 2, step: 0.01, value: 1, onInput: draw });
  choice(div(el, "controls"), {
    label: L("Bar height", "棒の高さ"),
    options: [
      { value: "prob", label: L("probability of the bin", "区間の確率") },
      { value: "dens", label: L("probability ÷ bin width", "確率 ÷ 区間の幅") },
    ],
    value: mode,
    onChange: v => { mode = v; draw(); },
  });

  const P = plot(el, { x: [lo, hi], y: [0, 1], xLabel: "y", yLabel: "height" });
  const pathEl = P.g.append("path").style("fill", "none").style("stroke", COLOR.p).style("stroke-width", 2.5);
  legend(el, [[COLOR.data, L("bars", "棒")], [COLOR.p, L("density curve p(y)", "密度曲線 p(y)")]]);
  const readout = div(el, "readout");

  function draw() {
    const n = bins.value, s = sig.value, w = (hi - lo) / n;
    const bars = d3.range(n).map(i => {
      const a = lo + i * w, mass = normCdf(a + w, 0, s) - normCdf(a, 0, s);
      return { a, mass, height: mode === "prob" ? mass : mass / w };
    });
    const peak = normPdf(0, 0, s);
    const top = Math.max(d3.max(bars, d => d.height), mode === "dens" ? peak : 0) * 1.12;
    P.y.domain([0, top]);
    P.drawAxes();
    P.g.selectAll("rect").data(bars).join("rect")
      .attr("x", d => P.x(d.a) + 0.5).attr("width", Math.max(0.5, P.x(lo + w) - P.x(lo) - 1))
      .attr("y", d => P.y(d.height)).attr("height", d => P.H - P.y(d.height))
      .style("fill", COLOR.data).style("opacity", 0.7);
    const pts = linspace(lo, hi, 200).map(y => [y, normPdf(y, 0, s)]);
    pathEl.raise().attr("d", d3.line().x(d => P.x(d[0])).y(d => P.y(d[1]))(pts))
      .style("display", mode === "dens" ? null : "none");

    const tallest = d3.max(bars, d => d.height);
    const sumHeights = d3.sum(bars, d => d.height);
    const area = d3.sum(bars, d => d.mass);
    readout.innerHTML = mode === "prob"
      ? L(`Tallest bar: <b>${fmt(tallest)}</b>. Sum of heights: <b>${fmt(sumHeights)}</b>. More bins make every bar shorter, and the bars never settle into a curve.`,
          `最も高い棒：<b>${fmt(tallest)}</b>。高さの合計：<b>${fmt(sumHeights)}</b>。区間を増やすと棒はどれも低くなり、いつまでも曲線には落ち着きません。`)
      : L(`Tallest bar: <b>${fmt(tallest)}</b>${tallest > 1 ? " (above 1, and that is fine)" : ""}. Total <em>area</em> in view: <b>${fmt(area)}</b>. Probability is area, so bars converge to the density curve.`,
          `最も高い棒：<b>${fmt(tallest)}</b>${tallest > 1 ? "（1を超えていますが問題ありません）" : ""}。表示範囲内の<em>面積</em>の合計：<b>${fmt(area)}</b>。確率は面積なので、棒は密度曲線に近づきます。`);
  }
  draw();
}
