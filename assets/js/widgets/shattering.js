import { d3, L, div, button, choice, COLOR } from "./_lib.js";

const PRESETS = {
  three: [[0.25, 0.3], [0.75, 0.35], [0.5, 0.78]],
  line3: [[0.2, 0.2], [0.5, 0.5], [0.8, 0.8]],
  four: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
};

// Perceptron with bias; converges iff the labelling is linearly separable (capped for the non-separable case).
function separate(pts, labels) {
  let w = [0, 0, 0];
  for (let ep = 0; ep < 2000; ep++) {
    let errors = 0;
    pts.forEach(([x, y], i) => {
      const t = labels[i] ? 1 : -1;
      if (t * (w[0] * x + w[1] * y + w[2]) <= 1e-9) { w = [w[0] + t * x, w[1] + t * y, w[2] + t]; errors++; }
    });
    if (!errors) return w;
  }
  return null;
}

export default function mount(el) {
  let pts = PRESETS.three.map(p => [...p]), labels = [1, 0, 0], tally = null;
  const ctl = div(el, "controls");
  const pre = choice(ctl, {
    label: L("Start from", "初期配置"), value: "three",
    options: [
      { value: "three", label: L("3 points", "3点") },
      { value: "line3", label: L("3 in a row", "一直線の3点") },
      { value: "four", label: L("4 points", "4点") },
    ],
    onChange: v => { pts = PRESETS[v].map(p => [...p]); labels = pts.map((_, i) => i % 2); tally = null; draw(); },
  });
  const ctl2 = div(el, "controls");
  button(ctl2, L("Test every labelling", "すべてのラベル付けを試す"), () => {
    const n = pts.length;
    const ok = d3.range(2 ** n).filter(m => separate(pts, d3.range(n).map(i => (m >> i) & 1))).length;
    tally = { ok, total: 2 ** n };
    draw();
  });
  button(ctl2, L("Clear points", "点を消す"), () => { pts = []; labels = []; tally = null; pre.set(null); draw(); });
  div(ctl2, "", `<span style="color:var(--muted)">${L("Click empty space to add a point (max 5); click a point to flip its colour.", "空いている場所をクリックすると点を追加（最大5個）、点をクリックすると色が反転します。")}</span>`);

  const S = 360;
  const svg = d3.select(el).append("svg").attr("class", "plot").attr("viewBox", `0 0 ${S} ${S}`).style("max-width", "420px").style("margin", "auto").style("overflow", "hidden");
  svg.append("rect").attr("width", S).attr("height", S).attr("rx", 8).style("fill", COLOR.grid).style("cursor", "crosshair")
    .on("click", ev => {
      if (pts.length >= 5) return;
      const [x, y] = d3.pointer(ev);
      pts.push([x / S, 1 - y / S]); labels.push(0); tally = null; pre.set(null); draw();
    });
  const lineG = svg.append("g"), ptG = svg.append("g");
  const readout = div(el, "readout");

  function draw() {
    const w = pts.length ? separate(pts, labels) : null;
    lineG.selectAll("*").remove();
    if (w && (w[0] || w[1])) {
      const xs = [-0.1, 1.1];
      const pt = Math.abs(w[1]) > 1e-9
        ? xs.map(x => [x, -(w[0] * x + w[2]) / w[1]])
        : [-0.1, 1.1].map(y => [-w[2] / w[0], y]);
      lineG.append("line").attr("x1", pt[0][0] * S).attr("y1", (1 - pt[0][1]) * S).attr("x2", pt[1][0] * S).attr("y2", (1 - pt[1][1]) * S)
        .style("stroke", COLOR.ink).style("stroke-width", 2).style("stroke-dasharray", "6 4");
    }
    ptG.selectAll("circle").data(pts).join("circle").attr("cx", p => p[0] * S).attr("cy", p => (1 - p[1]) * S).attr("r", 12)
      .style("fill", (_, i) => (labels[i] ? COLOR.p : COLOR.q)).style("stroke", "var(--panel)").style("stroke-width", 3).style("cursor", "pointer")
      .on("click", (ev, p) => { ev.stopPropagation(); const i = pts.indexOf(p); labels[i] = 1 - labels[i]; draw(); });

    const cur = !pts.length ? "" : w
      ? L("This colouring <b>can</b> be split by a straight line (dashed). ", "この色分けは直線（破線）で<b>分けられます</b>。")
      : L("This colouring <b>cannot</b> be split by any straight line. ", "この色分けは、どんな直線でも<b>分けられません</b>。");
    const all = tally
      ? (tally.ok === tally.total
        ? L(`All ${tally.total} colourings are separable, so these ${pts.length} points are <b>shattered</b> by lines.`, `${tally.total}通りの色分けすべてが分けられます。この${pts.length}点は直線によって<b>粉砕</b>されます。`)
        : L(`Only ${tally.ok} of ${tally.total} colourings are separable, so these points are <b>not</b> shattered.`, `${tally.total}通り中${tally.ok}通りしか分けられません。この点の組は粉砕<b>されません</b>。`))
      : "";
    readout.innerHTML = cur + all + "<br>" + L(
      "Lines in the plane can shatter some set of 3 points, but no set of 4. Their VC dimension is 3.",
      "平面上の直線は、ある3点の組を粉砕できますが、どんな4点の組も粉砕できません。直線の VC 次元は3です。");
  }
  draw();
}
