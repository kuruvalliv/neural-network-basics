import { d3, L, div, slider, plot, COLOR, tex } from "./_lib.js";
import { sigmoid, linspace, normPdf, fmt } from "../math.js";

export default function mount(el) {
  const ctl = div(el, "controls");
  const z1 = slider(ctl, { label: "z₁", min: -4, max: 4, step: 0.01, value: 1, onInput: draw });
  const z2 = slider(ctl, { label: "z₂", min: -4, max: 4, step: 0.01, value: -0.5, onInput: draw });
  const z3 = slider(ctl, { label: "z₃", min: -4, max: 4, step: 0.01, value: 0.3, onInput: draw });

  const row = div(el, "row");
  const mk = (title, opts) => {
    const box = div(row, "");
    div(box, "", `<div style="text-align:center;font-weight:600;margin-bottom:.2rem">${title}</div>`);
    const P = plot(box, { width: 240, height: 200, margin: { left: 40 }, yTicks: 4, ...opts });
    return { P, g: P.g.append("g"), cap: div(box, "", "") };
  };
  const A = mk(L("sigmoid → Bernoulli", "sigmoid → Bernoulli"), { xBand: ["0", "1"], y: [0, 1] });
  const B = mk(L("softmax → categorical", "softmax → カテゴリカル"), { xBand: ["1", "2", "3"], y: [0, 1] });
  const C = mk(L("identity + softplus → Gaussian", "恒等 + softplus → ガウス"), { x: [-5, 5], y: [0, 1.2], xTicks: 5 });
  [A, B, C].forEach(p => (p.cap.style.cssText = "text-align:center;font-size:13px"));
  const readout = div(el, "readout");

  function draw() {
    const z = [z1.value, z2.value, z3.value];
    const p = sigmoid(z[0]);
    A.g.selectAll("rect").data([1 - p, p]).join("rect").attr("x", (_, i) => A.P.x(String(i))).attr("width", A.P.x.bandwidth())
      .attr("y", v => A.P.y(v)).attr("height", v => A.P.H - A.P.y(v)).style("fill", COLOR.q);
    A.cap.innerHTML = tex(`q(1)=\\sigma(z_1)=${fmt(p)}`);

    const m = Math.max(...z), e = z.map(v => Math.exp(v - m)), s = d3.sum(e), q = e.map(v => v / s);
    B.g.selectAll("rect").data(q).join("rect").attr("x", (_, i) => B.P.x(String(i + 1))).attr("width", B.P.x.bandwidth())
      .attr("y", v => B.P.y(v)).attr("height", v => B.P.H - B.P.y(v)).style("fill", COLOR.q);
    B.cap.innerHTML = tex(`q_k=e^{z_k}/\\textstyle\\sum_j e^{z_j}`);

    const mu = z[0], sd = Math.log1p(Math.exp(z[1]));
    const ys = linspace(-5, 5, 200);
    C.P.y.domain([0, Math.max(0.5, normPdf(mu, mu, sd) * 1.1)]);
    C.P.drawAxes();
    C.g.selectAll("path").data([0]).join("path").attr("d", d3.area().x(y => C.P.x(y)).y0(C.P.H).y1(y => C.P.y(normPdf(y, mu, sd)))(ys))
      .style("fill", COLOR.q).style("fill-opacity", 0.3).style("stroke", COLOR.q).style("stroke-width", 2);
    C.cap.innerHTML = tex(`\\mu=z_1=${fmt(mu)},\\;\\sigma=\\log(1+e^{z_2})=${fmt(sd)}`);

    readout.innerHTML = L(
      "The same raw numbers z feed three different output activations. Each activation maps “any real numbers” onto the legal knobs of one family: a probability in (0, 1), probabilities that sum to 1, or a positive spread. Choosing the output activation is choosing the noise model, and with it the loss (Chapter 2).",
      "同じ生の数 z を、3種類の出力活性化関数に入れています。どの活性化関数も「任意の実数」を、ある分布族の正しいつまみに写します。(0, 1) の確率、合計1の確率の組、正の広がり、のどれかです。出力の活性化関数を選ぶことは、ノイズモデルを選ぶこと、つまり損失を選ぶことです（第2章）。");
  }
  draw();
}
