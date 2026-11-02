import { d3, L, div, slider, plot, legend, COLOR, tex } from "./_lib.js";
import { linspace, fmt } from "../math.js";

export default function mount(el) {
  const ctl = div(el, "controls");
  const ts = slider(ctl, { label: "t", min: 0.05, max: 3, step: 0.01, value: 0.4, onInput: draw });
  const ctl2 = div(el, "controls");
  const ps = slider(ctl2, { label: L("truth p(☂)", "真実 p(☂)"), min: 0.05, max: 0.95, step: 0.01, value: 0.7, onInput: draw });
  const qs = slider(ctl2, { label: L("belief q(☂)", "信念 q(☂)"), min: 0.05, max: 0.95, step: 0.01, value: 0.4, onInput: draw });

  const P = plot(el, { height: 320, x: [0, 3], y: [-3, 2.2], xLabel: "t", yLabel: "" });
  const xs = linspace(0.05, 3, 300);
  P.g.append("path").attr("d", d3.line().x(t => P.x(t)).y(t => P.y(Math.log(t)))(xs)).style("fill", "none").style("stroke", COLOR.p).style("stroke-width", 3);
  P.g.append("path").attr("d", d3.line().x(t => P.x(t)).y(t => P.y(t - 1))([0, 3])).style("fill", "none").style("stroke", COLOR.q).style("stroke-width", 2.5);
  P.g.append("circle").attr("cx", P.x(1)).attr("cy", P.y(0)).attr("r", 5).style("fill", COLOR.ink);
  const gap = P.g.append("line").style("stroke", COLOR.loss).style("stroke-width", 4);
  const kl = P.g.append("g");
  legend(el, [[COLOR.p, "ln t"], [COLOR.q, "t − 1"], [COLOR.loss, L("gap (t − 1) − ln t ≥ 0", "すきま (t − 1) − ln t ≥ 0")]]);
  const readout = div(el, "readout");

  function draw() {
    const t = ts.value, p = ps.value, q = qs.value;
    gap.attr("x1", P.x(t)).attr("x2", P.x(t)).attr("y1", P.y(Math.log(t))).attr("y2", P.y(t - 1));
    const pts = [{ t: q / p, w: p, k: "☂" }, { t: (1 - q) / (1 - p), w: 1 - p, k: "☀" }];
    kl.selectAll("text").data(pts).join("text").attr("x", d => P.x(Math.min(2.95, d.t))).attr("y", d => P.y(Math.log(d.t)) - 10)
      .attr("text-anchor", "middle").style("font-size", "16px").text(d => d.k);
    kl.selectAll("circle").data(pts).join("circle").attr("cx", d => P.x(Math.min(2.95, d.t))).attr("cy", d => P.y(Math.log(d.t))).attr("r", 6).style("fill", COLOR.accent);
    const lhs = p * Math.log(q / p) + (1 - p) * Math.log((1 - q) / (1 - p));
    const rhs = p * (q / p - 1) + (1 - p) * ((1 - q) / (1 - p) - 1);
    readout.innerHTML =
      tex(`\\ln(${fmt(t)})=${fmt(Math.log(t), 3)}\\;\\le\\;${fmt(t)}-1=${fmt(t - 1, 3)}`) + "<br>" +
      L("Every point of the blue curve lies below the orange line, and they touch only at t = 1. The two purple dots are the ratios t = q(y)/p(y) for rain and dry. Weighting them by p(y):",
        "青い曲線のどの点もオレンジの直線より下にあり、両者が接するのは t = 1 だけです。2つの紫の点は、雨と晴れの比 t = q(y)/p(y) です。それぞれを p(y) で重み付けすると：") + "<br>" +
      tex(`\\underbrace{\\textstyle\\sum_y p\\ln\\tfrac{q}{p}}_{=-D_{KL}\\,(\\text{nats})}=${fmt(lhs, 4)}\\;\\le\\;\\underbrace{\\textstyle\\sum_y p\\big(\\tfrac{q}{p}-1\\big)}_{=\\,1-1}=${fmt(Math.abs(rhs) < 1e-12 ? 0 : rhs, 4)}`);
  }
  draw();
}
