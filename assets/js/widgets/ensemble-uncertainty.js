import { d3, L, div, choice, plot, legend, COLOR, piFormat } from "./_lib.js";
import { REG } from "../running-example.js";
import { linspace, lstsq, rng, fmt } from "../math.js";

const DEG = 6;
const toT = x => x / Math.PI - 1;
const cheb = t => { const T = [1, t]; for (let k = 2; k <= DEG; k++) T.push(2 * t * T[k - 1] - T[k - 2]); return T; };

export default function mount(el) {
  let gap = true;
  choice(div(el, "controls"), {
    label: L("Training data", "訓練データ"), value: "gap",
    options: [{ value: "gap", label: L("with a gap", "すきまあり") }, { value: "full", label: L("full", "すべて") }],
    onChange: v => { gap = v === "gap"; draw(); },
  });
  const P = plot(el, { height: 320, x: [0, 2 * Math.PI], y: [-2.5, 2.5], xLabel: "x", yLabel: "y", xFormat: piFormat });
  const shade = P.g.append("rect").style("fill", COLOR.grid);
  const alea = P.g.append("path").style("fill", COLOR.p).style("opacity", 0.12);
  const members = P.g.append("g");
  const mean = P.g.append("path").style("fill", "none").style("stroke", COLOR.q).style("stroke-width", 3);
  const dots = P.g.append("g");
  legend(el, [[COLOR.q, L("ensemble mean", "アンサンブルの平均")], [COLOR.accent, L("10 ensemble members (epistemic spread)", "アンサンブルの10メンバー（認識的なばらつき）")], [COLOR.p, L("± noise σ (aleatoric)", "± ノイズ σ（偶然的）")]]);
  const readout = div(el, "readout");
  const grid = linspace(0, 2 * Math.PI, 200);
  const lo = 2.0, hi = 4.4;

  function draw() {
    const data = REG.data.filter(d => !gap || d.x < lo || d.x > hi);
    shade.style("display", gap ? null : "none").attr("x", P.x(lo)).attr("width", P.x(hi) - P.x(lo)).attr("y", 0).attr("height", P.H);
    const r = rng(17);
    const fits = d3.range(10).map(() => {
      const boot = data.map(() => data[Math.floor(r() * data.length)]);
      return lstsq(boot.map(d => cheb(toT(d.x))), boot.map(d => d.y), 1e-6);
    });
    const pred = (w, x) => d3.sum(cheb(toT(x)), (v, i) => v * w[i]);
    const clip = v => Math.max(-2.5, Math.min(2.5, v));
    members.selectAll("path").data(fits).join("path").attr("d", w => d3.line().x(x => P.x(x)).y(x => P.y(clip(pred(w, x))))(grid))
      .style("fill", "none").style("stroke", COLOR.accent).style("opacity", 0.45);
    const m = x => d3.mean(fits, w => pred(w, x));
    const sigma = Math.sqrt(d3.mean(data, d => (d.y - m(d.x)) ** 2));
    mean.attr("d", d3.line().x(x => P.x(x)).y(x => P.y(clip(m(x))))(grid));
    alea.attr("d", d3.area().x(x => P.x(x)).y0(x => P.y(clip(m(x) - sigma))).y1(x => P.y(clip(m(x) + sigma)))(grid));
    dots.selectAll("circle").data(data).join("circle").attr("cx", d => P.x(d.x)).attr("cy", d => P.y(d.y)).attr("r", 3.5).style("fill", COLOR.data);
    const spread = xs => d3.mean(xs, x => d3.deviation(fits, w => pred(w, x)));
    const inGap = spread(grid.filter(x => x > lo && x < hi)), outGap = spread(grid.filter(x => (x > 0.6 && x < lo) || (x > hi && x < 2 * Math.PI - 0.6)));
    readout.innerHTML = L(
      `Ensemble disagreement: ${fmt(inGap, 2)} inside the shaded region vs ${fmt(outGap, 2)} where data is dense. Estimated noise σ = ${fmt(sigma, 2)}. Two different uncertainties. <b>Aleatoric</b> (blue band) is the world's own randomness, the same everywhere, and more data can't shrink it. <b>Epistemic</b> (spread of the purple curves) is the model's ignorance. It balloons where there is no data, including beyond the edges${gap ? "" : ", and it shrinks once the gap is filled"}.`,
      `アンサンブルの意見の食い違い：塗られた領域の内側で ${fmt(inGap, 2)}、データが密な場所で ${fmt(outGap, 2)}。推定したノイズ σ = ${fmt(sigma, 2)}。ここには2種類の不確実性があります。<b>偶然的</b>不確実性（青い帯）は世界そのもののランダムさで、どこでも同じであり、データを増やしても縮みません。<b>認識的</b>不確実性（紫の曲線のばらつき）はモデルの無知で、データのない場所（両端の外側も含む）で大きく膨らみます${gap ? "" : "。すきまが埋まると縮みます"}。`);
  }
  draw();
}
