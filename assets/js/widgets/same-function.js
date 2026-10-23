import { d3, L, div, plot, COLOR, tex } from "./_lib.js";
import { linspace, fmt, clamp } from "../math.js";

export default function mount(el) {
  const cur = { a: 1.5, b: 0.8 };
  div(el, "", `<p style="margin:0 0 .4rem">${L("Model: f(x) = a · b · x. Drag the point; the highlighted curve shows every (a, b) giving the <em>same</em> function.", "モデル：f(x) = a · b · x。点をドラッグしてください。強調された曲線上の (a, b) は、どれも<em>同じ</em>関数を与えます。")}</p>`);

  const row = div(el, "row");
  const A = plot(div(row, ""), { width: 320, height: 300, x: [-2.5, 2.5], y: [-2.5, 2.5], xLabel: "a", yLabel: "b", xTicks: 5, yTicks: 5 });
  const F = plot(div(row, ""), { width: 320, height: 300, x: [-1, 1], y: [-3, 3], xLabel: "x", yLabel: "f(x)", xTicks: 4 });
  const hyper = A.g.append("g");
  const fLine = F.g.append("path").style("stroke", COLOR.q).style("stroke-width", 3).style("fill", "none");
  const pt = A.g.append("circle").attr("class", "handle").attr("r", 9).style("fill", COLOR.q).style("stroke", "var(--panel)").style("stroke-width", 2);
  const readout = div(el, "readout");

  pt.call(d3.drag().on("drag", ev => {
    cur.a = clamp(A.x.invert(ev.x), -2.5, 2.5);
    cur.b = clamp(A.y.invert(ev.y), -2.5, 2.5);
    draw();
  }));

  function draw() {
    const c = cur.a * cur.b;
    hyper.selectAll("*").remove();
    const branch = sign => linspace(0.05, 2.5, 120).map(t => sign * t).map(a => [a, c / a]).filter(d => Math.abs(d[1]) <= 2.5);
    [1, -1].forEach(sg => {
      const pts = branch(sg);
      if (pts.length > 1) hyper.append("path").attr("d", d3.line().x(d => A.x(d[0])).y(d => A.y(d[1]))(pts))
        .style("fill", "none").style("stroke", COLOR.q).style("stroke-width", 2).style("opacity", 0.5);
    });
    pt.attr("cx", A.x(cur.a)).attr("cy", A.y(cur.b));
    fLine.attr("d", d3.line().x(d => F.x(d)).y(d => F.y(c * d))([-1, 1]));
    readout.innerHTML = tex(`a\\cdot b=${fmt(c)}`) + "&emsp;" +
      L("Many parameter settings, one function. Parameters are <em>names</em> for functions, and a function can have many names. This will matter when we search (Chapter 9).",
        "多くのパラメータの設定が、1つの関数に対応しています。パラメータは関数の<em>名前</em>であり、1つの関数が多くの名前を持つことがあります。これは探索のときに重要になります（第9章）。");
  }
  draw();
}
