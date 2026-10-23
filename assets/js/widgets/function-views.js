import { d3, L, div, choice, h, plot, COLOR } from "./_lib.js";
import { CLS } from "../running-example.js";
import { fmt } from "../math.js";

const FUNCS = {
  rain: {
    label: L("f: humidity → P(rain)", "f: 湿度 → P(雨)"),
    inputs: [0, 0.2, 0.4, 0.6, 0.8, 1].map(String),
    out: x => CLS.pRain(+x),
    inName: ["h", "h"], outName: ["f(h)", "f(h)"],
  },
  dist: {
    label: L("q: weather → probability", "q: 天気 → 確率"),
    inputs: ["☀", "☁", "☂", "❄"],
    out: x => ({ "☀": 0.5, "☁": 0.25, "☂": 0.2, "❄": 0.05 })[x],
    inName: ["y", "y"], outName: ["q(y)", "q(y)"],
  },
};

export default function mount(el) {
  let fn = "rain", view = "table";
  const ctl = div(el, "controls");
  choice(ctl, {
    label: L("Function", "関数"),
    options: Object.entries(FUNCS).map(([value, f]) => ({ value, label: f.label })),
    value: fn, onChange: v => { fn = v; draw(); },
  });
  choice(ctl, {
    label: L("View as", "見せ方"),
    options: [
      { value: "table", label: L("table", "表") },
      { value: "arrows", label: L("arrows", "矢印") },
      { value: "graph", label: L("graph", "グラフ") },
    ],
    value: view, onChange: v => { view = v; draw(); },
  });
  const stage = div(el, "");
  const readout = div(el, "readout");
  document.addEventListener("langchange", draw);

  function draw() {
    const f = FUNCS[fn];
    stage.innerHTML = "";
    if (view === "table") {
      const t = h("table", { class: "w-table" });
      t.innerHTML = `<tr><th>${f.inName[0]}</th>${f.inputs.map(x => `<td>${x}</td>`).join("")}</tr>` +
        `<tr><th>${f.outName[0]}</th>${f.inputs.map(x => `<td>${fmt(f.out(x), 3)}</td>`).join("")}</tr>`;
      stage.append(t);
    } else if (view === "arrows") {
      const W = 520, H = 40 + f.inputs.length * 40;
      const svg = d3.select(stage).append("svg").attr("class", "plot").attr("viewBox", `0 0 ${W} ${H}`);
      const outs = f.inputs.map(f.out);
      const y = d3.scaleLinear().domain([0, 1]).range([H - 20, 20]);
      svg.append("line").attr("x1", 380).attr("x2", 380).attr("y1", y(0)).attr("y2", y(1)).style("stroke", COLOR.muted);
      [0, 0.5, 1].forEach(v => svg.append("text").attr("x", 392).attr("y", y(v) + 4).style("fill", COLOR.muted).text(v));
      f.inputs.forEach((x, i) => {
        const yi = 30 + i * 40;
        svg.append("text").attr("x", 60).attr("y", yi + 5).attr("text-anchor", "middle").style("font-size", "16px").text(x);
        svg.append("line").attr("x1", 90).attr("y1", yi).attr("x2", 372).attr("y2", y(outs[i]))
          .style("stroke", COLOR.p).style("opacity", 0.7);
        svg.append("circle").attr("cx", 380).attr("cy", y(outs[i])).attr("r", 4).style("fill", COLOR.p);
      });
    } else {
      const disc = fn === "dist";
      const P = plot(stage, { height: 260, x: [0, 1], xBand: disc ? f.inputs : null, y: [0, 1], xLabel: f.inName[0], yLabel: f.outName[0] });
      if (disc) {
        P.g.selectAll("rect").data(f.inputs).join("rect").attr("x", d => P.x(d)).attr("width", P.x.bandwidth())
          .attr("y", d => P.y(f.out(d))).attr("height", d => P.H - P.y(f.out(d))).style("fill", COLOR.p);
      } else {
        P.g.append("path").attr("d", d3.line().x(d => P.x(d)).y(d => P.y(CLS.pRain(d)))(d3.range(0, 1.001, 0.01)))
          .style("fill", "none").style("stroke", COLOR.p).style("stroke-width", 2.5);
        P.g.selectAll("circle").data(f.inputs).join("circle").attr("cx", d => P.x(+d)).attr("cy", d => P.y(f.out(d))).attr("r", 4).style("fill", COLOR.p);
      }
    }
    readout.innerHTML = fn === "dist"
      ? L("A distribution is <b>also</b> a function: each outcome goes in, its probability comes out. The only extra rule is that the outputs add up to 1.",
          "分布<b>も</b>関数です。結果を入れると、その確率が出てきます。追加の決まりは、出力の合計が1になることだけです。")
      : L("Three pictures of one object. A function is simply the complete list of input → output pairs; the table, arrows, and graph are different ways to draw that list.",
          "同じ対象の3つの描き方です。関数とは、入力→出力の組の完全な一覧にすぎません。表・矢印・グラフは、その一覧の描き方が違うだけです。");
  }
  draw();
}
