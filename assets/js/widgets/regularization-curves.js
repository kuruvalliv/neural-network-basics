import { d3, L, div, choice, plot, legend, COLOR } from "./_lib.js";
import { fmt } from "../math.js";

const LAMBDAS = ["0.0", "0.001", "0.01", "0.05"];

export default async function mount(el) {
  const data = await (await fetch(new URL("../../../data/regularization.json", import.meta.url))).json();
  let lam = "0.0";
  const n = data.runs[lam].train.length, every = data.every;

  choice(div(el, "controls"), {
    label: L("weight decay λ", "重み減衰 λ"), value: lam,
    options: LAMBDAS.map(v => ({ value: v, label: v === "0.0" ? "0" : v })),
    onChange: v => { lam = v; draw(); },
  });
  const P = plot(el, { height: 300, x: [0, (n - 1) * every], y: [0, 1.6], xLabel: "step", yLabel: "bits", xTicks: 6 });
  const ghosts = P.g.append("g");
  const gapArea = P.g.append("path").style("fill", COLOR.loss).style("opacity", 0.1);
  const train = P.g.append("path").style("fill", "none").style("stroke", COLOR.data).style("stroke-width", 2.5);
  const test = P.g.append("path").style("fill", "none").style("stroke", COLOR.loss).style("stroke-width", 2.5);
  const stop = P.g.append("g");
  legend(el, [[COLOR.data, L("training loss", "訓練損失")], [COLOR.loss, L("loss on new days", "新しい日での損失")], [COLOR.ok, L("early-stopping point", "早期終了の点")]]);
  const readout = div(el, "readout");

  const line = arr => d3.line().x((_, i) => P.x(i * every)).y(v => P.y(Math.min(1.6, v)))(arr);

  function draw() {
    const run = data.runs[lam];
    ghosts.selectAll("path").data(LAMBDAS.filter(l => l !== lam)).join("path").attr("d", l => line(data.runs[l].test))
      .style("fill", "none").style("stroke", COLOR.loss).style("opacity", 0.15);
    train.attr("d", line(run.train));
    test.attr("d", line(run.test));
    gapArea.attr("d", d3.area().x((_, i) => P.x(i * every)).y0((_, i) => P.y(Math.min(1.6, run.train[i]))).y1(v => P.y(Math.min(1.6, v)))(run.test));
    const best = d3.minIndex(run.test);
    stop.selectAll("*").remove();
    stop.append("line").attr("x1", P.x(best * every)).attr("x2", P.x(best * every)).attr("y1", 0).attr("y2", P.H).style("stroke", COLOR.ok).style("stroke-dasharray", "5 4");
    stop.append("circle").attr("cx", P.x(best * every)).attr("cy", P.y(run.test[best])).attr("r", 6).style("fill", COLOR.ok);
    const gap = run.test.at(-1) - run.train.at(-1);
    readout.innerHTML = L(
      `λ = ${lam}. At the end: train ${fmt(run.train.at(-1))}, new days ${fmt(run.test.at(-1))}, so the <b>generalization gap</b> (shaded) is ${fmt(gap)} bits. The best new-day loss, ${fmt(run.test[best])}, comes at step ${best * every}. ${lam === "0.0" ? "Without regularization the network memorizes the 60 days and its new-day loss explodes. Stopping early would have saved it." : "Weight decay keeps the weights small, which keeps the function simple, so the gap stays small even after long training."}`,
      `λ = ${lam}。最後の時点で訓練 ${fmt(run.train.at(-1))}、新しい日 ${fmt(run.test.at(-1))} なので、<b>汎化ギャップ</b>（塗られた部分）は ${fmt(gap)} ビットです。新しい日での最良の損失 ${fmt(run.test[best])} は、ステップ ${best * every} で得られます。${lam === "0.0" ? "正則化がないと、ネットワークは60日分を記憶してしまい、新しい日での損失が爆発します。早めに止めていれば助かったはずです。" : "重み減衰は重みを小さく保つことで関数を単純に保つので、長く学習してもギャップは小さいままです。"}`);
  }
  draw();
}
