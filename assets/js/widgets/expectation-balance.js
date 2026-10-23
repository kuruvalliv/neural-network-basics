import { d3, L, div, plot, COLOR, tex } from "./_lib.js";
import { fmt, clamp } from "../math.js";

export default function mount(el) {
  const pts = [{ x: 2, w: 0.5 }, { x: 4, w: 0.8 }, { x: 5.5, w: 0.3 }, { x: 8, w: 0.6 }];

  div(el, "", `<p style="margin:0 0 .4rem">${L("Drag the dots left/right to move an outcome, up/down to change its weight.", "点を左右にドラッグすると結果の値が、上下にドラッグすると重みが変わります。")}</p>`);
  const P = plot(el, { height: 320, x: [0, 10], y: [-0.35, 1], xLabel: "y", yLabel: "w" });
  const readout = div(el, "readout");

  const beamY = P.y(-0.15);
  const band = P.g.append("rect").style("fill", COLOR.q).style("opacity", 0.15);
  P.g.append("line").attr("x1", 0).attr("x2", P.W).attr("y1", beamY).attr("y2", beamY).style("stroke", COLOR.ink).style("stroke-width", 3);
  const fulcrum = P.g.append("path").style("fill", COLOR.q);
  const meanLbl = P.g.append("text").attr("text-anchor", "middle").style("font-weight", 600);
  const stems = P.g.append("g"), labels = P.g.append("g"), handles = P.g.append("g");

  const drag = d3.drag().on("drag", function (ev, d) {
    d.x = clamp(P.x.invert(ev.x), 0, 10);
    d.w = clamp(P.y.invert(ev.y), 0.02, 1);
    draw();
  });

  function draw() {
    const tot = d3.sum(pts, d => d.w);
    const prob = pts.map(d => d.w / tot);
    const mean = d3.sum(pts, (d, i) => prob[i] * d.x);
    const varr = d3.sum(pts, (d, i) => prob[i] * (d.x - mean) ** 2);
    const sd = Math.sqrt(varr);

    stems.selectAll("line").data(pts).join("line")
      .attr("x1", d => P.x(d.x)).attr("x2", d => P.x(d.x)).attr("y1", beamY).attr("y2", d => P.y(d.w))
      .style("stroke", COLOR.p).style("stroke-width", 4);
    labels.selectAll("text").data(pts).join("text")
      .attr("x", d => P.x(d.x)).attr("y", d => P.y(d.w) - 14).attr("text-anchor", "middle")
      .text((d, i) => `p=${fmt(prob[i])}`);
    handles.selectAll("circle").data(pts).join("circle").attr("class", "handle")
      .attr("cx", d => P.x(d.x)).attr("cy", d => P.y(d.w)).attr("r", 9)
      .style("fill", COLOR.p).style("stroke", "var(--panel)").style("stroke-width", 2).call(drag);

    const fx = P.x(mean);
    fulcrum.attr("d", `M${fx},${beamY + 2} l-12,22 l24,0 z`);
    meanLbl.attr("x", fx).attr("y", beamY + 40).text(`E[Y] = ${fmt(mean)}`);
    band.attr("x", P.x(Math.max(0, mean - sd))).attr("width", P.x(Math.min(10, mean + sd)) - P.x(Math.max(0, mean - sd)))
      .attr("y", 0).attr("height", beamY);

    readout.innerHTML =
      tex(`\\mathbb E[Y]=\\textstyle\\sum_k p_k\\,y_k=${fmt(mean)}`) + "&emsp;" +
      tex(`\\operatorname{Var}[Y]=\\textstyle\\sum_k p_k\\,(y_k-\\mathbb E[Y])^2=${fmt(varr)}`) + "<br>" +
      L("The triangle is where the beam balances. The orange band spans one standard deviation either side.",
        "三角形は棒がつり合う位置です。オレンジの帯は平均から左右に標準偏差1つ分の範囲です。");
  }
  draw();
}
