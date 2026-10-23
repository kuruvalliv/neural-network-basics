import { d3, L, div, choice, button, plot, COLOR } from "./_lib.js";
import { SURFACES, grad, drawContours } from "./_surface.js";
import { rng, fmt } from "../math.js";

const LABELS = {
  bowl: L("convex bowl", "凸なお椀"),
  ravine: L("narrow ravine", "細い峡谷"),
  twin: L("twin valleys + saddle", "双子の谷＋鞍点"),
  plateau: L("plateau", "台地"),
  golf: L("golf hole", "ゴルフのホール"),
  rain: L("rain model (w, b)", "雨のモデル (w, b)"),
};

export default function mount(el) {
  let key = el.closest("figure")?.dataset.preset || "bowl", timer = null, seed = 1;
  const ctl = div(el, "controls");
  choice(ctl, {
    label: L("Landscape", "地形"), value: key,
    options: Object.keys(LABELS).map(k => ({ value: k, label: LABELS[k] })),
    onChange: v => { key = v; setup(); },
  });
  const ctl2 = div(el, "controls");
  button(ctl2, L("Drop 40 random balls", "ボールを40個ランダムに落とす"), () => scatter());
  button(ctl2, L("Clear", "クリア"), () => { balls.selectAll("*").remove(); readout.innerHTML = hint(); });
  div(ctl2, "", `<span style="color:var(--muted)">${L("Click the map to drop one ball.", "地図をクリックするとボールを1つ落とせます。")}</span>`);

  const box = div(el, "");
  let P, balls;
  const readout = div(el, "readout");
  const hint = () => L("Each ball rolls downhill using only the local slope (gradient descent).", "どのボールも、足元の傾きだけを使って坂を下ります（勾配降下法）。");

  const descend = (S, x, y, steps = 400) => {
    const path = [[x, y]];
    for (let k = 0; k < steps; k++) {
      const [gx, gy] = grad(S.f, x, y);
      x -= S.lr * gx; y -= S.lr * gy;
      x = Math.max(S.dom[0][0], Math.min(S.dom[0][1], x));
      y = Math.max(S.dom[1][0], Math.min(S.dom[1][1], y));
      path.push([x, y]);
    }
    return path;
  };

  function setup() {
    timer?.stop();
    box.innerHTML = "";
    const S = SURFACES[key];
    P = plot(box, { width: 460, height: 400, x: S.dom[0], y: S.dom[1], xLabel: key === "rain" ? "w" : "θ₁", yLabel: key === "rain" ? "b" : "θ₂" });
    const { lo } = drawContours(P, S.f, S.dom);
    P.lo = lo;
    balls = P.g.append("g");
    P.g.append("rect").attr("width", P.W).attr("height", P.H).style("fill", "transparent").style("cursor", "crosshair")
      .on("click", ev => {
        const [mx, my] = d3.pointer(ev);
        roll(P.x.invert(mx), P.y.invert(my));
      });
    balls.raise();
    readout.innerHTML = hint();
  }

  function roll(x0, y0) {
    const S = SURFACES[key], path = descend(S, x0, y0, 300);
    const line = d3.line().x(p => P.x(p[0])).y(p => P.y(p[1]));
    const trail = balls.append("path").style("fill", "none").style("stroke", COLOR.loss).style("stroke-width", 2);
    const dot = balls.append("circle").attr("r", 6).style("fill", COLOR.loss).style("stroke", "#fff").style("stroke-width", 1.5);
    let k = 0;
    timer?.stop();
    timer = d3.timer(() => {
      k = Math.min(path.length - 1, k + 3);
      trail.attr("d", line(path.slice(0, k + 1)));
      dot.attr("cx", P.x(path[k][0])).attr("cy", P.y(path[k][1]));
      if (k >= path.length - 1) {
        timer.stop();
        const end = path.at(-1), gnorm = Math.hypot(...grad(S.f, ...end));
        readout.innerHTML = L(
          `Stopped at (${fmt(end[0])}, ${fmt(end[1])}), loss ${fmt(S.f(...end), 3)}, slope ${gnorm < 1e-3 ? "≈ 0" : fmt(gnorm, 3)}. ${gnorm > 0.05 ? "Still moving: progress is slow here." : S.f(...end) > P.lo + 0.1 * Math.abs(P.lo) + 0.02 ? "Stuck where the slope is zero, but this is <b>not</b> the lowest point." : "Reached a lowest point."}`,
          `(${fmt(end[0])}, ${fmt(end[1])}) で停止。損失 ${fmt(S.f(...end), 3)}、傾き ${gnorm < 1e-3 ? "≈ 0" : fmt(gnorm, 3)}。${gnorm > 0.05 ? "まだ動いています。ここでは進みが遅いのです。" : S.f(...end) > P.lo + 0.1 * Math.abs(P.lo) + 0.02 ? "傾きが0の場所で止まりましたが、ここは最も低い点では<b>ありません</b>。" : "最も低い点に着きました。"}`);
      }
    });
  }

  function scatter() {
    timer?.stop();
    const S = SURFACES[key], r = rng(seed++);
    const ends = d3.range(40).map(() => {
      const x = S.dom[0][0] + r() * (S.dom[0][1] - S.dom[0][0]), y = S.dom[1][0] + r() * (S.dom[1][1] - S.dom[1][0]);
      return { start: [x, y], end: descend(S, x, y).at(-1) };
    });
    const good = e => S.f(...e.end) < P.lo + 0.1 * Math.abs(P.lo) + 0.02;
    balls.selectAll("*").remove();
    balls.selectAll("line").data(ends).join("line")
      .attr("x1", e => P.x(e.start[0])).attr("y1", e => P.y(e.start[1])).attr("x2", e => P.x(e.end[0])).attr("y2", e => P.y(e.end[1]))
      .style("stroke", "#fff").style("opacity", 0.35);
    balls.selectAll("circle").data(ends).join("circle").attr("cx", e => P.x(e.end[0])).attr("cy", e => P.y(e.end[1])).attr("r", 5)
      .style("fill", e => (good(e) ? COLOR.ok : COLOR.loss)).style("stroke", "#fff");
    const n = ends.filter(good).length;
    readout.innerHTML = L(`<b>${n} of 40</b> balls reached the lowest region (green). The rest stopped on a plateau, a saddle, or a worse valley (red).`,
      `40個中 <b>${n}個</b>のボールが最も低い領域に届きました（緑）。残りは台地、鞍点、あるいはもっと悪い谷で止まりました（赤）。`);
  }
  setup();
}
