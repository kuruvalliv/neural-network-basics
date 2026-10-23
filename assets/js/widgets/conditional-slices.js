import { d3, L, div, slider, choice, plot, COLOR, tex, piFormat } from "./_lib.js";
import { REG, CLS } from "../running-example.js";
import { linspace, fmt, normPdf, rng } from "../math.js";

export default function mount(el) {
  let mode = "reg";
  const jitter = (() => { const r = rng(9); return CLS.data.map(() => (r() - 0.5) * 0.08); })();

  const ctl = div(el, "controls");
  choice(ctl, {
    label: L("Example", "例"),
    options: [{ value: "reg", label: L("noisy curve", "ノイズのある曲線") }, { value: "cls", label: L("rain", "雨") }],
    value: mode,
    onChange: v => { mode = v; setup(); },
  });
  const xBox = div(el, "controls");
  let xs;

  const row = div(el, "row");
  const mainBox = div(row, ""), sideBox = div(row, "");
  mainBox.style.flex = "2 1 340px";
  let M, S;
  const readout = div(el, "readout");

  function setup() {
    mainBox.innerHTML = "";
    sideBox.innerHTML = "";
    xBox.innerHTML = "";
    if (mode === "reg") {
      xs = slider(xBox, { label: "x", min: 0, max: 2 * Math.PI, step: 0.01, value: 1.2, onInput: draw });
      M = plot(mainBox, { width: 440, height: 300, x: [0, 2 * Math.PI], y: [-2, 2], xLabel: "x", yLabel: "y", xFormat: piFormat, xTicks: 4 });
      M.g.selectAll("circle").data(REG.data).join("circle").attr("cx", d => M.x(d.x)).attr("cy", d => M.y(d.y)).attr("r", 3).style("fill", COLOR.data);
      M.g.append("path").attr("d", d3.line().x(x => M.x(x)).y(x => M.y(Math.sin(x)))(linspace(0, 2 * Math.PI, 120)))
        .style("fill", "none").style("stroke", COLOR.p).style("stroke-dasharray", "4 3");
      S = plot(sideBox, { width: 260, height: 300, x: [-2, 2], y: [0, 1.5], xLabel: "y", yLabel: "p(y | x)", xTicks: 4, yTicks: 3 });
    } else {
      xs = slider(xBox, { label: L("humidity h", "湿度 h"), min: 0, max: 1, step: 0.01, value: 0.55, onInput: draw });
      M = plot(mainBox, { width: 440, height: 300, x: [0, 1], y: [-0.15, 1.15], xLabel: "h", yLabel: "y", yTicks: 3 });
      M.g.selectAll("circle").data(CLS.data).join("circle").attr("cx", d => M.x(d.x)).attr("cy", (d, i) => M.y(d.y + jitter[i])).attr("r", 3).style("fill", COLOR.data);
      M.g.append("path").attr("d", d3.line().x(x => M.x(x)).y(x => M.y(CLS.pRain(x)))(linspace(0, 1, 100)))
        .style("fill", "none").style("stroke", COLOR.p).style("stroke-dasharray", "4 3");
      S = plot(sideBox, { width: 260, height: 300, xBand: ["0", "1"], y: [0, 1], xLabel: "y", yLabel: "p(y | h)", yTicks: 3 });
    }
    M.slice = M.g.append("g");
    S.shape = S.g.append("g");
    draw();
  }

  function draw() {
    const x = xs.value;
    M.slice.selectAll("*").remove();
    S.shape.selectAll("*").remove();
    M.slice.append("line").attr("x1", M.x(x)).attr("x2", M.x(x)).attr("y1", 0).attr("y2", M.H).style("stroke", COLOR.accent).style("stroke-dasharray", "3 3");
    if (mode === "reg") {
      const mu = Math.sin(x), s = REG.sigma, ys = linspace(-2, 2, 120), k = 0.6 * s * Math.sqrt(2 * Math.PI);
      M.slice.append("path").attr("d", d3.area().y(y => M.y(y)).x0(M.x(x)).x1(y => M.x(x + k * normPdf(y, mu, s)))(ys))
        .style("fill", COLOR.p).style("opacity", 0.35);
      S.shape.append("path").attr("d", d3.area().x(y => S.x(y)).y0(S.H).y1(y => S.y(normPdf(y, mu, s)))(ys))
        .style("fill", COLOR.p).style("opacity", 0.35);
      S.shape.append("path").attr("d", d3.line().x(y => S.x(y)).y(y => S.y(normPdf(y, mu, s)))(ys))
        .style("fill", "none").style("stroke", COLOR.p).style("stroke-width", 2);
      readout.innerHTML = tex(`x=${fmt(x)}\\;\\longmapsto\\; p(\\cdot\\mid x)=\\mathcal N\\big(${fmt(mu)},\\,${fmt(s)}^2\\big)`) + "<br>" +
        L("Feed in one number x and you get back a <b>whole function</b> of y (right). The blue bump slides along the curve as x moves.",
          "数 x を1つ入れると、y の<b>関数まるごと</b>が返ってきます（右）。x を動かすと、青いこぶが曲線に沿って滑っていきます。");
    } else {
      const p = CLS.pRain(x);
      M.slice.append("circle").attr("cx", M.x(x)).attr("cy", M.y(p)).attr("r", 6).style("fill", COLOR.p);
      S.shape.selectAll("rect").data([1 - p, p]).join("rect").attr("x", (_, i) => S.x(String(i))).attr("width", S.x.bandwidth())
        .attr("y", d => S.y(d)).attr("height", d => S.H - S.y(d)).style("fill", COLOR.p);
      readout.innerHTML = tex(`h=${fmt(x)}\\;\\longmapsto\\; p(\\cdot\\mid h)=\\text{Bernoulli}(${fmt(p, 3)})`) + "<br>" +
        L("For each humidity, the output is a two-bar distribution, not a yes/no answer. The dashed curve tracks the height of the “rain” bar.",
          "湿度ごとの出力は、「はい/いいえ」の答えではなく、2本の棒からなる分布です。破線の曲線は「雨」の棒の高さを追っています。");
    }
  }
  setup();
}
