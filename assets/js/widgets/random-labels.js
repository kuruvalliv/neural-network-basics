import { d3, L, div, slider, button, plot, legend, COLOR } from "./_lib.js";
import { fmt } from "../math.js";

export default async function mount(el) {
  const data = await (await fetch(new URL("../../../data/random-labels.json", import.meta.url))).json();
  const n = data.true.train.length, every = data.every, maxEp = (n - 1) * every;
  let timer = null;

  const ctl = div(el, "controls");
  const es = slider(ctl, { label: L("training step", "学習ステップ"), min: 0, max: n - 1, step: 1, value: n - 1, format: v => v * every, onInput: draw });
  button(ctl, L("▶ Replay", "▶ 再生"), () => {
    timer?.stop();
    const t0 = performance.now();
    timer = d3.timer(() => {
      const i = Math.min(n - 1, Math.floor((performance.now() - t0) / 40));
      es.set(i);
      if (i >= n - 1) timer.stop();
    });
  });

  const row = div(el, "row");
  const mk = (title, key) => {
    const box = div(row, "");
    div(box, "", `<div style="text-align:center;font-weight:600">${title}</div>`);
    const P = plot(box, { width: 340, height: 240, x: [0, maxEp], y: [0, 3], xLabel: "step", yLabel: "bits", xTicks: 4, yTicks: 4 });
    const line = (arr, c) => P.g.append("path").datum(arr).style("fill", "none").style("stroke", c).style("stroke-width", 2.5);
    return { P, key, train: line(data[key].train, COLOR.data), test: line(data[key].test, COLOR.loss), dots: P.g.append("g") };
  };
  const panels = [mk(L("real labels", "本物のラベル"), "true"), mk(L("random labels", "ランダムなラベル"), "random")];
  legend(el, [[COLOR.data, L("training loss", "訓練損失")], [COLOR.loss, L("loss on new data", "新しいデータでの損失")]]);
  const readout = div(el, "readout");

  function draw() {
    const k = es.value;
    panels.forEach(({ P, key, train, test, dots }) => {
      const seg = arr => d3.line().x((_, i) => P.x(i * every)).y(v => P.y(Math.min(3, v)))(arr.slice(0, k + 1));
      train.attr("d", seg(data[key].train));
      test.attr("d", seg(data[key].test));
      dots.selectAll("circle").data([data[key].train[k], data[key].test[k]]).join("circle")
        .attr("cx", P.x(k * every)).attr("cy", v => P.y(Math.min(3, v))).attr("r", 4)
        .style("fill", (_, i) => (i ? COLOR.loss : COLOR.data));
    });
    const T = data.true, R = data.random;
    const best = d3.minIndex(T.test);
    readout.innerHTML = L(
      `Step ${k * every}. Real labels: train ${fmt(T.train[k])} bits (accuracy ${Math.round(T.acc[k] * 100)}%), new data ${fmt(T.test[k])} bits. Random labels: train ${fmt(R.train[k])} bits (accuracy ${Math.round(R.acc[k] * 100)}%), new data ${fmt(R.test[k])} bits. The same network fits labels that carry <b>no pattern at all</b>; it is just slower at it, and on new data it never beats a coin flip (1 bit). Look at the real labels too. New-data loss is best around step ${best * every} (${fmt(T.test[best])} bits), then rises as the network starts memorizing the noisy days. That is the generalization gap of Chapter 12.`,
      `ステップ ${k * every}。本物のラベル：訓練 ${fmt(T.train[k])} ビット（正解率 ${Math.round(T.acc[k] * 100)}%）、新しいデータ ${fmt(T.test[k])} ビット。ランダムなラベル：訓練 ${fmt(R.train[k])} ビット（正解率 ${Math.round(R.acc[k] * 100)}%）、新しいデータ ${fmt(R.test[k])} ビット。同じネットワークが、<b>何のパターンもない</b>ラベルにも当てはまってしまいます。ただ時間がかかるだけで、新しいデータではコイン投げ（1ビット）に一度も勝てません。本物のラベルのほうも見てみましょう。新しいデータでの損失はステップ ${best * every} 付近（${fmt(T.test[best])} ビット）で最もよく、そのあと、ネットワークがノイズの多い日を記憶し始めると上がっていきます。これが第12章で扱う汎化ギャップです。`);
  }
  draw();
}
