import { d3, L, div, slider, plot, legend, COLOR, tex, piFormat } from "./_lib.js";
import { REG } from "../running-example.js";
import { linspace, fmt } from "../math.js";

export default function mount(el) {
  const ctl = div(el, "controls");
  const as = slider(ctl, { label: L("amplitude a", "振幅 a"), min: 0, max: 2, step: 0.01, value: 0.4, onInput: draw });
  const ss = slider(ctl, { label: L("assumed noise σ", "仮定するノイズ σ"), min: 0.1, max: 1, step: 0.01, value: 0.3, onInput: draw });

  const row = div(el, "row");
  const left = div(row, ""), right = div(row, "");
  const D = plot(left, { width: 340, height: 300, x: [0, 2 * Math.PI], y: [-2, 2], xLabel: "x", yLabel: "y", xFormat: piFormat, xTicks: 4 });
  D.g.selectAll("circle").data(REG.data).join("circle").attr("cx", d => D.x(d.x)).attr("cy", d => D.y(d.y)).attr("r", 3.5).style("fill", COLOR.data);
  const band = D.g.append("path").style("fill", COLOR.q).style("opacity", 0.18);
  const fit = D.g.append("path").style("fill", "none").style("stroke", COLOR.q).style("stroke-width", 2.5);
  const resid = D.g.append("g");

  const M = plot(right, { width: 300, height: 140, x: [0, 2], y: [0, 1], yLabel: "MSE", xTicks: 4, yTicks: 3, margin: { bottom: 24 } });
  const N = plot(right, { width: 300, height: 160, x: [0, 2], y: [0, 1], xLabel: "a", yLabel: "NLL", xTicks: 4, yTicks: 3 });
  const curves = [M, N].map((P, i) => ({
    path: P.g.append("path").style("fill", "none").style("stroke", i ? COLOR.loss : COLOR.ink).style("stroke-width", 2.5),
    vline: P.g.append("line").style("stroke", COLOR.p).style("stroke-dasharray", "5 4"),
    dot: P.g.append("circle").attr("r", 5).style("fill", COLOR.q),
  }));
  legend(right, [[COLOR.p, L("best a", "最適な a"), true]]);
  const readout = div(el, "readout");

  const sx = REG.data.map(d => Math.sin(d.x));
  const mse = a => d3.mean(REG.data, (d, i) => (d.y - a * sx[i]) ** 2);
  const nll = (a, s) => mse(a) / (2 * s * s) + Math.log(s * Math.sqrt(2 * Math.PI));
  const aStar = d3.sum(REG.data, (d, i) => d.y * sx[i]) / d3.sum(sx, v => v * v);

  function draw() {
    const a = as.value, s = ss.value;
    const xs = linspace(0, 2 * Math.PI, 120);
    fit.attr("d", d3.line().x(x => D.x(x)).y(x => D.y(a * Math.sin(x)))(xs));
    band.attr("d", d3.area().x(x => D.x(x)).y0(x => D.y(a * Math.sin(x) - s)).y1(x => D.y(a * Math.sin(x) + s))(xs));
    resid.selectAll("line").data(REG.data).join("line")
      .attr("x1", d => D.x(d.x)).attr("x2", d => D.x(d.x)).attr("y1", d => D.y(d.y)).attr("y2", d => D.y(a * Math.sin(d.x)))
      .style("stroke", COLOR.loss).style("opacity", 0.5);

    const as_ = linspace(0, 2, 100);
    [[M, a2 => mse(a2)], [N, a2 => nll(a2, s)]].forEach(([P, f], i) => {
      const ys = as_.map(f);
      P.y.domain([Math.min(0, d3.min(ys)), d3.max(ys) * 1.05]);
      P.drawAxes();
      curves[i].path.attr("d", d3.line().x((_, j) => P.x(as_[j])).y(v => P.y(v))(ys));
      curves[i].vline.attr("x1", P.x(aStar)).attr("x2", P.x(aStar)).attr("y1", 0).attr("y2", P.H);
      curves[i].dot.attr("cx", P.x(a)).attr("cy", P.y(f(a)));
    });

    readout.innerHTML =
      tex(`-\\log \\mathcal N(y\\mid a\\sin x,\\sigma^2)=\\frac{(y-a\\sin x)^2}{2\\sigma^2}+\\log\\big(\\sigma\\sqrt{2\\pi}\\big)`, true) +
      L(`MSE = ${fmt(mse(a), 3)}, Gaussian NLL = ${fmt(nll(a, s), 3)} nats. Change σ: the NLL curve stretches and shifts, but its lowest point stays at a = ${fmt(aStar)}. <b>Minimizing squared error is maximum likelihood under Gaussian noise.</b>`,
        `MSE = ${fmt(mse(a), 3)}、ガウスの負の対数尤度 = ${fmt(nll(a, s), 3)} ナット。σ を変えると NLL の曲線は伸び縮みしたり上下に動いたりしますが、最低点は a = ${fmt(aStar)} のままです。<b>二乗誤差の最小化は、ガウスノイズを仮定したときの最尤推定と同じです。</b>`);
  }
  draw();
}
