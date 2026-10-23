import { d3, L, div, slider, button, plot, COLOR, tex } from "./_lib.js";
import { sigmoid, fmt, linspace } from "../math.js";

export default async function mount(el) {
  const data = await (await fetch(new URL("../../../data/calibration.json", import.meta.url))).json();
  const z = data.logits, y = data.y;
  const metrics = T => {
    const q = z.map(v => Math.min(Math.max(sigmoid(v / T), 1e-9), 1 - 1e-9));
    const nll = d3.mean(q, (p, i) => -Math.log2(y[i] ? p : 1 - p));
    const brier = d3.mean(q, (p, i) => (p - y[i]) ** 2);
    const bins = d3.range(10).map(b => ({ b, conf: [], hit: [] }));
    q.forEach((p, i) => { const b = bins[Math.min(9, Math.floor(p * 10))]; b.conf.push(p); b.hit.push(y[i]); });
    bins.forEach(b => { b.n = b.conf.length; b.c = d3.mean(b.conf); b.a = d3.mean(b.hit); });
    const ece = d3.sum(bins.filter(b => b.n), b => (b.n / q.length) * Math.abs(b.a - b.c));
    const disasters = q.filter((p, i) => (y[i] ? p : 1 - p) < 0.01).length;
    return { nll, brier, bins, ece, disasters };
  };
  const Ts = linspace(0.5, 8, 151);
  const bestT = Ts[d3.minIndex(Ts, t => metrics(t).nll)];

  const ctl = div(el, "controls");
  const ts = slider(ctl, { label: L("temperature T", "温度 T"), min: 0.5, max: 8, step: 0.05, value: 1, onInput: draw });
  button(ctl, L("Fit T on held-out data", "検証データで T を当てはめる"), () => ts.set(bestT));

  const P = plot(el, { width: 440, height: 380, x: [0, 1], y: [0, 1], xLabel: "predicted P(rain)", yLabel: "observed frequency", xTicks: 5, yTicks: 5 });
  P.g.append("line").attr("x1", 0).attr("y1", P.H).attr("x2", P.W).attr("y2", 0).style("stroke", COLOR.muted).style("stroke-dasharray", "4 3");
  const bars = P.g.append("g"), dots = P.g.append("g");
  const readout = div(el, "readout");

  function draw() {
    const m = metrics(ts.value);
    const live = m.bins.filter(b => b.n);
    bars.selectAll("rect").data(live).join("rect").attr("x", b => P.x(b.b / 10) + 2).attr("width", P.x(0.1) - P.x(0) - 4)
      .attr("y", b => P.y(b.a)).attr("height", b => P.H - P.y(b.a)).style("fill", COLOR.p).style("opacity", 0.6);
    dots.selectAll("circle").data(live).join("circle").attr("cx", b => P.x(b.c)).attr("cy", b => P.y(b.a)).attr("r", b => 3 + Math.sqrt(b.n) / 3)
      .style("fill", COLOR.q).style("stroke", "#fff");
    readout.innerHTML = tex(`q=\\sigma(z/T)`) + "&emsp;" +
      L(`T = ${fmt(ts.value)}: log-loss <b>${fmt(m.nll, 3)}</b> bits, Brier <b>${fmt(m.brier, 3)}</b>, calibration error (ECE) <b>${fmt(m.ece, 3)}</b>. Each orange dot is a group of predictions: x = how confident the model was, y = how often it actually rained, size = how many. A calibrated model sits on the diagonal. <b>${m.disasters}</b> of the 1,000 predictions gave the actual outcome less than 1% (each costs more than 6.6 bits). ${ts.value < 1.3 ? "The bins look roughly fine, yet the log-loss is far above the ~0.40 bits a calibrated model achieves: the model is <b>overconfident</b> in a few places, and log-loss notices." : ""} Dividing the logits by T &gt; 1 softens every prediction, without changing which days are ranked rainier.`,
        `T = ${fmt(ts.value)}：対数損失 <b>${fmt(m.nll, 3)}</b> ビット、Brier <b>${fmt(m.brier, 3)}</b>、較正誤差（ECE）<b>${fmt(m.ece, 3)}</b>。オレンジの点はそれぞれ予測のグループで、x = モデルの確信度、y = 実際に雨が降った頻度、大きさ = 予測の数です。較正されたモデルの点は対角線上に並びます。1,000個の予測のうち <b>${m.disasters}</b> 個は、実際の結果に1%未満しか与えていません（それぞれ6.6ビットを超えるコスト）。${ts.value < 1.3 ? "グループごとに見るとおおむね問題なさそうですが、対数損失は較正されたモデルが達成する約0.40ビットを大きく上回っています。モデルはいくつかの場所で<b>自信過剰</b>であり、対数損失はそれを見逃しません。" : ""}ロジットを T &gt; 1 で割ると、どの日がより雨らしいかの順位を変えずに、すべての予測がやわらぎます。`);
  }
  draw();
}
