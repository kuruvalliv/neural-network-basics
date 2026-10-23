import { d3, L, div, button, plot, COLOR } from "./_lib.js";
import { CLS } from "../running-example.js";
import { rng, randn, sigmoid, linspace, fmt } from "../math.js";

const out = (g, h) => g.c + g.d * h + g.nodes.reduce((s, n) => s + n.v * Math.tanh(n.w * h + n.b), 0);
const fitness = g => d3.mean(CLS.data, d => {
  const q = Math.min(Math.max(sigmoid(out(g, d.x)), 1e-9), 1 - 1e-9);
  return -Math.log2(d.y ? q : 1 - q);
});

export default function mount(el) {
  const r = rng(31);
  let parent = { c: 0, d: 0, nodes: [] }, gen = 0, kids = [];

  const mutate = g => {
    const c = { c: g.c, d: g.d, nodes: g.nodes.map(n => ({ ...n })) };
    const roll = r();
    let what;
    if (roll < 0.25 && c.nodes.length < 6) {
      c.nodes.push({ w: 6 * randn(r), b: 3 * randn(r), v: randn(r) });
      what = L("+ node", "+ ノード");
    } else if (roll < 0.35 && c.nodes.length) {
      c.nodes.splice(Math.floor(r() * c.nodes.length), 1);
      what = L("− node", "− ノード");
    } else {
      c.c += 0.8 * randn(r); c.d += 1.5 * randn(r);
      c.nodes.forEach(n => { n.w += 1.5 * randn(r); n.b += 0.8 * randn(r); n.v += 0.5 * randn(r); });
      what = L("tweak weights", "重みを微調整");
    }
    c.fit = fitness(c);
    c.what = what;
    return c;
  };

  const ctl = div(el, "controls");
  button(ctl, L("Auto-pick best child", "最良の子を自動で選ぶ"), () => choose(kids.reduce((a, b) => (b.fit < a.fit ? b : a))));
  button(ctl, L("Auto ×20 generations", "自動で20世代進める"), () => { for (let i = 0; i < 20; i++) choose(kids.reduce((a, b) => (b.fit < a.fit ? b : a)), false); draw(); });
  button(ctl, L("Restart", "最初から"), () => { parent = { c: 0, d: 0, nodes: [] }; parent.fit = fitness(parent); gen = 0; breed(); draw(); });

  const head = div(el, "");
  const grid = div(el, "");
  grid.style.cssText = "display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:.6rem";
  const readout = div(el, "readout");
  const hs = linspace(0, 1, 80);

  const mini = (outer, g, big) => {
    const box = div(outer, "");
    box.style.maxWidth = big ? "360px" : "";
    const P = plot(box, { width: big ? 300 : 200, height: big ? 160 : 130, x: [0, 1], y: [0, 1], xTicks: 2, yTicks: 2, margin: { left: 30, bottom: 22, top: 8, right: 8 } });
    P.g.append("path").attr("d", d3.line().x(h => P.x(h)).y(h => P.y(CLS.pRain(h)))(hs)).style("fill", "none").style("stroke", COLOR.p).style("stroke-dasharray", "4 3");
    P.g.append("path").attr("d", d3.line().x(h => P.x(h)).y(h => P.y(sigmoid(out(g, h))))(hs)).style("fill", "none").style("stroke", COLOR.q).style("stroke-width", 2.5);
    const net = d3.select(box).append("svg").attr("viewBox", "0 0 200 50").style("width", "100%").style("height", "auto");
    const n = g.nodes.length;
    g.nodes.forEach((_, i) => {
      const x = 100 + (i - (n - 1) / 2) * 22;
      net.append("line").attr("x1", 12).attr("y1", 25).attr("x2", x).attr("y2", 25).style("stroke", COLOR.muted);
      net.append("line").attr("x1", x).attr("y1", 25).attr("x2", 188).attr("y2", 25).style("stroke", COLOR.muted);
    });
    net.append("path").attr("d", "M12,25 Q100,-5 188,25").style("fill", "none").style("stroke", COLOR.muted).style("stroke-dasharray", "3 2");
    [[12, COLOR.data], [188, COLOR.q]].forEach(([x, c]) => net.append("circle").attr("cx", x).attr("cy", 25).attr("r", 7).style("fill", c));
    g.nodes.forEach((_, i) => net.append("circle").attr("cx", 100 + (i - (n - 1) / 2) * 22).attr("cy", 25).attr("r", 6).style("fill", COLOR.accent));
  };

  function breed() { kids = d3.range(4).map(() => mutate(parent)); }
  function choose(k, redraw = true) {
    if (k.fit <= parent.fit + 0.05) parent = k;
    gen++;
    breed();
    if (redraw) draw();
  }

  function draw() {
    head.innerHTML = "";
    const box = div(head, "level");
    box.innerHTML = `<div class="lv">${L(`parent · generation ${gen}`, `親・第${gen}世代`)}</div><div>${L("loss", "損失")} <b>${fmt(parent.fit, 3)}</b> bits · ${parent.nodes.length} ${L("hidden nodes", "隠れノード")}</div>`;
    mini(box, parent, true);
    grid.innerHTML = "";
    kids.forEach(k => {
      const c = div(grid, "level");
      c.style.cursor = "pointer";
      c.innerHTML = `<div class="lv">${k.what}</div><div>${L("loss", "損失")} <b style="color:${k.fit < parent.fit ? "var(--ok)" : "var(--loss)"}">${fmt(k.fit, 3)}</b> · ${k.nodes.length}</div>`;
      mini(c, k, false);
      c.addEventListener("click", () => choose(k));
    });
    readout.innerHTML = L(
      "You are natural selection. Each child is a mutated copy of the parent: its weights are tweaked, or a hidden node is added or removed, so <em>structure</em> evolves too. Click the child you want to breed from (worse children are rejected). The dashed blue curve is the truth, and the diagram shows input → hidden nodes → output.",
      "あなたが自然選択の役です。子はどれも親を突然変異させたコピーで、重みを微調整したり、隠れノードを足したり消したりしています。つまり<em>構造</em>も進化します。次の親にしたい子をクリックしてください（親より悪い子は却下されます）。青の破線が真実で、図は 入力 → 隠れノード → 出力 を表しています。");
  }
  parent.fit = fitness(parent);
  breed();
  draw();
}
