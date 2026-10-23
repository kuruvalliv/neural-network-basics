import { d3, L, div, slider, choice, button, plot, legend, COLOR } from "./_lib.js";
import { SURFACES, drawContours } from "./_surface.js";
import { fmt } from "../math.js";

export default async function mount(el) {
  const data = await (await fetch(new URL("../../../data/evolution.json", import.meta.url))).json();
  let method = "ga", timer = null;
  const G = data.ga.length;

  const ctl = div(el, "controls");
  choice(ctl, {
    label: L("Method", "手法"), value: method,
    options: [{ value: "ga", label: L("genetic algorithm", "遺伝的アルゴリズム") }, { value: "es", label: L("evolution strategy", "進化戦略") }],
    onChange: v => { method = v; draw(); },
  });
  const gs = slider(ctl, { label: L("generation", "世代"), min: 0, max: G - 1, step: 1, value: 0, format: v => v, onInput: draw });
  button(ctl, L("▶ Play", "▶ 再生"), () => {
    timer?.stop();
    const t0 = performance.now();
    timer = d3.timer(() => { const k = Math.min(G - 1, Math.floor((performance.now() - t0) / 350)); gs.set(k); if (k >= G - 1) timer.stop(); });
  });

  const S = SURFACES.rain;
  const P = plot(el, { width: 460, height: 380, x: S.dom[0], y: S.dom[1], xLabel: "w", yLabel: "b" });
  drawContours(P, S.f, S.dom);
  P.g.append("text").attr("x", P.x(12)).attr("y", P.y(-7.2) + 6).attr("text-anchor", "middle").style("font-size", "18px").style("fill", "#fff").text("★");
  const ell = P.g.append("ellipse").style("fill", "none").style("stroke", "#fff").style("stroke-dasharray", "4 3");
  const dots = P.g.append("g");
  const meanDot = P.g.append("circle").attr("r", 7).style("fill", COLOR.loss).style("stroke", "#fff");
  legend(el, [["#fff", L("population (each dot = one candidate θ)", "集団（各点が θ の候補1つ）")], [COLOR.loss, L("ES search distribution mean", "ES の探索分布の平均")]]);
  const readout = div(el, "readout");

  function draw() {
    const gen = data[method][gs.value];
    dots.selectAll("circle").data(gen.pop).join("circle").attr("cx", p => P.x(p[0])).attr("cy", p => P.y(p[1])).attr("r", 4)
      .style("fill", "#fff").style("stroke", "#000").style("stroke-width", 0.6);
    const es = method === "es";
    meanDot.style("display", es ? null : "none");
    ell.style("display", es ? null : "none");
    if (es) {
      meanDot.attr("cx", P.x(gen.mean[0])).attr("cy", P.y(gen.mean[1]));
      ell.attr("cx", P.x(gen.mean[0])).attr("cy", P.y(gen.mean[1]))
        .attr("rx", P.x(gen.sd[0]) - P.x(0)).attr("ry", P.y(0) - P.y(gen.sd[1]));
    }
    readout.innerHTML = L(
      `Generation ${gs.value}: best average loss <b>${fmt(gen.best, 3)}</b> bits (gradient descent's optimum ≈ 0.415). ${es ? "ES samples a cloud around a mean, moves the mean toward the best 5 samples, and shrinks the cloud." : "GA keeps the 2 best, then breeds the rest: pick parents by mini-tournaments, blend them (crossover), and add noise (mutation)."} No gradients are used, only loss values.`,
      `世代 ${gs.value}：最良の平均損失 <b>${fmt(gen.best, 3)}</b> ビット（勾配降下法での最適値 ≈ 0.415）。${es ? "ES は平均のまわりに雲のようにサンプルを取り、上位5個のほうへ平均を動かし、雲を縮めます。" : "GA は上位2個を残し、残りを繁殖で作ります。小さなトーナメントで親を選び、混ぜ合わせ（交叉）、ノイズを加えます（突然変異）。"}勾配は一切使わず、損失の値だけを使っています。`);
  }
  draw();
}
