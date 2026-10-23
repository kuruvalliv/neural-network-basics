import { d3, L, div, slider, choice, button, plot, legend } from "./_lib.js";
import { SURFACES, grad, drawContours } from "./_surface.js";
import { rng, randn, fmt } from "../math.js";

const OPTS = [
  { k: "gd", name: "GD", color: "#1a1a1a" },
  { k: "sgd", name: "SGD", color: "#f6ad55" },
  { k: "mom", name: L("momentum", "モメンタム"), color: "#fc8181" },
  { k: "adam", name: "Adam", color: "#63b3ed" },
];
const SETUPS = {
  ravine: { start: [-1.8, -1.2], base: 0.035, adam: 0.05 },
  rosen: { start: [-1.6, 2.4], base: 0.006, adam: 0.05 },
};

function run(S, setup, scale, steps = 300) {
  const r = rng(12), paths = {};
  for (const { k } of OPTS) {
    let [x, y] = setup.start, v = [0, 0], m = [0, 0], s = [0, 0];
    const lr = setup.base * scale, path = [[x, y]];
    for (let t = 1; t <= steps; t++) {
      let g = grad(S.f, x, y);
      if (k === "sgd") g = g.map(gi => gi + 1.5 * randn(r));
      let d;
      if (k === "mom") { v = v.map((vi, i) => 0.9 * vi + g[i]); d = v.map(vi => lr * vi); }
      else if (k === "adam") {
        m = m.map((mi, i) => 0.9 * mi + 0.1 * g[i]);
        s = s.map((si, i) => 0.999 * si + 0.001 * g[i] ** 2);
        d = m.map((mi, i) => (setup.adam * scale * (mi / (1 - 0.9 ** t))) / (Math.sqrt(s[i] / (1 - 0.999 ** t)) + 1e-8));
      } else d = g.map(gi => lr * gi);
      x -= d[0]; y -= d[1];
      if (!Number.isFinite(x) || Math.abs(x) > 1e3 || Math.abs(y) > 1e3) break;
      path.push([x, y]);
    }
    paths[k] = path;
  }
  return paths;
}

export default function mount(el) {
  let key = "ravine", timer = null;
  const ctl = div(el, "controls");
  choice(ctl, {
    label: L("Landscape", "地形"), value: key,
    options: [{ value: "ravine", label: L("ravine", "峡谷") }, { value: "rosen", label: L("banana valley", "バナナ型の谷") }],
    onChange: v => { key = v; setup(); },
  });
  const ls = slider(ctl, { label: L("learning-rate scale", "学習率の倍率"), min: 0.25, max: 2, step: 0.05, value: 1, format: v => `×${v.toFixed(2)}`, onInput: () => race(false) });
  button(ctl, L("▶ Race", "▶ 競争"), () => race(true));

  const box = div(el, "");
  const lg = div(el, "");
  legend(lg, OPTS.map(o => [o.color, o.name]));
  const readout = div(el, "readout");
  let P, layer;

  function setup() {
    box.innerHTML = "";
    const S = SURFACES[key];
    P = plot(box, { width: 460, height: 400, x: S.dom[0], y: S.dom[1], xLabel: "θ₁", yLabel: "θ₂" });
    drawContours(P, S.f, S.dom);
    layer = P.g.append("g");
    race(false);
  }

  function race(animate) {
    timer?.stop();
    const S = SURFACES[key], paths = run(S, SETUPS[key], ls.value);
    const clip = p => [Math.max(S.dom[0][0], Math.min(S.dom[0][1], p[0])), Math.max(S.dom[1][0], Math.min(S.dom[1][1], p[1]))];
    const line = d3.line().x(p => P.x(clip(p)[0])).y(p => P.y(clip(p)[1]));
    layer.selectAll("*").remove();
    const els = OPTS.map(o => ({
      o, path: paths[o.k],
      trail: layer.append("path").style("fill", "none").style("stroke", o.color).style("stroke-width", 2),
      dot: layer.append("circle").attr("r", 5).style("fill", o.color).style("stroke", "#000").style("stroke-width", 0.8),
    }));
    const show = k => els.forEach(e => {
      const i = Math.min(k, e.path.length - 1);
      e.trail.attr("d", line(e.path.slice(0, i + 1)));
      e.dot.attr("cx", P.x(clip(e.path[i])[0])).attr("cy", P.y(clip(e.path[i])[1]));
    });
    const finish = () => {
      readout.innerHTML = els.map(e => `<b style="color:${e.o.color};text-shadow:0 0 2px #000">●</b> ${e.o.name}: ${e.path.length < 301 ? L("blew up", "発散") : `loss ${fmt(S.f(...e.path.at(-1)), 3)}`}`).join(" &nbsp; ") + "<br>" +
        L("Plain GD zig-zags across the steep walls and crawls along the floor. Momentum builds speed along the floor. Adam rescales each direction by its own gradient size. SGD's noise jiggles but still heads downhill. Push the learning rate up and watch who blows up first.",
          "素朴な GD は急な壁の間をジグザグし、谷底に沿っては這うように進みます。モメンタムは谷底の方向に勢いをつけます。Adam は方向ごとに、その勾配の大きさで歩幅を調整し直します。SGD はノイズで揺れながらも坂を下ります。学習率を上げて、誰が最初に発散するか見てみましょう。");
    };
    if (!animate) { show(300); finish(); return; }
    let k = 0;
    timer = d3.timer(() => { k += 2; show(k); if (k >= 300) { timer.stop(); finish(); } });
  }
  setup();
}
