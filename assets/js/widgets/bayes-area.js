import { d3, L, div, slider, choice, COLOR, tex } from "./_lib.js";
import { fmt } from "../math.js";

const lang = () => document.documentElement.dataset.lang;

export default function mount(el) {
  let observed = false;
  const ctl = div(el, "controls");
  const prior = slider(ctl, { label: L("p(rain)", "p(雨)"), min: 0.01, max: 0.99, step: 0.01, value: 0.3, onInput: draw });
  const lr = slider(ctl, { label: L("p(clouds | rain)", "p(曇り | 雨)"), min: 0, max: 1, step: 0.01, value: 0.9, onInput: draw });
  const ld = slider(ctl, { label: L("p(clouds | no rain)", "p(曇り | 晴れ)"), min: 0, max: 1, step: 0.01, value: 0.4, onInput: draw });
  choice(div(el, "controls"), {
    label: L("This morning", "今朝"),
    options: [{ value: "no", label: L("not looked yet", "まだ見ていない") }, { value: "yes", label: L("it is cloudy", "曇っている") }],
    value: "no",
    onChange: v => { observed = v === "yes"; draw(); },
  });

  const W = 600, H = 300, S = 260;
  const svg = d3.select(el).append("svg").attr("class", "plot").attr("viewBox", `0 0 ${W} ${H}`);
  const g = svg.append("g").attr("transform", "translate(20,20)");
  const readout = div(el, "readout");
  document.addEventListener("langchange", draw);

  function draw() {
    const ja = lang() === "ja";
    const pr = prior.value, a = lr.value, b = ld.value;
    const wR = S * pr, wD = S - wR;
    const cloudyR = pr * a, cloudyD = (1 - pr) * b, cloudy = cloudyR + cloudyD;
    const post = cloudy > 0 ? cloudyR / cloudy : 0;
    g.selectAll("*").remove();

    const regions = [
      { x: 0, y: S * (1 - a), w: wR, h: S * a, c: COLOR.p, cloud: true },
      { x: 0, y: 0, w: wR, h: S * (1 - a), c: COLOR.p, cloud: false },
      { x: wR, y: S * (1 - b), w: wD, h: S * b, c: COLOR.data, cloud: true },
      { x: wR, y: 0, w: wD, h: S * (1 - b), c: COLOR.data, cloud: false },
    ];
    g.selectAll("rect.r").data(regions).join("rect").attr("class", "r")
      .attr("x", d => d.x).attr("y", d => d.y).attr("width", d => Math.max(0, d.w)).attr("height", d => Math.max(0, d.h))
      .style("fill", d => d.c).style("stroke", "var(--panel)").style("stroke-width", 2)
      .style("opacity", d => (observed ? (d.cloud ? 0.85 : 0.07) : d.cloud ? 0.75 : 0.35));
    if (wR > 40) g.append("text").attr("x", wR / 2).attr("y", S + 18).attr("text-anchor", "middle").text(ja ? "雨" : "rain");
    if (wD > 40) g.append("text").attr("x", wR + wD / 2).attr("y", S + 18).attr("text-anchor", "middle").text(ja ? "晴れ" : "no rain");
    g.append("text").attr("x", S + 8).attr("y", S - 6).style("fill", COLOR.muted).text(ja ? "↑ 曇りの部分" : "↑ cloudy part");

    const bx = 340, bw = 200;
    g.append("text").attr("x", bx).attr("y", 10).style("font-weight", 600)
      .text(observed ? (ja ? "曇りを見たあとの p(雨)" : "p(rain) after seeing clouds") : (ja ? "事前の p(雨)" : "p(rain) before looking"));
    const val = observed ? post : pr;
    g.append("rect").attr("x", bx).attr("y", 24).attr("width", bw).attr("height", 26).attr("rx", 4).style("fill", COLOR.grid);
    g.append("rect").attr("x", bx).attr("y", 24).attr("width", bw * val).attr("height", 26).attr("rx", 4).style("fill", COLOR.p);
    g.append("text").attr("x", bx + bw + 8).attr("y", 42).style("font-weight", 600).text(fmt(val));
    if (observed) {
      g.append("text").attr("x", bx).attr("y", 80).style("fill", COLOR.muted).text(ja ? "＝ 青い曇り面積 ÷ 曇り面積の合計" : "= blue cloudy area ÷ all cloudy area");
      g.append("rect").attr("x", bx).attr("y", 92).attr("width", bw * (cloudyR / Math.max(cloudy, 1e-9))).attr("height", 18).style("fill", COLOR.p).style("opacity", 0.85);
      g.append("rect").attr("x", bx + bw * (cloudyR / Math.max(cloudy, 1e-9))).attr("y", 92).attr("width", bw * (cloudyD / Math.max(cloudy, 1e-9))).attr("height", 18).style("fill", COLOR.data).style("opacity", 0.85);
    }

    readout.innerHTML = observed
      ? tex(`p(\\text{rain}\\mid\\text{clouds})=\\frac{p(\\text{clouds}\\mid\\text{rain})\\,p(\\text{rain})}{p(\\text{clouds})}=\\frac{${fmt(a)}\\times${fmt(pr)}}{${fmt(cloudy, 3)}}=${fmt(post, 3)}`, true)
      : L("The square is all mornings. Width splits rain from no rain; height inside each column is the chance of clouds. Now choose “it is cloudy”.",
          "正方形は「すべての朝」です。横幅で雨と晴れを分け、各列の中の高さが曇る確率を表します。「曇っている」を選んでみましょう。");
  }
  draw();
}
