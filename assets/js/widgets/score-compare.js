import { d3, L, div, plot, legend, COLOR } from "./_lib.js";
import { linspace } from "../math.js";

export default function mount(el) {
  const P = plot(el, { height: 260, x: [0, 1], y: [0, 7], xLabel: "q(actual outcome)", yLabel: "penalty", xTicks: 5 });
  const qs = linspace(0.008, 1, 200);
  P.g.append("path").attr("d", d3.line().x(q => P.x(q)).y(q => P.y(-Math.log2(q)))(qs)).style("fill", "none").style("stroke", COLOR.loss).style("stroke-width", 3);
  P.g.append("path").attr("d", d3.line().x(q => P.x(q)).y(q => P.y((1 - q) ** 2))(qs)).style("fill", "none").style("stroke", COLOR.accent).style("stroke-width", 3);
  legend(el, [[COLOR.loss, L("log-loss −log₂ q", "対数損失 −log₂ q")], [COLOR.accent, L("Brier (1 − q)²", "Brier (1 − q)²")]]);
  div(el, "readout", L(
    "Both scores are proper (Chapter 2), but they punish confident mistakes very differently. When the model gave the actual outcome only 1%, log-loss charges 6.6 bits (and infinity at 0), while Brier charges at most 1. Log-loss cares most about the rare disasters. Brier cares more about typical accuracy.",
    "どちらのスコアも適切です（第2章）が、自信満々の間違いへの罰し方がまったく違います。実際の結果にモデルが1%しか与えていなかった場合、対数損失は6.6ビットを課し（0なら無限大）、Brier は最大でも1しか課しません。対数損失はまれな大失敗を最も重視し、Brier は典型的な正確さをより重視します。"));
}
