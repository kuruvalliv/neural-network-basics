import { d3, L, div, slider, choice, plot, COLOR, tex } from "./_lib.js";
import { CLS } from "../running-example.js";
import { linspace, fmt, normPdf, sigmoid } from "../math.js";

export default function mount(el) {
  let mode = "cls";
  const ctl = div(el, "controls");
  choice(ctl, {
    label: L("Example", "例"),
    options: [{ value: "cls", label: L("rain", "雨") }, { value: "reg", label: L("noisy curve", "ノイズのある曲線") }],
    value: mode, onChange: v => { mode = v; setup(); },
  });
  const xBox = div(el, "controls");
  const pipe = div(el, "levels");
  const cIn = div(pipe, "level"), cNet = div(pipe, "level"), cLink = div(pipe, "level");
  const plotBox = div(el, "");
  const readout = div(el, "readout");
  let xs, P, shape;

  function setup() {
    xBox.innerHTML = "";
    plotBox.innerHTML = "";
    if (mode === "cls") {
      xs = slider(xBox, { label: L("humidity h", "湿度 h"), min: 0, max: 1, step: 0.01, value: 0.5, onInput: draw });
      P = plot(plotBox, { height: 220, xBand: ["☀ (y=0)", "☂ (y=1)"], y: [0, 1], yLabel: "q(y | h)", yTicks: 4 });
    } else {
      xs = slider(xBox, { label: "x", min: 0, max: 2 * Math.PI, step: 0.01, value: 1, onInput: draw });
      P = plot(plotBox, { height: 220, x: [-2, 2], y: [0, 1.4], xLabel: "y", yLabel: "q(y | x)", yTicks: 4 });
    }
    shape = P.g.append("g");
    draw();
  }

  function draw() {
    const x = xs.value;
    shape.selectAll("*").remove();
    if (mode === "cls") {
      const z = CLS.w * x + CLS.b, p = sigmoid(z);
      cIn.innerHTML = `<div class="lv">${L("input", "入力")}</div><div class="val">h = ${fmt(x)}</div>`;
      cNet.innerHTML = `<div class="lv">${L("network outputs", "ネットワークの出力")}</div><div class="val">${tex(`f_\\theta(h)=${fmt(z)}`)}</div><div style="font-size:12px;color:var(--muted)">${L("one real number, any sign", "符号を問わない実数1つ")}</div>`;
      cLink.innerHTML = `<div class="lv">${L("link g turns it into", "リンク g が変換すると")}</div><div class="val">${tex(`\\sigma(${fmt(z)})=${fmt(p, 3)}`)}</div><div style="font-size:12px;color:var(--muted)">${L("the knob of a Bernoulli", "Bernoulli のつまみ")}</div>`;
      shape.selectAll("rect").data([1 - p, p]).join("rect").attr("x", (_, i) => P.x(P.x.domain()[i])).attr("width", P.x.bandwidth())
        .attr("y", d => P.y(d)).attr("height", d => P.H - P.y(d)).style("fill", COLOR.q);
    } else {
      const mu = Math.sin(x), ls = Math.log(0.3), s = Math.exp(ls);
      cIn.innerHTML = `<div class="lv">${L("input", "入力")}</div><div class="val">x = ${fmt(x)}</div>`;
      cNet.innerHTML = `<div class="lv">${L("network outputs", "ネットワークの出力")}</div><div class="val">${tex(`(\\mu,\\,\\log\\sigma)=(${fmt(mu)},\\,${fmt(ls)})`)}</div><div style="font-size:12px;color:var(--muted)">${L("two real numbers", "実数2つ")}</div>`;
      cLink.innerHTML = `<div class="lv">${L("link g turns them into", "リンク g が変換すると")}</div><div class="val">${tex(`\\mathcal N(${fmt(mu)},\\,${fmt(s)}^2)`)}</div><div style="font-size:12px;color:var(--muted)">${L("σ = exp(log σ) is always positive", "σ = exp(log σ) は常に正")}</div>`;
      const ys = linspace(-2, 2, 160);
      shape.append("path").attr("d", d3.area().x(y => P.x(y)).y0(P.H).y1(y => P.y(normPdf(y, mu, s)))(ys))
        .style("fill", COLOR.q).style("opacity", 0.3);
      shape.append("path").attr("d", d3.line().x(y => P.x(y)).y(y => P.y(normPdf(y, mu, s)))(ys))
        .style("fill", "none").style("stroke", COLOR.q).style("stroke-width", 2.5);
    }
    readout.innerHTML = L("The middle card is everything the network produces: a short list of numbers. The distribution below exists only because we agreed in advance on a family (Bernoulli, Gaussian) and a link g that reads those numbers as its knobs.",
      "真ん中のカードが、ネットワークが生み出すもののすべてです。つまり短い数のリストです。下の分布が存在するのは、分布族（Bernoulli、ガウス）と、その数をつまみとして読むリンク g を、あらかじめ取り決めてあるからにすぎません。");
  }
  setup();
}
