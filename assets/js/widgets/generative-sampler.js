import { L, div, slider, button, COLOR, tex } from "./_lib.js";
import { rng, fmt } from "../math.js";

export default function mount(el) {
  let seed = 1;
  const ctl = div(el, "controls");
  const p0 = slider(ctl, { label: L("p(☂ | yesterday ☀)", "p(☂ | 昨日 ☀)"), min: 0.01, max: 0.99, step: 0.01, value: 0.15, onInput: draw });
  const p1 = slider(ctl, { label: L("p(☂ | yesterday ☂)", "p(☂ | 昨日 ☂)"), min: 0.01, max: 0.99, step: 0.01, value: 0.7, onInput: draw });
  button(ctl, L("Sample new months", "新しい月をサンプル"), () => { seed += 3; draw(); });
  const seqs = div(el, "");
  seqs.style.cssText = "font-size:18px;letter-spacing:1px;line-height:1.6;word-break:break-all";
  const readout = div(el, "readout");

  function draw() {
    const r = rng(seed);
    const months = [0, 1, 2].map(() => {
      let prev = r() < 0.3 ? 1 : 0;
      const days = [prev];
      let logp = Math.log2(prev ? 0.3 : 0.7);
      for (let t = 1; t < 30; t++) {
        const p = prev ? p1.value : p0.value;
        const x = r() < p ? 1 : 0;
        logp += Math.log2(x ? p : 1 - p);
        days.push(x);
        prev = x;
      }
      return { days, logp };
    });
    seqs.innerHTML = months.map(m => `<div>${m.days.map(d => (d ? `<span style="color:${COLOR.p}">☂</span>` : "☀")).join("")} <small style="font-size:12px;color:var(--muted)">log₂ p = ${fmt(m.logp, 1)}</small></div>`).join("");
    readout.innerHTML = tex("p(x_1,\\dots,x_{30})=p(x_1)\\prod_{t=2}^{30}p(x_t\\mid x_{t-1})") + "<br>" +
      L("A generative model learns p(x) itself: here, whole months of weather. The chain rule turns it into a sequence of conditionals, and each one is exactly the kind of object this book learns. Raise p(☂ | ☂) and rainy spells get longer. Large language models are this same idea, with a neural network conditioning on all the previous tokens.",
        "生成モデルは p(x) そのものを学習します。ここでは、1か月分の天気まるごとです。連鎖律によって、それは条件付き分布の列に変わります。その1つ1つが、まさにこの本で学んできた種類の対象です。p(☂ | ☂) を上げると、雨の続く期間が長くなります。大規模言語モデルも同じ考え方で、それまでのすべてのトークンを条件とするニューラルネットワークを使っています。");
  }
  draw();
}
