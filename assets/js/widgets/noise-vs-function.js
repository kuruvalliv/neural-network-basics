import { d3, L, div, slider, plot, COLOR, piFormat } from "./_lib.js";
import { linspace, fmt, rng, randn } from "../math.js";

export default function mount(el) {
  const r = rng(21);
  const base = Array.from({ length: 300 }, () => ({ x: r() * 2 * Math.PI, e: randn(r) }));

  const ctl = div(el, "controls");
  const ns = slider(ctl, { label: L("noise σ", "ノイズ σ"), min: 0, max: 1, step: 0.01, value: 0.3, onInput: draw });
  const xs = slider(ctl, { label: L("look at x ≈", "注目する x ≈"), min: 0.3, max: 2 * Math.PI - 0.3, step: 0.01, value: 1.6, onInput: draw });

  const row = div(el, "row");
  const mainBox = div(row, "");
  mainBox.style.flex = "2 1 340px";
  const M = plot(mainBox, { width: 440, height: 300, x: [0, 2 * Math.PI], y: [-3, 3], xLabel: "x", yLabel: "y", xFormat: piFormat, xTicks: 4 });
  const win = M.g.append("rect").style("fill", COLOR.accent).style("opacity", 0.1);
  const pts = M.g.append("g");
  M.g.append("path").attr("d", d3.line().x(x => M.x(x)).y(x => M.y(Math.sin(x)))(linspace(0, 2 * Math.PI, 120)))
    .style("fill", "none").style("stroke", COLOR.q).style("stroke-width", 2.5);
  const S = plot(div(row, ""), { width: 240, height: 300, x: [0, 1], y: [-3, 3], xLabel: "#", yLabel: "y", xTicks: 3 });
  const readout = div(el, "readout");

  function draw() {
    const s = ns.value, x0 = xs.value, half = 0.3;
    const data = base.map(d => ({ x: d.x, y: Math.sin(d.x) + s * d.e }));
    const inWin = data.filter(d => Math.abs(d.x - x0) < half);
    win.attr("x", M.x(x0 - half)).attr("width", M.x(2 * half) - M.x(0)).attr("y", 0).attr("height", M.H);
    pts.selectAll("circle").data(data).join("circle").attr("cx", d => M.x(d.x)).attr("cy", d => M.y(d.y)).attr("r", 2.5)
      .style("fill", d => (Math.abs(d.x - x0) < half ? COLOR.accent : COLOR.data)).style("opacity", 0.7);

    const bins = d3.bin().domain([-3, 3]).thresholds(d3.range(-3, 3.01, 0.25))(inWin.map(d => d.y));
    const mx = d3.max(bins, b => b.length) || 1;
    S.x.domain([0, mx]);
    S.drawAxes();
    S.g.selectAll("rect").data(bins).join("rect").attr("x", 0).attr("width", b => S.x(b.length))
      .attr("y", b => S.y(b.x1)).attr("height", b => Math.max(0, S.y(b.x0) - S.y(b.x1) - 1)).style("fill", COLOR.accent).style("opacity", 0.7);

    const spread = inWin.length > 1 ? d3.deviation(inWin, d => d.y) : 0;
    readout.innerHTML = L(`${inWin.length} points share almost the same x, but their y values spread with standard deviation ${fmt(spread)}. ${s < 0.02 ? "With no noise, a single curve y = f(x) is a complete answer." : "No single curve can pass through all of them, so the honest answer at this x is a <b>distribution</b> (right)."}`,
      `${inWin.length}個の点の x はほぼ同じなのに、y は標準偏差 ${fmt(spread)} で散らばっています。${s < 0.02 ? "ノイズがなければ、1本の曲線 y = f(x) で完全に答えられます。" : "1本の曲線ですべての点を通ることはできないので、この x での正直な答えは<b>分布</b>（右）になります。"}`);
  }
  draw();
}
