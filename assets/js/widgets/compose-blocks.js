import { d3, L, div, button, plot, COLOR } from "./_lib.js";
import { linspace } from "../math.js";

const BLOCKS = {
  plus: { label: "+1", f: x => x + 1, show: s => `(${s}+1)` },
  minus: { label: "−1", f: x => x - 1, show: s => `(${s}−1)` },
  scale: { label: "×2", f: x => 2 * x, show: s => `2${s}` },
  neg: { label: "×(−1)", f: x => -x, show: s => `−${s}` },
  fold: { label: "|·|", f: Math.abs, show: s => `|${s}|` },
  relu: { label: "ReLU", f: x => Math.max(0, x), show: s => `ReLU(${s})` },
  squash: { label: "tanh", f: Math.tanh, show: s => `tanh(${s})` },
};

export default function mount(el) {
  let chain = ["fold", "minus", "fold"];
  const ctl = div(el, "controls");
  div(ctl, "", `<span class="ctl-label">${L("add block:", "ブロックを追加：")}</span>`);
  Object.entries(BLOCKS).forEach(([k, b]) => button(ctl, b.label, () => { if (chain.length < 8) chain.push(k); draw(); }));
  const ctl2 = div(el, "controls");
  button(ctl2, L("Undo", "1つ戻す"), () => { chain.pop(); draw(); });
  button(ctl2, L("Clear", "クリア"), () => { chain = []; draw(); });
  const pipe = div(el, "");
  pipe.style.cssText = "font-family:ui-monospace,monospace;margin:.3rem 0";

  const P = plot(el, { height: 300, x: [-3, 3], y: [-3, 3], xLabel: "x", yLabel: "f(x)" });
  const stages = P.g.append("g");
  const final = P.g.append("path").style("fill", "none").style("stroke", COLOR.q).style("stroke-width", 3);
  const readout = div(el, "readout");
  const xs = linspace(-3, 3, 301);

  function draw() {
    const curves = [xs.slice()];
    chain.forEach(k => curves.push(curves.at(-1).map(BLOCKS[k].f)));
    const all = curves.flat();
    const lo = Math.max(-10, d3.min(all)), hi = Math.min(10, d3.max(all));
    P.y.domain([Math.min(lo, -0.5) - 0.2, Math.max(hi, 0.5) + 0.2]);
    P.drawAxes();
    const line = ys => d3.line().x((_, i) => P.x(xs[i])).y(v => P.y(Math.max(-10, Math.min(10, v))))(ys);
    stages.selectAll("path").data(curves.slice(0, -1)).join("path").attr("d", line)
      .style("fill", "none").style("stroke", COLOR.muted).style("opacity", (_, i) => 0.15 + (0.35 * i) / Math.max(1, chain.length));
    final.attr("d", line(curves.at(-1)));
    pipe.innerHTML = `x ${chain.map(k => `→ <b>${BLOCKS[k].label}</b>`).join(" ")}`;
    const formula = chain.reduce((s, k) => BLOCKS[k].show(s), "x");
    readout.innerHTML = `f(x) = ${formula}<br>` + L(
      "Each block is trivial on its own. Grey curves show the intermediate stages and orange is the final result. Fold, shift, fold makes a W, and each further shift-and-fold adds more corners. Composition is cheap complexity.",
      "ブロックは1つずつ見ればどれも簡単です。灰色の曲線は途中の段階、オレンジが最終結果です。折る・ずらす・折るで W の形になり、さらに「ずらして折る」を加えるたびに角が増えます。合成は、安く複雑さを生み出す方法です。");
  }
  draw();
}
