import { d3, L, div, slider, choice, plot, COLOR, tex } from "./_lib.js";
import { linspace, fmt } from "../math.js";

export default function mount(el) {
  let unit = "bits";
  const lg = v => (unit === "bits" ? Math.log2(v) : Math.log(v));

  const ctl = div(el, "controls");
  const q1 = slider(ctl, { label: "q(A)", min: 0.01, max: 1, step: 0.01, value: 0.5, onInput: draw });
  const q2 = slider(ctl, { label: "q(B)", min: 0.01, max: 1, step: 0.01, value: 0.25, onInput: draw });
  choice(ctl, {
    label: L("unit", "単位"),
    options: [{ value: "bits", label: L("bits (log₂)", "ビット (log₂)") }, { value: "nats", label: L("nats (ln)", "ナット (ln)") }],
    value: unit,
    onChange: v => { unit = v; draw(); },
  });

  const row = div(el, "row");
  const left = div(row, ""), right = div(row, "");
  const P = plot(left, { width: 360, height: 260, x: [0, 1], y: [0, 7], xLabel: "q", yLabel: "−log q" });
  const curve = P.g.append("path").style("fill", "none").style("stroke", COLOR.loss).style("stroke-width", 2.5);
  const dots = P.g.append("g");

  const B = plot(right, { width: 240, height: 260, xBand: ["A", "B", "A∧B"], y: [0, 14], yLabel: "−log q", margin: { left: 40 } });
  const readout = div(el, "readout");

  function draw() {
    const a = q1.value, b = q2.value;
    P.y.domain([0, unit === "bits" ? 7 : 5]);
    P.drawAxes();
    curve.attr("d", d3.line().x(d => P.x(d)).y(d => P.y(-lg(d)))(linspace(0.008, 1, 200)));
    dots.selectAll("circle").data([[a, COLOR.p], [b, COLOR.q]]).join("circle")
      .attr("cx", d => P.x(d[0])).attr("cy", d => P.y(-lg(d[0]))).attr("r", 6).style("fill", d => d[1]);

    const sa = -lg(a), sb = -lg(b);
    B.y.domain([0, unit === "bits" ? 14 : 10]);
    B.drawAxes();
    const segs = [
      { k: "A", y0: 0, y1: sa, c: COLOR.p }, { k: "B", y0: 0, y1: sb, c: COLOR.q },
      { k: "A∧B", y0: 0, y1: sa, c: COLOR.p }, { k: "A∧B", y0: sa, y1: sa + sb, c: COLOR.q },
    ];
    B.g.selectAll("rect").data(segs).join("rect")
      .attr("x", d => B.x(d.k)).attr("width", B.x.bandwidth())
      .attr("y", d => B.y(d.y1)).attr("height", d => B.y(d.y0) - B.y(d.y1)).style("fill", d => d.c);

    readout.innerHTML =
      tex(`-\\log q(A)=${fmt(sa)},\\quad -\\log q(B)=${fmt(sb)},\\quad -\\log\\big(q(A)\\,q(B)\\big)=${fmt(-lg(a * b))}`) + "<br>" +
      L("For independent events, probabilities multiply, so surprises <b>add</b>. The log is the only (smooth) function that turns products into sums. A certain event (q = 1) gives zero surprise, and an impossible-looking one gives a huge surprise.",
        "独立な事象では確率が掛け算になるので、驚きは<b>足し算</b>になります。積を和に変える（なめらかな）関数は log だけです。確実な事象（q = 1）の驚きは0、ありえなさそうな事象の驚きは巨大になります。");
  }
  draw();
}
