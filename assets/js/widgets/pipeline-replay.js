import { d3, L, div, button, plot, legend, COLOR, tex } from "./_lib.js";
import { CLS } from "../running-example.js";
import { SURFACES, drawContours } from "./_surface.js";
import { linspace, sigmoid, fmt } from "../math.js";

const nll = (w, b, data) => d3.mean(data, d => {
  const q = Math.min(Math.max(sigmoid(w * d.x + b), 1e-9), 1 - 1e-9);
  return -Math.log2(d.y ? q : 1 - q);
});

export default function mount(el) {
  const test = CLS.sample(1000, 99);
  const path = [[0, 0]];
  for (let k = 0; k < 3000; k++) {
    const [w, b] = path.at(-1);
    const r = CLS.data.map(d => sigmoid(w * d.x + b) - d.y);
    path.push([w - 2 * d3.mean(r, (v, i) => v * CLS.data[i].x), b - 2 * d3.mean(r)]);
  }
  const [wf, bf] = path.at(-1);
  let stage = 0;
  const link = (f, n) => `<a href="${f}">${n}</a>`;
  const STAGES = [
    { t: L("1 · Data", "1・データ"), ch: `${link("ch01-distributions.html", "1")}, ${link("ch04-meta-level.html", "4")}` },
    { t: L("2 · Family + loss", "2・関数族 + 損失"), ch: `${link("ch02-information.html", "2")}, ${link("ch03-functions.html", "3")}, ${link("ch06-architectures.html", "6")}, ${link("ch07-activations.html", "7")}` },
    { t: L("3 · Search", "3・探索"), ch: `${link("ch09-search.html", "9")}, ${link("ch10-gradients.html", "10")}` },
    { t: L("4 · Generalize", "4・汎化"), ch: `${link("ch08-topology.html", "8")}, ${link("ch12-generalization.html", "12")}` },
    { t: L("5 · Calibrate", "5・較正"), ch: link("ch12-generalization.html", "12") },
  ];
  const ctl = div(el, "controls");
  const btns = STAGES.map((s, i) => button(ctl, s.t, () => { stage = i; draw(); }));
  const box = div(el, "");
  const readout = div(el, "readout");

  function draw() {
    btns.forEach((b, i) => { b.style.background = i === stage ? "var(--accent)" : ""; b.style.color = i === stage ? "#fff" : ""; });
    box.innerHTML = "";
    const hs = linspace(0, 1, 100);
    const msg = [];
    if (stage === 0) {
      const P = plot(box, { height: 260, x: [0, 1], y: [-0.1, 1.1], xLabel: "h", yLabel: "y", yTicks: 3 });
      P.g.selectAll("circle").data(CLS.data).join("circle").attr("cx", d => P.x(d.x)).attr("cy", d => P.y(d.y)).attr("r", 4).style("fill", COLOR.data);
      msg.push(L("60 days of (humidity, rain). They are samples from an unknown p(y | h), and that conditional distribution is what we want.", "（湿度, 雨）の60日分。未知の p(y | h) から引かれたサンプルで、欲しいのはこの条件付き分布です。"));
    } else if (stage === 1) {
      const P = plot(box, { height: 260, x: [0, 1], y: [-0.1, 1.1], xLabel: "h", yLabel: "q(rain | h)", yTicks: 3 });
      [[3, -1], [8, -6], [20, -8], [-4, 2], [12, -5]].forEach(([w, b]) => P.g.append("path").attr("d", d3.line().x(h => P.x(h)).y(h => P.y(sigmoid(w * h + b)))(hs))
        .style("fill", "none").style("stroke", COLOR.q).style("opacity", 0.5));
      P.g.selectAll("circle").data(CLS.data).join("circle").attr("cx", d => P.x(d.x)).attr("cy", d => P.y(d.y)).attr("r", 3).style("fill", COLOR.data);
      msg.push(tex("\\mathcal H=\\{\\,\\sigma(wh+b)\\,\\}") + " " + L("is the family. The network outputs a logit that names a Bernoulli distribution, and the score is the average surprise, −log q.", "が関数族です。ネットワークはベルヌーイ分布を名指すロジットを出力し、採点には平均の驚き −log q を使います。"));
    } else if (stage === 2) {
      const S = SURFACES.rain;
      const P = plot(box, { width: 460, height: 340, x: S.dom[0], y: S.dom[1], xLabel: "w", yLabel: "b" });
      drawContours(P, S.f, S.dom);
      P.g.append("path").attr("d", d3.line().x(p => P.x(p[0])).y(p => P.y(p[1]))(path.filter((_, i) => i % 10 === 0)))
        .style("fill", "none").style("stroke", "#fff").style("stroke-width", 2.5);
      P.g.append("circle").attr("cx", P.x(wf)).attr("cy", P.y(bf)).attr("r", 6).style("fill", COLOR.loss).style("stroke", "#fff");
      msg.push(L(`Gradient descent from (0, 0), 3000 steps. It lands at w = ${fmt(wf, 1)}, b = ${fmt(bf, 1)}. The truth is (12, −7.2).`, `(0, 0) から勾配降下法で3000歩。w = ${fmt(wf, 1)}、b = ${fmt(bf, 1)} に着きます。真の値は (12, −7.2) です。`));
    } else if (stage === 3) {
      const rows = [
        [L("found θ", "見つけた θ"), nll(wf, bf, CLS.data), nll(wf, bf, test)],
        [L("true θ*", "真の θ*"), nll(CLS.w, CLS.b, CLS.data), nll(CLS.w, CLS.b, test)],
      ];
      box.innerHTML = `<table class="w-table"><tr><th></th><th>${L("train (60 days)", "訓練（60日）")}</th><th>${L("new (1,000 days)", "新しいデータ（1,000日）")}</th></tr>${rows.map(r => `<tr><td>${r[0]}</td><td>${fmt(r[1], 3)}</td><td>${fmt(r[2], 3)}</td></tr>`).join("")}</table>`;
      msg.push(L("The found model beats the truth on the training days (it fits their quirks), but loses slightly on new days. The gap is small because the family has only 2 knobs and matches the problem's structure.", "見つけたモデルは、訓練に使った日々では真実に勝っています（その日々の癖に合わせているからです）が、新しい日ではわずかに負けます。関数族のつまみが2つだけで、問題の構造に合っているので、ギャップは小さく済んでいます。"));
    } else {
      const P = plot(box, { width: 380, height: 300, x: [0, 1], y: [0, 1], xLabel: "predicted", yLabel: "observed", xTicks: 5, yTicks: 5 });
      P.g.append("line").attr("x1", 0).attr("y1", P.H).attr("x2", P.W).attr("y2", 0).style("stroke", COLOR.muted).style("stroke-dasharray", "4 3");
      const bins = d3.range(10).map(b => ({ b, items: test.filter(d => Math.min(9, Math.floor(sigmoid(wf * d.x + bf) * 10)) === b) })).filter(b => b.items.length);
      P.g.selectAll("circle").data(bins).join("circle").attr("cx", b => P.x(d3.mean(b.items, d => sigmoid(wf * d.x + bf)))).attr("cy", b => P.y(d3.mean(b.items, d => d.y)))
        .attr("r", b => 3 + Math.sqrt(b.items.length) / 3).style("fill", COLOR.q).style("stroke", "#fff");
      msg.push(L("On 1,000 new days the dots hug the diagonal: when this model says 70%, it rains about 70% of the time. That answers the question Chapter 1 opened with.", "1,000の新しい日で、点は対角線に沿って並んでいます。このモデルが70%と言うとき、約70%の割合で雨が降ります。第1章の冒頭の問いへの答えです。"));
    }
    readout.innerHTML = msg.join(" ") + `<br><small>${L("Chapters", "関連する章")}: ${STAGES[stage].ch}</small>`;
  }
  draw();
}
