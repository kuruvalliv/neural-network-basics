import { d3, L, div, choice, COLOR, tex } from "./_lib.js";
import { CLS } from "../running-example.js";
import { linspace, fmt } from "../math.js";

const B = 5;
const lang = () => document.documentElement.dataset.lang;

export default function mount(el) {
  const rain = d3.range(B).map(j => {
    const xs = linspace(j / B, (j + 1) / B, 50);
    return d3.mean(xs, CLS.pRain) / B;
  });
  const joint = [rain, rain.map(v => 1 / B - v)];
  const rowSum = joint.map(r => d3.sum(r));
  const colSum = d3.range(B).map(j => joint[0][j] + joint[1][j]);

  let mode = "joint", sel = 3;
  const ctl = div(el, "controls");
  const modeCtl = choice(ctl, {
    label: L("Show", "表示"),
    options: [
      { value: "joint", label: L("joint", "同時") },
      { value: "marg", label: L("marginals", "周辺") },
      { value: "condH", label: L("given humidity", "湿度で条件付け") },
      { value: "condR", label: L("given weather", "天気で条件付け") },
    ],
    value: mode,
    onChange: v => { mode = v; sel = v === "condR" ? 0 : 3; draw(); },
  });

  const W = 620, H = 205, x0 = 120, cw = 80, rh = 64, y0 = 30;
  const svg = d3.select(el).append("svg").attr("class", "plot").attr("viewBox", `0 0 ${W} ${H}`);
  const g = svg.append("g");
  const readout = div(el, "readout");
  document.addEventListener("langchange", draw);

  const color = d3.scaleLinear().domain([0, d3.max(joint.flat())]).range([0.08, 0.95]);

  function draw() {
    const ja = lang() === "ja";
    const rowNames = ja ? ["雨", "晴れ"] : ["rain", "no rain"];
    g.selectAll("*").remove();

    d3.range(B).forEach(j => {
      g.append("text").attr("x", x0 + j * cw + cw / 2).attr("y", y0 - 10).attr("text-anchor", "middle")
        .style("cursor", "pointer").style("fill", mode === "condH" && sel === j ? COLOR.accent : COLOR.muted)
        .text(`${(j / B).toFixed(1)}–${((j + 1) / B).toFixed(1)}`)
        .on("click", () => { mode = "condH"; sel = j; modeCtl.set("condH"); draw(); });
    });
    g.append("text").attr("x", x0 - 10).attr("y", y0 - 10).attr("text-anchor", "end").style("fill", COLOR.muted).text(ja ? "湿度 →" : "humidity →");
    g.append("text").attr("x", x0 + B * cw + 45).attr("y", y0 - 10).attr("text-anchor", "middle").style("fill", COLOR.muted).text(ja ? "行の和" : "row sum");

    [0, 1].forEach(r => {
      const y = y0 + r * rh;
      g.append("text").attr("x", x0 - 10).attr("y", y + rh / 2 + 5).attr("text-anchor", "end")
        .style("cursor", "pointer").style("font-weight", 600)
        .style("fill", mode === "condR" && sel === r ? COLOR.accent : COLOR.ink).text(rowNames[r])
        .on("click", () => { mode = "condR"; sel = r; modeCtl.set("condR"); draw(); });

      d3.range(B).forEach(j => {
        const active = mode === "joint" || (mode === "condH" && sel === j) || (mode === "condR" && sel === r);
        let v = joint[r][j];
        if (mode === "condH" && sel === j) v = joint[r][j] / colSum[j];
        if (mode === "condR" && sel === r) v = joint[r][j] / rowSum[r];
        g.append("rect").attr("x", x0 + j * cw + 2).attr("y", y + 2).attr("width", cw - 4).attr("height", rh - 4).attr("rx", 6)
          .style("fill", r === 0 ? COLOR.p : COLOR.data)
          .style("opacity", active ? color(joint[r][j]) : 0.06)
          .style("cursor", "pointer")
          .on("click", () => { mode = "condH"; sel = j; modeCtl.set("condH"); draw(); });
        g.append("text").attr("x", x0 + j * cw + cw / 2).attr("y", y + rh / 2 + 5).attr("text-anchor", "middle")
          .style("pointer-events", "none").style("font-weight", active ? 600 : 400)
          .style("fill", active ? COLOR.ink : COLOR.muted).text(fmt(v, 3));
      });
      g.append("text").attr("x", x0 + B * cw + 45).attr("y", y + rh / 2 + 5).attr("text-anchor", "middle")
        .style("font-weight", mode === "marg" ? 700 : 400).style("fill", mode === "marg" ? COLOR.accent : COLOR.muted)
        .text(fmt(rowSum[r], 3));
    });
    const ys = y0 + 2 * rh + 26;
    g.append("text").attr("x", x0 - 10).attr("y", ys).attr("text-anchor", "end").style("fill", COLOR.muted).text(ja ? "列の和" : "column sum");
    d3.range(B).forEach(j => {
      g.append("text").attr("x", x0 + j * cw + cw / 2).attr("y", ys).attr("text-anchor", "middle")
        .style("font-weight", mode === "marg" ? 700 : 400).style("fill", mode === "marg" ? COLOR.accent : COLOR.muted)
        .text(fmt(colSum[j], 3));
    });

    const bin = `h\\in[${(sel / B).toFixed(1)},${((sel + 1) / B).toFixed(1)}]`;
    const w = ["\\text{rain}", "\\text{no rain}"];
    const wJa = ["\\text{雨}", "\\text{晴れ}"];
    const ww = ja ? wJa : w;
    const msgs = {
      joint: L("Each cell is the probability of one <em>pair</em> (humidity range, weather). All ten cells add up to 1. Click a column header or a row name to condition.",
               "各マスは「湿度の範囲」と「天気」の<em>組</em>の確率です。10マスの合計は1になります。列の見出しや行の名前をクリックすると条件付けできます。"),
      marg: L(`Marginals: sum over what you ignore. Row sums give ${tex("p(\\text{rain})")}. Column sums give ${tex("p(h)")}, which is 0.2 each because humidity is uniform here.`,
              `周辺分布：無視する変数について足し合わせます。行の和が ${tex("p(\\text{雨})")}、列の和が ${tex("p(h)")} です。ここでは湿度が一様なので、列の和はどれも0.2になります。`),
      condH: `${tex(`p(${ww[0]}\\mid ${bin})=\\frac{${fmt(joint[0][sel], 3)}}{${fmt(colSum[sel], 3)}}=${fmt(joint[0][sel] / colSum[sel], 3)}`)}<br>` +
        L("Conditioning = keep one column and rescale it so it sums to 1.", "条件付け＝1列だけ残し、合計が1になるように拡大すること。"),
      condR: `${tex(`p(h\\mid ${ww[sel]})`)} ` +
        L("— the same table, sliced the other way. This switch of direction is Bayes' rule:",
          "— 同じ表を、もう一方の向きに切ったものです。この切り方の入れ替えがベイズの定理です：") +
        tex("p(h\\mid y)=\\dfrac{p(y\\mid h)\\,p(h)}{p(y)}", true),
    };
    readout.innerHTML = msgs[mode];
  }
  draw();
}
