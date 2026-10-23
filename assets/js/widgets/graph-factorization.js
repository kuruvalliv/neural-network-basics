import { d3, L, div, COLOR, tex } from "./_lib.js";

const NODES = {
  T: { x: 90, y: 60, k: 3 },
  H: { x: 330, y: 60, k: 3 },
  R: { x: 210, y: 190, k: 2 },
};
const EDGES = [["T", "H"], ["H", "R"], ["T", "R"]];

export default function mount(el) {
  const on = { TH: true, HR: true, TR: true };
  div(el, "", `<p style="margin:0 0 .4rem">${L(
    "T = temperature (3 levels), H = humidity (3 levels), R = rain (yes/no). Click an arrow to remove or restore it.",
    "T = 気温（3段階）、H = 湿度（3段階）、R = 雨（あり/なし）。矢印をクリックすると、消したり戻したりできます。")}</p>`);

  const svg = d3.select(el).append("svg").attr("class", "plot").attr("viewBox", "0 0 420 240");
  svg.append("defs").append("marker").attr("id", "gf-arrow").attr("viewBox", "0 0 10 10")
    .attr("refX", 10).attr("refY", 5).attr("markerWidth", 7).attr("markerHeight", 7).attr("orient", "auto")
    .append("path").attr("d", "M0,0 L10,5 L0,10 z").style("fill", COLOR.ink);
  const gE = svg.append("g"), gN = svg.append("g");
  const readout = div(el, "readout");

  Object.entries(NODES).forEach(([name, n]) => {
    gN.append("circle").attr("cx", n.x).attr("cy", n.y).attr("r", 26)
      .style("fill", name === "R" ? COLOR.p : COLOR.grid).style("stroke", COLOR.ink);
    gN.append("text").attr("x", n.x).attr("y", n.y + 6).attr("text-anchor", "middle")
      .style("font-size", "18px").style("font-weight", 700).style("fill", name === "R" ? "#fff" : COLOR.ink).text(name);
  });

  function draw() {
    gE.selectAll("*").remove();
    EDGES.forEach(([a, b]) => {
      const A = NODES[a], B = NODES[b], key = a + b;
      const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy);
      const x1 = A.x + (dx / len) * 28, y1 = A.y + (dy / len) * 28, x2 = B.x - (dx / len) * 30, y2 = B.y - (dy / len) * 30;
      gE.append("line").attr("x1", x1).attr("y1", y1).attr("x2", x2).attr("y2", y2)
        .attr("marker-end", on[key] ? "url(#gf-arrow)" : null)
        .style("stroke", on[key] ? COLOR.ink : COLOR.muted).style("stroke-width", on[key] ? 2.5 : 1.5)
        .style("stroke-dasharray", on[key] ? null : "5 5").style("opacity", on[key] ? 1 : 0.5);
      gE.append("line").attr("x1", x1).attr("y1", y1).attr("x2", x2).attr("y2", y2)
        .style("stroke", "transparent").style("stroke-width", 22).style("cursor", "pointer")
        .on("click", () => { on[key] = !on[key]; draw(); });
    });

    const pa = { T: [], H: on.TH ? ["T"] : [], R: [...(on.TR ? ["T"] : []), ...(on.HR ? ["H"] : [])] };
    const count = v => (NODES[v].k - 1) * pa[v].reduce((s, p) => s * NODES[p].k, 1);
    const total = count("T") + count("H") + count("R");
    const term = v => (pa[v].length ? `p(${v}\\mid ${pa[v].join(",")})` : `p(${v})`);
    const ci = !on.TR && on.HR && on.TH
      ? L("Rain now depends on temperature <em>only through</em> humidity: R ⊥ T | H.", "雨は気温に、湿度を<em>通してのみ</em>依存するようになりました：R ⊥ T | H。")
      : "";
    readout.innerHTML =
      tex(`p(T,H,R)=${term("T")}\\,${term("H")}\\,${term("R")}`) + "<br>" +
      L(`Free numbers to learn: <b>${count("T")} + ${count("H")} + ${count("R")} = ${total}</b> (a full table needs 17). `,
        `学習すべき自由な数：<b>${count("T")} + ${count("H")} + ${count("R")} = ${total}</b>（表をまるごと持つと17）。`) + ci;
  }
  draw();
}
