import { d3, L, div, slider, COLOR } from "./_lib.js";
import { fmt } from "../math.js";

// Stylized error model for intuition only; the shapes follow Chapters 8, 9, and 12.
const approx = s => 0.6 / s ** 1.3;
const estim = (s, n) => Math.min(1.2, (0.9 * s) / Math.sqrt(n));
const optim = (s, t) => 0.8 * Math.exp(-t / (40 * s));

export default function mount(el) {
  const ctl = div(el, "controls");
  const ss = slider(ctl, { label: L("model size", "モデルの大きさ"), min: 1, max: 10, step: 0.1, value: 2, format: v => v.toFixed(1), onInput: draw });
  const ns = slider(ctl, { label: L("data points", "データ数"), min: 1, max: 4, step: 0.01, value: 2, format: v => Math.round(10 ** v), onInput: draw });
  const ts = slider(ctl, { label: L("training steps", "学習ステップ"), min: 0, max: 4, step: 0.01, value: 2, format: v => Math.round(10 ** v), onInput: draw });

  const W = 600, H = 120;
  const svg = d3.select(el).append("svg").attr("class", "plot").attr("viewBox", `0 0 ${W} ${H}`);
  const x = d3.scaleLinear().domain([0, 2.6]).range([0, W - 20]);
  const g = svg.append("g").attr("transform", "translate(10,20)");
  const readout = div(el, "readout");
  const lang = () => document.documentElement.dataset.lang;
  document.addEventListener("langchange", draw);

  function draw() {
    const s = ss.value, n = 10 ** ns.value, t = 10 ** ts.value;
    const parts = [
      { k: lang() === "ja" ? "近似（第III部）" : "approximation (Part III)", v: approx(s), c: COLOR.p },
      { k: lang() === "ja" ? "推定（第4・12章）" : "estimation (Ch. 4, 12)", v: estim(s, n), c: COLOR.q },
      { k: lang() === "ja" ? "最適化（第IV部）" : "optimization (Part IV)", v: optim(s, t), c: COLOR.loss },
    ];
    let acc = 0;
    parts.forEach(p => { p.x0 = acc; acc += p.v; });
    g.selectAll("rect").data(parts).join("rect").attr("x", p => x(p.x0)).attr("y", 10).attr("height", 40)
      .attr("width", p => Math.max(0, x(p.v) - x(0))).style("fill", p => p.c);
    g.selectAll("text.lbl").data(parts).join("text").attr("class", "lbl")
      .attr("x", p => x(p.x0) + 4).attr("y", 70 + 0).attr("dy", (_, i) => i * 0).style("font-size", "11px")
      .style("display", p => (x(p.v) - x(0) > 70 ? null : "none")).text(p => p.k);
    g.selectAll("text.tot").data([acc]).join("text").attr("class", "tot").attr("x", Math.min(x(acc) + 6, W - 80)).attr("y", 36)
      .style("font-weight", 700).text(v => `= ${fmt(v)}`);
    const worst = parts.reduce((a, b) => (b.v > a.v ? b : a));
    readout.innerHTML = L(
      `Illustrative only. The biggest slice right now is <b>${worst.k}</b>. Bigger models shrink the blue slice but grow orange (unless you add data) and take longer to optimize (red). Each fix targets one slice.`,
      `あくまで説明用の模式図です。いま最も大きいのは<b>${worst.k}</b>です。モデルを大きくすると青は縮みますが、（データを増やさない限り）オレンジは伸び、最適化にも時間がかかります（赤）。どの対策も、1つの部分にしか効きません。`);
  }
  draw();
}
