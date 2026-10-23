import { d3, L, div, button, plot, legend, COLOR } from "./_lib.js";
import { linspace, solve, fmt, rng } from "../math.js";

// A pretend "validation loss vs. hyperparameter" curve with a narrow best region.
const f = x => 0.55 + 0.25 * Math.sin(7 * x + 1) + 0.3 * (x - 0.6) ** 2 - 0.35 * Math.exp(-((x - 0.78) ** 2) / 0.002);
const GRID = linspace(0, 1, 300);
const k = (a, b) => Math.exp(-((a - b) ** 2) / (2 * 0.08 ** 2));

function gp(xs, ys) {
  const mu0 = d3.mean(ys);
  const K = xs.map(a => xs.map(b => k(a, b))).map((row, i) => row.map((v, j) => v + (i === j ? 1e-6 : 0)));
  const alpha = solve(K, ys.map(y => y - mu0));
  return GRID.map(x => {
    const ks = xs.map(a => k(a, x));
    const mean = mu0 + d3.sum(ks, (v, i) => v * alpha[i]);
    const v = solve(K, ks);
    const varr = Math.max(1e-9, 1 - d3.sum(ks, (kv, i) => kv * v[i]));
    return { x, mean, sd: Math.sqrt(varr) * 0.35 };
  });
}

export default function mount(el) {
  let bo = [0.1, 0.5, 0.9], rs = [0.1, 0.5, 0.9], seed = 1;
  let r = rng(seed);
  const ctl = div(el, "controls");
  button(ctl, L("Next evaluation (both)", "次の評価（両方）"), () => { step(); draw(); });
  button(ctl, L("+5", "+5"), () => { for (let i = 0; i < 5; i++) step(); draw(); });
  button(ctl, L("Reset", "リセット"), () => { bo = [0.1, 0.5, 0.9]; rs = [0.1, 0.5, 0.9]; r = rng(++seed); draw(); });

  const row = div(el, "row");
  const mk = title => {
    const box = div(row, "");
    div(box, "", `<div style="text-align:center;font-weight:600">${title}</div>`);
    const P = plot(box, { width: 340, height: 240, x: [0, 1], y: [-0.1, 1.2], xLabel: "hyperparameter", yLabel: "val. loss", xTicks: 4, yTicks: 4 });
    P.g.append("path").attr("d", d3.line().x(x => P.x(x)).y(x => P.y(f(x)))(GRID)).style("fill", "none").style("stroke", COLOR.muted).style("stroke-dasharray", "3 3");
    return { P, band: P.g.append("path"), mean: P.g.append("path"), acq: P.g.append("line"), pts: P.g.append("g") };
  };
  const B = mk(L("Bayesian optimization", "ベイズ最適化")), R = mk(L("random search", "ランダム探索"));
  legend(el, [[COLOR.muted, L("true (hidden) loss curve", "本当の（隠れた）損失曲線"), true], [COLOR.p, L("GP belief: mean ± uncertainty", "GP の信念：平均 ± 不確かさ")], [COLOR.q, L("evaluated points", "評価した点")]]);
  const readout = div(el, "readout");

  function step() {
    const post = gp(bo, bo.map(f));
    const next = post.reduce((a, b) => (b.mean - 2 * b.sd < a.mean - 2 * a.sd ? b : a)).x;
    bo.push(next);
    rs.push(r());
  }

  function draw() {
    const post = gp(bo, bo.map(f));
    const cy = v => B.P.y(Math.max(-0.1, Math.min(1.2, v)));
    B.band.attr("d", d3.area().x(p => B.P.x(p.x)).y0(p => cy(p.mean - 2 * p.sd)).y1(p => cy(p.mean + 2 * p.sd))(post)).style("fill", COLOR.p).style("opacity", 0.15);
    B.mean.attr("d", d3.line().x(p => B.P.x(p.x)).y(p => cy(p.mean))(post)).style("fill", "none").style("stroke", COLOR.p).style("stroke-width", 2);
    const next = post.reduce((a, b) => (b.mean - 2 * b.sd < a.mean - 2 * a.sd ? b : a)).x;
    B.acq.attr("x1", B.P.x(next)).attr("x2", B.P.x(next)).attr("y1", 0).attr("y2", B.P.H).style("stroke", COLOR.accent).style("stroke-dasharray", "5 4");
    [[B, bo], [R, rs]].forEach(([W, xs]) => W.pts.selectAll("circle").data(xs).join("circle")
      .attr("cx", x => W.P.x(x)).attr("cy", x => W.P.y(f(x))).attr("r", 5).style("fill", COLOR.q).style("stroke", "#fff"));
    const best = xs => d3.min(xs, f);
    readout.innerHTML = L(
      `After ${bo.length} evaluations: best loss found, Bayesian optimization <b>${fmt(best(bo), 3)}</b>, random search <b>${fmt(best(rs), 3)}</b> (true minimum ${fmt(d3.min(GRID, f), 3)}). BO keeps a belief about the whole curve (blue band) and evaluates next where “optimistic loss” (mean − 2·uncertainty) is lowest (purple line). It balances exploiting good regions against exploring uncertain ones. Each evaluation can be a full training run, so saving evaluations matters.`,
      `${bo.length}回の評価後に見つかった最良の損失：ベイズ最適化 <b>${fmt(best(bo), 3)}</b>、ランダム探索 <b>${fmt(best(rs), 3)}</b>（本当の最小値 ${fmt(d3.min(GRID, f), 3)}）。BO は曲線全体についての信念（青い帯）を持ち、「楽観的な損失」（平均 − 2·不確かさ）が最も低い場所（紫の線）を次に評価します。よい領域の活用と、不確かな領域の探索のバランスをとるのです。1回の評価が学習1回分まるごとということもあるので、評価の回数を節約できることは重要です。`);
  }
  draw();
}
