import { d3, L, div, choice, plot, legend, COLOR, tex } from "./_lib.js";
import { CLS } from "../running-example.js";
import { linspace, fmt, sigmoid, clamp } from "../math.js";

export default function mount(el) {
  const cur = { w: 3, b: -1 };
  let showLoss = false;
  const nll = (w, b) => d3.mean(CLS.data, d => {
    const q = Math.min(Math.max(sigmoid(w * d.x + b), 1e-9), 1 - 1e-9);
    return -Math.log2(d.y ? q : 1 - q);
  });

  const ctl = div(el, "controls");
  choice(ctl, {
    label: L("Background", "背景"),
    options: [{ value: "off", label: L("plain", "なし") }, { value: "on", label: L("loss on the 60 days", "60日分の損失") }],
    value: "off", onChange: v => { showLoss = v === "on"; heat.style("display", showLoss ? null : "none"); draw(); },
  });
  div(ctl, "", `<span style="color:var(--muted)">${L("Drag the orange point.", "オレンジの点をドラッグしてください。")}</span>`);

  const row = div(el, "row");
  const A = plot(div(row, ""), { width: 320, height: 300, x: [-5, 25], y: [-15, 5], xLabel: "w", yLabel: "b", xTicks: 6, yTicks: 4 });
  const F = plot(div(row, ""), { width: 340, height: 300, x: [0, 1], y: [-0.05, 1.05], xLabel: "h", yLabel: "q(rain | h)", yTicks: 4 });

  const G = 40, ws = linspace(-5, 25, G), bs = linspace(-15, 5, G);
  const cells = ws.flatMap(w => bs.map(b => ({ w, b, v: nll(w, b) })));
  const col = d3.scaleSequential(d3.interpolateMagma).domain([d3.max(cells, c => Math.min(c.v, 4)), d3.min(cells, c => c.v)]);
  const cw = A.x(ws[1]) - A.x(ws[0]), ch = A.y(bs[0]) - A.y(bs[1]);
  const heat = A.g.append("g").style("display", "none");
  heat.selectAll("rect").data(cells).join("rect")
    .attr("x", c => A.x(c.w) - cw / 2).attr("y", c => A.y(c.b) - ch / 2).attr("width", cw + 0.5).attr("height", ch + 0.5)
    .style("fill", c => col(Math.min(c.v, 4))).style("opacity", 0.75);
  A.g.append("text").attr("x", A.x(12)).attr("y", A.y(-7.2) + 6).attr("text-anchor", "middle").style("font-size", "20px").style("fill", COLOR.p).text("★");

  F.g.selectAll("circle").data(CLS.data).join("circle").attr("cx", d => F.x(d.x)).attr("cy", d => F.y(d.y)).attr("r", 3).style("fill", COLOR.data).style("opacity", 0.6);
  const hs = linspace(0, 1, 120);
  F.g.append("path").attr("d", d3.line().x(h => F.x(h)).y(h => F.y(CLS.pRain(h)))(hs))
    .style("fill", "none").style("stroke", COLOR.p).style("stroke-width", 2).style("stroke-dasharray", "6 4");
  const curve = F.g.append("path").style("fill", "none").style("stroke", COLOR.q).style("stroke-width", 3);
  const pt = A.g.append("circle").attr("class", "handle").attr("r", 9).style("fill", COLOR.q).style("stroke", "var(--panel)").style("stroke-width", 2);
  legend(el, [[COLOR.p, L("★ / dashed: the true θ* = (12, −7.2)", "★ と破線：真の θ* = (12, −7.2)"), true], [COLOR.q, L("your θ and the q_θ it names", "あなたの θ と、それが名指す q_θ")]]);
  const readout = div(el, "readout");

  pt.call(d3.drag().on("drag", ev => {
    cur.w = clamp(A.x.invert(ev.x), -5, 25);
    cur.b = clamp(A.y.invert(ev.y), -15, 5);
    draw();
  }));

  function draw() {
    pt.attr("cx", A.x(cur.w)).attr("cy", A.y(cur.b));
    curve.attr("d", d3.line().x(h => F.x(h)).y(h => F.y(sigmoid(cur.w * h + cur.b)))(hs));
    const mid = cur.w !== 0 ? -cur.b / cur.w : NaN;
    readout.innerHTML = tex(`\\theta=(${fmt(cur.w, 1)},\\,${fmt(cur.b, 1)})\\;\\mapsto\\;q_\\theta(\\text{rain}\\mid h)=\\sigma(${fmt(cur.w, 1)}h ${cur.b < 0 ? "-" : "+"} ${fmt(Math.abs(cur.b), 1)})`) +
      `&emsp;${L("avg loss", "平均損失")} = <b>${fmt(nll(cur.w, cur.b), 3)}</b> bit<br>` +
      L(`w sets how <b>steep</b> the switch from dry to rain is; −b/w${Number.isFinite(mid) ? ` = ${fmt(mid)}` : ""} sets <b>where</b> it happens. Turn on the loss background: the bright valley is a long diagonal ridge, because many (w, b) give nearly the same curve over the data range.`,
        `w は晴れから雨への切り替わりの<b>急さ</b>を、−b/w${Number.isFinite(mid) ? ` = ${fmt(mid)}` : ""} は切り替わる<b>位置</b>を決めます。損失の背景を表示してみましょう。明るい谷は斜めに長く伸びています。データの範囲では、多くの (w, b) がほぼ同じ曲線を与えるからです。`);
  }
  draw();
}
