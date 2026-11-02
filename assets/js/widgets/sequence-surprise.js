import { d3, L, div, slider, plot, COLOR, tex } from "./_lib.js";
import { fmt } from "../math.js";

// Forecaster B's record from the chapter opener: 9 hits at 0.8, 1 miss at 0.2, repeated.
const PATTERN = [0.8, 0.8, 0.8, 0.8, 0.8, 0.2, 0.8, 0.8, 0.8, 0.8];

export default function mount(el) {
  const ctl = div(el, "controls");
  const ns = slider(ctl, { label: L("days n", "日数 n"), min: 1, max: 4000, step: 1, value: 10, format: v => v, onInput: draw });

  const N = 4000;
  const prod = [], logs = [];
  let p = 1, s = 0;
  for (let i = 0; i < N; i++) {
    p *= PATTERN[i % 10];
    s += -Math.log2(PATTERN[i % 10]);
    prod.push(p);
    logs.push(s);
  }
  const underflow = prod.findIndex(v => v === 0) + 1;

  const P = plot(el, { height: 260, x: [1, N], y: [0, logs.at(-1) * 1.05], xLabel: "n", yLabel: "bits", xTicks: 5 });
  P.g.append("path").attr("d", d3.line().x((_, i) => P.x(i * 10 + 1)).y(v => P.y(v))(logs.filter((_, i) => i % 10 === 0)))
    .style("fill", "none").style("stroke", COLOR.loss).style("stroke-width", 2.5);
  P.g.append("line").attr("x1", P.x(underflow)).attr("x2", P.x(underflow)).attr("y1", 0).attr("y2", P.H)
    .style("stroke", COLOR.muted).style("stroke-dasharray", "5 4");
  P.g.append("text").attr("x", P.x(underflow) + 6).attr("y", 14).style("fill", COLOR.muted).text(`n = ${underflow}`);
  const dot = P.g.append("circle").attr("r", 6).style("fill", COLOR.q);
  const readout = div(el, "readout");

  function draw() {
    const n = ns.value, pr = prod[n - 1], sb = logs[n - 1];
    dot.attr("cx", P.x(n)).attr("cy", P.y(sb));
    readout.innerHTML =
      tex(`q(\\text{whole record})=\\prod_{i=1}^{${n}} q(y_i)=${pr === 0 ? "0\\ (\\text{underflow!})" : pr.toExponential(3).replace("e", "\\times10^{") + "}"}`) + "<br>" +
      tex(`-\\log_2 q(\\text{whole record})=\\sum_{i=1}^{${n}}-\\log_2 q(y_i)=${fmt(sb, 1)}\\text{ bits}\\quad(\\text{${fmt(sb / n, 3)} per day})`) + "<br>" +
      L(`The probability of a long record is a product of many numbers below 1, so it shrinks exponentially. After ${underflow} days the computer can no longer store it and rounds it to exactly 0 (dashed line). The surprise is a <b>sum</b> instead: it grows in a straight line (red), never underflows, and its average per day stays put. That is the practical reason the book always works with −log q.`,
        `長い記録の確率は1より小さい数をたくさん掛けたものなので、指数的に小さくなります。${underflow}日を超えると、コンピュータはもうその値を保持できず、ちょうど0に丸めてしまいます（破線）。驚きのほうは<b>和</b>なので、直線的に増えるだけで（赤）、アンダーフローせず、1日あたりの平均も一定のままです。この本がいつも −log q を使う実用上の理由はここにあります。`);
  }
  draw();
}
