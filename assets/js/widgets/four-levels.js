import { d3, L, div, slider, plot, legend, COLOR, tex } from "./_lib.js";
import { CLS } from "../running-example.js";
import { linspace, fmt, sigmoid, bernoulliKL } from "../math.js";

export default function mount(el) {
  const ctl = div(el, "controls");
  const ws = slider(ctl, { label: "w", min: -5, max: 25, step: 0.1, value: 5, format: v => v.toFixed(1), onInput: draw });
  const bs = slider(ctl, { label: "b", min: -15, max: 5, step: 0.1, value: -2, format: v => v.toFixed(1), onInput: draw });
  const is = slider(ctl, { label: L("data point i", "データ点 i"), min: 0, max: CLS.data.length - 1, step: 1, value: 7, format: v => v, onInput: draw });

  const levels = div(el, "levels");
  const card = (lv, title) => {
    const c = div(levels, "level");
    c.innerHTML = `<div class="lv">${lv}</div><div>${title}</div><div class="val"></div><div class="sub" style="font-size:12px;color:var(--muted)"></div>`;
    return c;
  };
  const cards = [
    card(L("Level 0 · data", "レベル0・データ"), tex("(x_i,y_i)")),
    card(L("Level 1 · truth (hidden)", "レベル1・真実（隠れている）"), tex("p(\\text{rain}\\mid x_i)")),
    card(L("Level 2 · network output", "レベル2・ネットワークの出力"), tex("f_\\theta(x_i)=wx_i+b")),
    card(L("Level 3 · model distribution", "レベル3・モデルの分布"), tex("q_\\theta(\\text{rain}\\mid x_i)=\\sigma(f_\\theta)")),
    card(L("Level 4 · loss", "レベル4・損失"), tex("-\\log_2 q_\\theta(y_i\\mid x_i)")),
  ];

  const P = plot(el, { height: 300, x: [0, 1], y: [-0.08, 1.08], xLabel: "x = h", yLabel: "P(rain)", yTicks: 5, margin: { right: 50 } });
  const zScale = d3.scaleLinear().domain([-10, 10]).range([P.H, 0]);
  const zAxis = P.root.append("g").attr("class", "axis").attr("transform", `translate(${P.W},0)`).call(d3.axisRight(zScale).ticks(5)).style("opacity", 0);
  const hs = linspace(0, 1, 120);
  const truth = P.g.append("path").attr("d", d3.line().x(h => P.x(h)).y(h => P.y(CLS.pRain(h)))(hs))
    .style("fill", "none").style("stroke", COLOR.p).style("stroke-width", 2).style("stroke-dasharray", "6 4");
  const logit = P.g.append("path").style("fill", "none").style("stroke", COLOR.accent).style("stroke-width", 2).style("opacity", 0);
  const model = P.g.append("path").style("fill", "none").style("stroke", COLOR.q).style("stroke-width", 3);
  const dots = P.g.selectAll("circle.d").data(CLS.data).join("circle").attr("class", "d")
    .attr("cx", d => P.x(d.x)).attr("cy", d => P.y(d.y)).attr("r", 3).style("fill", COLOR.data).style("opacity", 0.6);
  const vline = P.g.append("line").style("stroke", COLOR.muted).style("stroke-dasharray", "3 3");
  const lossSeg = P.g.append("line").style("stroke", COLOR.loss).style("stroke-width", 4).style("opacity", 0.8);
  const cur = P.g.append("circle").attr("r", 7).style("fill", "none").style("stroke", COLOR.ink).style("stroke-width", 2);
  const qDot = P.g.append("circle").attr("r", 5).style("fill", COLOR.q);
  const pDot = P.g.append("circle").attr("r", 5).style("fill", COLOR.p);
  legend(el, [[COLOR.p, L("truth p (level 1)", "真実 p（レベル1）"), true], [COLOR.q, L("model q (level 3)", "モデル q（レベル3）")], [COLOR.accent, L("logit f (level 2, right axis)", "ロジット f（レベル2、右軸）")], [COLOR.loss, L("loss (level 4)", "損失（レベル4）")]]);
  const readout = div(el, "readout");

  const focus = [
    () => cur.attr("r", 11),
    () => truth.style("stroke-width", 4),
    () => { logit.style("opacity", 1); zAxis.style("opacity", 1); },
    () => model.style("stroke-width", 5),
    () => lossSeg.style("stroke-width", 8),
  ];
  const unfocus = () => {
    cur.attr("r", 7); truth.style("stroke-width", 2); logit.style("opacity", 0.25); zAxis.style("opacity", 0.4);
    model.style("stroke-width", 3); lossSeg.style("stroke-width", 4);
    cards.forEach(c => c.classList.remove("active"));
  };
  cards.forEach((c, i) => {
    c.addEventListener("mouseenter", () => { unfocus(); c.classList.add("active"); focus[i](); });
    c.addEventListener("mouseleave", unfocus);
  });

  function draw() {
    const w = ws.value, b = bs.value, d = CLS.data[is.value];
    const z = w * d.x + b, q = sigmoid(z), p = CLS.pRain(d.x);
    const qy = d.y ? q : 1 - q;
    const s = -Math.log2(qy);
    const avg = d3.mean(CLS.data, e => -Math.log2(e.y ? sigmoid(w * e.x + b) : 1 - sigmoid(w * e.x + b)));

    model.attr("d", d3.line().x(h => P.x(h)).y(h => P.y(sigmoid(w * h + b)))(hs));
    logit.attr("d", d3.line().x(h => P.x(h)).y(h => zScale(Math.max(-10, Math.min(10, w * h + b))))(hs));
    dots.attr("r", (_, i) => (i === is.value ? 0 : 3));
    vline.attr("x1", P.x(d.x)).attr("x2", P.x(d.x)).attr("y1", 0).attr("y2", P.H);
    cur.attr("cx", P.x(d.x)).attr("cy", P.y(d.y));
    lossSeg.attr("x1", P.x(d.x)).attr("x2", P.x(d.x)).attr("y1", P.y(d.y)).attr("y2", P.y(q));
    qDot.attr("cx", P.x(d.x)).attr("cy", P.y(q));
    pDot.attr("cx", P.x(d.x)).attr("cy", P.y(p));

    const set = (i, v, sub = "") => { cards[i].querySelector(".val").innerHTML = v; cards[i].querySelector(".sub").innerHTML = sub; };
    set(0, `(${fmt(d.x)}, ${d.y ? "☂" : "☀"})`);
    set(1, fmt(p, 3), L("never observed directly", "直接は観測できない"));
    set(2, fmt(z), L("just a number (a logit)", "ただの数（ロジット）"));
    set(3, fmt(q, 3), L(`a Bernoulli named by ${fmt(z)}`, `${fmt(z)} という名前の Bernoulli`));
    set(4, `${fmt(s)} bit`, L(`avg over data: ${fmt(avg, 3)} · KL: ${fmt(bernoulliKL(p, q), 3)}`, `データ平均：${fmt(avg, 3)}・KL：${fmt(bernoulliKL(p, q), 3)}`));
    readout.innerHTML = L("Hover a card to light up its part of the picture. The network (level 2) never outputs a probability. It outputs one number, and the sigmoid turns that number into the distribution of level 3. Adjust w and b to make the orange curve match the dashed blue one, and watch the average loss fall.",
      "カードにマウスを乗せると、図の対応する部分が光ります。ネットワーク（レベル2）は確率を出力しません。出力するのは数1つで、sigmoid がその数をレベル3の分布に変えます。w と b を調整してオレンジの曲線を青の破線に合わせると、平均損失が下がっていく様子が見られます。");
  }
  unfocus();
  draw();
}
