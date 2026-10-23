import { L, div, h, tex } from "./_lib.js";

const PARTS = [
  { tex: "\\hat q", en: "The learned predictive distribution: a function x ↦ q(· | x) that the network names (level 3).", ja: "学習された予測分布：ネットワークが名指す関数 x ↦ q(· | x)（レベル3）。", ch: [["ch03-functions", 3], ["ch04-meta-level", 4]] },
  { tex: "=\\arg\\min", en: "Pick the best candidate. Doing this in practice is search: landscapes, gradients, evolution.", ja: "最良の候補を選ぶこと。実際にこれを行うのが探索です（地形、勾配、進化）。", ch: [["ch09-search", 9], ["ch10-gradients", 10], ["ch11-gradient-free", 11]] },
  { tex: "_{q\\in\\mathcal H_{\\text{topology+activations}}}", en: "The hypothesis class: what the architecture can represent at all.", ja: "仮説クラス：そのアーキテクチャがそもそも表現できるもの。", ch: [["ch05-structure", 5], ["ch06-architectures", 6], ["ch07-activations", 7], ["ch08-topology", 8]] },
  { tex: "\\frac1n\\sum_{i=1}^n", en: "An average over finite data: an estimate of the true risk, with a gap to watch.", ja: "有限のデータについての平均：真のリスクの推定値で、ギャップに注意が必要です。", ch: [["ch04-meta-level", 4], ["ch12-generalization", 12]] },
  { tex: "-\\log q(y_i\\mid x_i)", en: "Surprise: the proper score whose average is cross-entropy, so minimizing it is minimizing KL to the truth.", ja: "驚き：平均すると交差エントロピーになる適切なスコア。これを最小化することは、真実との KL を最小化することです。", ch: [["ch01-distributions", 1], ["ch02-information", 2]] },
];

export default function mount(el) {
  const eq = div(el, "");
  eq.style.cssText = "display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:.15rem;font-size:1.35em;padding:.8rem 0";
  const info = div(el, "readout", L("Hover or tap a part of the equation.", "式の一部にマウスを乗せるか、タップしてください。"));
  PARTS.forEach(p => {
    const s = h("span", { tabindex: "0" }, tex(p.tex));
    s.style.cssText = "padding:.2rem .35rem;border-radius:8px;cursor:pointer;transition:background .15s";
    const show = () => {
      eq.querySelectorAll("span[tabindex]").forEach(o => (o.style.background = ""));
      s.style.background = "color-mix(in srgb, var(--accent) 22%, transparent)";
      info.innerHTML = `${L(p.en, p.ja)}<br><small>${L("Chapters", "関連する章")}: ${p.ch.map(([f, n]) => `<a href="${f}.html">${n}</a>`).join(", ")}</small>`;
    };
    s.addEventListener("mouseenter", show);
    s.addEventListener("focus", show);
    s.addEventListener("click", show);
    eq.append(s);
  });
  const tail = h("span", {}, `&nbsp;${L("found by search", "探索で見つける")}`);
  tail.style.fontSize = "0.7em";
  eq.append(tail);
}
