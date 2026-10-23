import { d3, L, div, button, plot, COLOR, tex, piFormat } from "./_lib.js";
import { REG } from "../running-example.js";
import { linspace, fmt, clamp } from "../math.js";

const PIN_COLORS = d3.schemeTableau10;

export default function mount(el) {
  const cur = { a: 0.5, b: 0.3 };
  let pins = [];

  const ctl = div(el, "controls");
  button(ctl, L("Pin this function", "この関数をピン留め"), () => { pins.push({ ...cur }); draw(); });
  button(ctl, L("Clear pins", "ピンを消す"), () => { pins = []; draw(); });
  div(ctl, "", `<span style="color:var(--muted)">${L("Drag the orange point.", "オレンジの点をドラッグしてください。")}</span>`);

  const row = div(el, "row");
  const A = plot(div(row, ""), { width: 300, height: 300, x: [-2, 2], y: [-1.5, 1.5], xLabel: "a", yLabel: "b", xTicks: 4, yTicks: 4 });
  const F = plot(div(row, ""), { width: 380, height: 300, x: [0, 2 * Math.PI], y: [-2.5, 2.5], xLabel: "x", yLabel: "f(x)", xFormat: piFormat, xTicks: 4 });
  F.g.selectAll("circle.d").data(REG.data).join("circle").attr("class", "d")
    .attr("cx", d => F.x(d.x)).attr("cy", d => F.y(d.y)).attr("r", 3).style("fill", COLOR.data).style("opacity", 0.6);
  const pinG = A.g.append("g"), pinF = F.g.append("g");
  const curve = F.g.append("path").style("fill", "none").style("stroke", COLOR.q).style("stroke-width", 3);
  const pt = A.g.append("circle").attr("class", "handle").attr("r", 9).style("fill", COLOR.q).style("stroke", "var(--panel)").style("stroke-width", 2);
  const readout = div(el, "readout");

  pt.call(d3.drag().on("drag", ev => {
    cur.a = clamp(A.x.invert(ev.x), -2, 2);
    cur.b = clamp(A.y.invert(ev.y), -1.5, 1.5);
    draw();
  }));

  const xs = linspace(0, 2 * Math.PI, 120);
  const path = p => d3.line().x(x => F.x(x)).y(x => F.y(p.a * Math.sin(x) + p.b))(xs);

  function draw() {
    pinG.selectAll("circle").data(pins).join("circle").attr("cx", d => A.x(d.a)).attr("cy", d => A.y(d.b)).attr("r", 6)
      .style("fill", (_, i) => PIN_COLORS[i % 10]);
    pinF.selectAll("path").data(pins).join("path").attr("d", path).style("fill", "none")
      .style("stroke", (_, i) => PIN_COLORS[i % 10]).style("stroke-width", 1.5).style("opacity", 0.8);
    pt.attr("cx", A.x(cur.a)).attr("cy", A.y(cur.b));
    curve.attr("d", path(cur));
    readout.innerHTML = tex(`f_{(a,b)}(x)=${fmt(cur.a)}\\,\\sin x ${cur.b < 0 ? "-" : "+"} ${fmt(Math.abs(cur.b))}`) + "<br>" +
      L("Every point on the left <em>is</em> a whole curve on the right. Pin a few and watch: points close together give similar curves. The family {a sin x + b} is a 2-D sheet inside the huge space of all functions.",
        "左の1点が、右の曲線まるごと1本<em>そのもの</em>です。いくつかピン留めしてみましょう。近い点どうしは似た曲線になります。関数族 {a sin x + b} は、あらゆる関数がなす巨大な空間の中にある2次元の面です。");
  }
  draw();
}
