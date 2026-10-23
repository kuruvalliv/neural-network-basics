import { d3, L, div, choice, button, plot, legend, COLOR } from "./_lib.js";
import { rng } from "../math.js";

const FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const RVS = {
  face: { label: L("X = face value", "X = 出目"), f: k => k },
  even: { label: L("E = 1 if even", "E = 偶数なら1"), f: k => (k % 2 === 0 ? 1 : 0) },
  prize: { label: L("W = prize (6 pays 5, else −1)", "W = 賞金（6なら5、それ以外は−1）"), f: k => (k === 6 ? 5 : -1) },
};

export default function mount(el) {
  const r = rng(3);
  let key = "face";
  let rolls = [];

  const ctl = div(el, "controls");
  choice(ctl, {
    label: L("Random variable", "確率変数"),
    options: Object.entries(RVS).map(([value, v]) => ({ value, label: v.label })),
    value: key,
    onChange: v => { key = v; draw(); },
  });
  const ctl2 = div(el, "controls");
  button(ctl2, L("Roll once", "1回振る"), () => { rolls.push(1 + Math.floor(r() * 6)); draw(); });
  button(ctl2, L("Roll 100×", "100回振る"), () => { for (let i = 0; i < 100; i++) rolls.push(1 + Math.floor(r() * 6)); draw(); });
  button(ctl2, L("Reset", "リセット"), () => { rolls = []; draw(); });

  const row = div(el, "row");
  const left = div(row, "");
  const right = div(row, "");

  const W = 300, H = 250;
  const map = d3.select(left).append("svg").attr("class", "plot").attr("viewBox", `0 0 ${W} ${H}`);
  map.append("defs").append("marker").attr("id", "rv-arrow").attr("viewBox", "0 0 10 10")
    .attr("refX", 9).attr("refY", 5).attr("markerWidth", 6).attr("markerHeight", 6).attr("orient", "auto")
    .append("path").attr("d", "M0,0 L10,5 L0,10 z").style("fill", COLOR.muted);
  map.append("text").attr("x", 40).attr("y", 14).attr("text-anchor", "middle").text("Ω");
  map.append("text").attr("x", 250).attr("y", 14).attr("text-anchor", "middle").text("ℝ");
  const gMap = map.append("g");

  const P = plot(right, { width: 300, height: 250, xBand: ["0"], y: [0, 1], yLabel: "P", margin: { left: 44 } });
  legend(right, [[COLOR.p, L("P(value) from the 6 equally likely faces", "6つの等確率な目から決まる P(値)")], [COLOR.data, L("observed frequency", "観測された頻度")]]);
  const readout = div(el, "readout");

  function draw() {
    const f = RVS[key].f;
    const values = [...new Set([1, 2, 3, 4, 5, 6].map(f))].sort((a, b) => a - b);
    const oy = k => 30 + (k - 1) * 40;
    const vy = i => (values.length === 1 ? 130 : 30 + (i * 200) / Math.max(1, values.length - 1));
    const last = rolls.at(-1);

    gMap.selectAll("*").remove();
    [1, 2, 3, 4, 5, 6].forEach(k => {
      const vi = values.indexOf(f(k));
      const hot = k === last;
      gMap.append("line").attr("x1", 60).attr("y1", oy(k)).attr("x2", 228).attr("y2", vy(vi))
        .attr("marker-end", "url(#rv-arrow)")
        .style("stroke", hot ? COLOR.accent : COLOR.muted).style("stroke-width", hot ? 2.5 : 1).style("opacity", hot ? 1 : 0.6);
      gMap.append("text").attr("x", 40).attr("y", oy(k) + 9).attr("text-anchor", "middle")
        .style("font-size", "26px").style("fill", hot ? COLOR.accent : COLOR.ink).text(FACES[k - 1]);
    });
    values.forEach((v, i) => {
      gMap.append("text").attr("x", 250).attr("y", vy(i) + 5).attr("text-anchor", "middle")
        .style("font-size", "16px").style("font-weight", 600).text(v);
    });

    const cats = values.map(String);
    P.x.domain(cats);
    P.drawAxes();
    const pmf = values.map(v => [1, 2, 3, 4, 5, 6].filter(k => f(k) === v).length / 6);
    const freq = values.map(v => (rolls.length ? rolls.filter(k => f(k) === v).length / rolls.length : 0));
    const bw = P.x.bandwidth() / 2;
    P.g.selectAll("rect.pmf").data(pmf).join("rect").attr("class", "pmf")
      .attr("x", (_, i) => P.x(cats[i])).attr("width", bw)
      .attr("y", d => P.y(d)).attr("height", d => P.H - P.y(d)).style("fill", COLOR.p);
    P.g.selectAll("rect.freq").data(freq).join("rect").attr("class", "freq")
      .attr("x", (_, i) => P.x(cats[i]) + bw).attr("width", bw)
      .transition().duration(200)
      .attr("y", d => P.y(d)).attr("height", d => P.H - P.y(d)).style("fill", COLOR.data);

    readout.innerHTML = rolls.length
      ? L(`Rolls: <b>${rolls.length}</b>. Last face ${FACES[last - 1]} was sent to the number <b>${f(last)}</b>.`,
          `振った回数：<b>${rolls.length}</b>。最後の目 ${FACES[last - 1]} は数 <b>${f(last)}</b> に送られました。`)
      : L("Roll the die. The random variable is the set of arrows: a rule that sends each outcome to a number.",
          "サイコロを振ってみましょう。確率変数とは矢印の集まり、つまり各結果を数に送る規則です。");
  }
  draw();
}
