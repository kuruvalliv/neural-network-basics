import { d3, L, div, slider, button, plot, COLOR, h } from "./_lib.js";
import { fmt } from "../math.js";

const BASE = [[-1.2, -0.8], [1.4, -0.6], [0.1, 1.4]];

export default function mount(el) {
  const ctl = div(el, "controls");
  const dx = slider(ctl, { label: L("shift →", "右へ移動"), min: -3, max: 3, step: 0.01, value: 0, onInput: draw });
  const dy = slider(ctl, { label: L("shift ↑", "上へ移動"), min: -3, max: 3, step: 0.01, value: 0, onInput: draw });
  const rot = slider(ctl, { label: L("rotate", "回転"), min: -180, max: 180, step: 1, value: 0, format: v => `${v}°`, onInput: draw });
  button(ctl, L("Reset", "リセット"), () => { dx.set(0); dy.set(0); rot.set(0); });

  const row = div(el, "row");
  const P = plot(div(row, ""), { width: 360, height: 340, x: [-5, 5], y: [-5, 5], xTicks: 5, yTicks: 5 });
  const ghost = P.g.append("path").style("fill", "none").style("stroke", COLOR.muted).style("stroke-dasharray", "4 3");
  const shape = P.g.append("path").style("fill", COLOR.p).style("fill-opacity", 0.3).style("stroke", COLOR.p).style("stroke-width", 2);
  const cen = P.g.append("circle").attr("r", 6).style("fill", COLOR.q);
  const ghostCen = P.g.append("circle").attr("r", 4).style("fill", COLOR.muted);
  const side = div(row, "");
  const table = h("table", { class: "w-table" });
  side.append(table);
  const readout = div(el, "readout");

  const pathOf = pts => `M${pts.map(p => `${P.x(p[0])},${P.y(p[1])}`).join("L")}Z`;
  const centroid = pts => [d3.mean(pts, p => p[0]), d3.mean(pts, p => p[1])];
  const area = pts => Math.abs(d3.sum(pts, (p, i) => { const q = pts[(i + 1) % pts.length]; return p[0] * q[1] - q[0] * p[1]; })) / 2;

  function draw() {
    const a = (rot.value * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    const pts = BASE.map(([x, y]) => [c * x - s * y + dx.value, s * x + c * y + dy.value]);
    ghost.attr("d", pathOf(BASE));
    shape.attr("d", pathOf(pts));
    const [cx, cy] = centroid(pts), [gx, gy] = centroid(BASE);
    cen.attr("cx", P.x(cx)).attr("cy", P.y(cy));
    ghostCen.attr("cx", P.x(gx)).attr("cy", P.y(gy));
    const moved = Math.abs(dx.value) + Math.abs(dy.value) + Math.abs(rot.value) > 0;
    table.innerHTML =
      `<tr><th>${L("output", "出力")}</th><th>${L("value", "値")}</th><th>${L("kind", "種類")}</th></tr>` +
      `<tr><td>${L("is it a triangle?", "三角形か？")}</td><td>${L("yes", "はい")}</td><td>${L("invariant", "不変")}</td></tr>` +
      `<tr><td>${L("area", "面積")}</td><td>${fmt(area(pts))}</td><td>${L("invariant", "不変")}</td></tr>` +
      `<tr><td style="color:var(--q)">${L("centre", "重心")}</td><td>(${fmt(cx)}, ${fmt(cy)})</td><td>${L("equivariant", "同変")}</td></tr>` +
      `<tr><td>${L("x of first corner", "最初の頂点の x")}</td><td>${fmt(pts[0][0])}</td><td>${L("neither", "どちらでもない")}</td></tr>`;
    readout.innerHTML = moved
      ? L("Whatever you do to the shape, the first two outputs do not change. The centre moves <em>exactly as the shape moves</em>. A model that already knows this does not have to learn it from data, separately for every position and angle.",
          "図形に何をしても、上の2つの出力は変わりません。重心は<em>図形の動きとまったく同じように</em>動きます。これをあらかじめ知っているモデルは、位置や角度ごとにデータから学び直す必要がありません。")
      : L("Move or rotate the triangle and watch which outputs change.", "三角形を動かしたり回したりして、どの出力が変わるかを見てみましょう。");
  }
  draw();
}
