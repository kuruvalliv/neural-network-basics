import { d3, L, div, slider, plot, legend, COLOR, piFormat, tex } from "./_lib.js";
import { linspace, fmt, relu } from "../math.js";

export default function mount(el) {
  const ctl = div(el, "controls");
  const ns = slider(ctl, { label: L("hidden ReLU units", "隠れ ReLU ユニット数"), min: 1, max: 40, step: 1, value: 4, format: v => v, onInput: draw });

  const P = plot(el, { height: 320, x: [0, 2 * Math.PI], y: [-1.6, 1.6], xLabel: "x", yLabel: "f(x)", xFormat: piFormat });
  const grid = linspace(0, 2 * Math.PI, 400);
  P.g.append("path").attr("d", d3.line().x(x => P.x(x)).y(x => P.y(Math.sin(x)))(grid))
    .style("fill", "none").style("stroke", COLOR.p).style("stroke-width", 2).style("stroke-dasharray", "5 4");
  const units = P.g.append("g");
  const total = P.g.append("path").style("fill", "none").style("stroke", COLOR.q).style("stroke-width", 3);
  const knots = P.g.append("g");
  legend(el, [[COLOR.accent, L("one unit: cₖ·ReLU(x − kₖ)", "ユニット1つ：cₖ·ReLU(x − kₖ)")], [COLOR.q, L("network output = their sum", "ネットワークの出力 = その和")], [COLOR.p, L("target sin x", "目標 sin x"), true]]);
  const readout = div(el, "readout");

  function draw() {
    const N = ns.value, step = (2 * Math.PI) / N;
    const ks = d3.range(N).map(i => i * step);
    const slope = i => (Math.sin((i + 1) * step) - Math.sin(i * step)) / step;
    const cs = ks.map((_, i) => slope(i) - (i ? slope(i - 1) : 0));
    const f = x => cs.reduce((s, c, i) => s + c * relu(x - ks[i]), 0);
    const clip = v => Math.max(-1.6, Math.min(1.6, v));
    units.selectAll("path").data(N <= 12 ? ks : []).join("path")
      .attr("d", (k, i) => d3.line().x(x => P.x(x)).y(x => P.y(clip(cs[i] * relu(x - k))))(grid))
      .style("fill", "none").style("stroke", COLOR.accent).style("opacity", 0.4);
    total.attr("d", d3.line().x(x => P.x(x)).y(x => P.y(clip(f(x))))(grid));
    knots.selectAll("circle").data(ks).join("circle").attr("cx", k => P.x(k)).attr("cy", k => P.y(clip(f(k)))).attr("r", 3.5).style("fill", COLOR.q);
    const maxErr = d3.max(grid, x => Math.abs(f(x) - Math.sin(x)));
    readout.innerHTML = tex("f(x)=\\sum_{k=1}^{N} c_k\\,\\mathrm{ReLU}(x-k_k)") + "&emsp;" +
      L(`Max error: <b>${fmt(maxErr, 3)}</b>. Each unit adds one bend at its knot. More units give more bends and a closer fit, and the error can be made as small as you like. That is universal approximation in one picture. Note what it does <em>not</em> say: how many units you need, or how to find the cₖ from noisy data.`,
        `最大誤差：<b>${fmt(maxErr, 3)}</b>。ユニットは1つごとに、その結び目で1回曲がりを加えます。ユニットを増やせば曲がりが増えて当てはまりがよくなり、誤差はいくらでも小さくできます。これが1枚の図で見る普遍近似です。この定理が<em>言っていない</em>ことにも注意しましょう。必要なユニット数も、ノイズのあるデータから cₖ を見つける方法も、何も言っていません。`);
  }
  draw();
}
