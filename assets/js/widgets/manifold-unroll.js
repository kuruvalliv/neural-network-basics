import { d3, L, div, slider, plot, COLOR } from "./_lib.js";
import { rng, randn, fmt } from "../math.js";

export default function mount(el) {
  const r = rng(13);
  const curved = s => {
    const th = 3 * Math.PI * s, rad = 0.35 + 1.25 * s;
    return [rad * Math.cos(th), rad * Math.sin(th)];
  };
  const pts = Array.from({ length: 220 }, () => {
    const s = r(), n = 0.06 * randn(r);
    const [cx, cy] = curved(s);
    const rad = Math.hypot(cx, cy) || 1;
    return { s, c: [cx + (n * cx) / rad, cy + (n * cy) / rad], u: [-1.8 + 3.6 * s, n * 1.5] };
  });
  const A = { s: 0.2 }, B = { s: 0.2 + 2 / 3 };
  [A, B].forEach(p => { p.c = curved(p.s); p.u = [-1.8 + 3.6 * p.s, 0]; });

  const ctl = div(el, "controls");
  const ts = slider(ctl, { label: L("unroll", "広げる"), min: 0, max: 1, step: 0.01, value: 0, onInput: draw });
  const P = plot(el, { height: 360, x: [-2, 2], y: [-2, 2], xLabel: "x₁", yLabel: "x₂", xTicks: 5, yTicks: 5 });
  const color = d3.scaleSequential(d3.interpolateViridis).domain([0, 1]);
  const dots = P.g.selectAll("circle.p").data(pts).join("circle").attr("class", "p").attr("r", 3.5).style("fill", d => color(d.s));
  const link = P.g.append("line").style("stroke", COLOR.loss).style("stroke-width", 2).style("stroke-dasharray", "4 3");
  const marks = P.g.selectAll("circle.m").data([A, B]).join("circle").attr("class", "m").attr("r", 8)
    .style("fill", "none").style("stroke", COLOR.loss).style("stroke-width", 3);
  const readout = div(el, "readout");

  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

  function draw() {
    const t = ts.value;
    dots.attr("cx", d => P.x(lerp(d.c, d.u, t)[0])).attr("cy", d => P.y(lerp(d.c, d.u, t)[1]));
    const [a, b] = [A, B].map(p => lerp(p.c, p.u, t));
    marks.data([a, b]).attr("cx", d => P.x(d[0])).attr("cy", d => P.y(d[1]));
    link.attr("x1", P.x(a[0])).attr("y1", P.y(a[1])).attr("x2", P.x(b[0])).attr("y2", P.y(b[1]));
    const dist = Math.hypot(a[0] - b[0], a[1] - b[1]);
    readout.innerHTML = L(
      `Every point is described by two numbers (x₁, x₂), yet its color depends on just <b>one</b> number: how far along the strip it sits. The two red-circled points are ${fmt(dist)} apart in the plane. ${t < 0.5 ? "They look close, but along the strip they are far apart. Slide “unroll” to see." : "Unrolled, the hidden 1-D coordinate is visible, and so is how far apart they really are."}`,
      `どの点も2つの数 (x₁, x₂) で表されますが、色はたった<b>1つ</b>の数、つまり帯に沿ってどこまで進んだかだけで決まります。赤丸の2点の平面上の距離は ${fmt(dist)} です。${t < 0.5 ? "近く見えますが、帯に沿うと遠く離れています。「広げる」を動かしてみましょう。" : "広げると、隠れていた1次元の座標と、2点が本当はどれだけ離れているかが見えます。"}`);
  }
  draw();
}
