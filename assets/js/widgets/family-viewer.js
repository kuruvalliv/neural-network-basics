import { d3, L, div, slider, choice, plot, COLOR, tex } from "./_lib.js";
import { normPdf, normCdf, linspace, fmt } from "../math.js";

const FAM = {
  bern: {
    label: "Bernoulli", dom: [-1, 2], disc: true,
    knobs: [{ k: "p", label: "p", min: 0, max: 1, step: 0.01, v: 0.7 }],
    mass: p => [[0, 1 - p.p], [1, p.p]],
    formula: p => `P(Y{=}1)=${fmt(p.p)}`,
  },
  cat: {
    label: L("Categorical", "カテゴリカル"), dom: [-0.8, 3.8], disc: true,
    knobs: ["a", "b", "c", "d"].map((k, i) => ({ k, label: `w${i}`, min: 0, max: 1, step: 0.01, v: [0.4, 0.3, 0.2, 0.1][i] })),
    mass: p => {
      const w = [p.a, p.b, p.c, p.d], s = d3.sum(w) || 1;
      return w.map((v, i) => [i, v / s]);
    },
    formula: () => String.raw`\pi_k = w_k / \textstyle\sum_j w_j`,
  },
  gauss: {
    label: L("Gaussian", "ガウス"), dom: [-5, 5],
    knobs: [{ k: "mu", label: "μ", min: -3, max: 3, step: 0.01, v: 0 }, { k: "s", label: "σ", min: 0.2, max: 2.5, step: 0.01, v: 1 }],
    pdf: (x, p) => normPdf(x, p.mu, p.s), cdf: (x, p) => normCdf(x, p.mu, p.s),
    formula: p => String.raw`p(y)=\tfrac{1}{${fmt(p.s)}\sqrt{2\pi}}e^{-(y${p.mu < 0 ? "+" : "-"}${fmt(Math.abs(p.mu))})^2/(2\cdot ${fmt(p.s)}^2)}`,
  },
  exp: {
    label: L("Exponential", "指数"), dom: [-0.5, 5],
    knobs: [{ k: "l", label: "λ", min: 0.2, max: 4, step: 0.01, v: 1 }],
    pdf: (x, p) => (x < 0 ? 0 : p.l * Math.exp(-p.l * x)), cdf: (x, p) => (x < 0 ? 0 : 1 - Math.exp(-p.l * x)),
    formula: p => String.raw`p(y)=${fmt(p.l)}\,e^{-${fmt(p.l)}y},\; y\ge 0`,
  },
};

export default function mount(el) {
  let fam = "gauss", params = {};

  choice(div(el, "controls"), {
    label: L("Family", "分布族"),
    options: Object.entries(FAM).map(([value, f]) => ({ value, label: f.label })),
    value: fam,
    onChange: v => { fam = v; buildKnobs(); },
  });
  const knobBox = div(el, "controls");
  const tBox = div(el, "controls");
  let tSlider;

  const top = plot(el, { height: 220, x: [0, 1], y: [0, 1], yLabel: "p(y)" });
  const bot = plot(el, { height: 170, x: [0, 1], y: [0, 1], xLabel: "y", yLabel: "F(y)", yTicks: 3 });
  const readout = div(el, "readout");

  function buildKnobs() {
    const f = FAM[fam];
    knobBox.innerHTML = "";
    params = {};
    f.knobs.forEach(k => {
      params[k.k] = k.v;
      slider(knobBox, { label: k.label, min: k.min, max: k.max, step: k.step, value: k.v, onInput: v => { params[k.k] = v; draw(); } });
    });
    tBox.innerHTML = "";
    tSlider = slider(tBox, { label: L("cut at t", "切る位置 t"), min: f.dom[0], max: f.dom[1], step: 0.01, value: (f.dom[0] + f.dom[1]) / 2, onInput: draw });
    top.x.domain(f.dom);
    bot.x.domain(f.dom);
    draw();
  }

  function draw() {
    const f = FAM[fam], t = tSlider.value;
    const xs = linspace(f.dom[0], f.dom[1], 300);
    top.g.selectAll("*").remove();
    bot.g.selectAll("*").remove();
    let Ft;
    if (f.disc) {
      const m = f.mass(params);
      top.y.domain([0, 1]);
      top.g.selectAll("rect").data(m).join("rect")
        .attr("x", d => top.x(d[0] - 0.2)).attr("width", top.x(0.4) - top.x(0))
        .attr("y", d => top.y(d[1])).attr("height", d => top.H - top.y(d[1]))
        .style("fill", COLOR.p).style("opacity", d => (d[0] <= t ? 1 : 0.3));
      const F = x => d3.sum(m.filter(d => d[0] <= x), d => d[1]);
      Ft = F(t);
      bot.g.append("path").attr("d", d3.line().curve(d3.curveStepAfter).x(d => bot.x(d)).y(d => bot.y(F(d)))(xs))
        .style("fill", "none").style("stroke", COLOR.p).style("stroke-width", 2);
    } else {
      const ymax = d3.max(xs, x => f.pdf(x, params)) * 1.15;
      top.y.domain([0, ymax]);
      const shade = xs.filter(x => x <= t);
      top.g.append("path").attr("d", d3.area().x(d => top.x(d)).y0(top.H).y1(d => top.y(f.pdf(d, params)))(shade))
        .style("fill", COLOR.p).style("opacity", 0.3);
      top.g.append("path").attr("d", d3.line().x(d => top.x(d)).y(d => top.y(f.pdf(d, params)))(xs))
        .style("fill", "none").style("stroke", COLOR.p).style("stroke-width", 2.5);
      Ft = f.cdf(t, params);
      bot.g.append("path").attr("d", d3.line().x(d => bot.x(d)).y(d => bot.y(f.cdf(d, params)))(xs))
        .style("fill", "none").style("stroke", COLOR.p).style("stroke-width", 2);
    }
    top.drawAxes();
    bot.drawAxes();
    [top, bot].forEach(P => P.g.append("line").attr("x1", P.x(t)).attr("x2", P.x(t)).attr("y1", 0).attr("y2", P.H)
      .style("stroke", COLOR.accent).style("stroke-dasharray", "4 3"));
    bot.g.append("line").attr("x1", 0).attr("x2", bot.x(t)).attr("y1", bot.y(Ft)).attr("y2", bot.y(Ft))
      .style("stroke", COLOR.accent).style("stroke-dasharray", "2 3");
    bot.g.append("circle").attr("cx", bot.x(t)).attr("cy", bot.y(Ft)).attr("r", 5).style("fill", COLOR.accent);

    readout.innerHTML =
      `${tex(f.formula(params))}<br>` +
      L(`Knobs: <b>${f.knobs.length}</b>. The ${f.disc ? "bars" : "shaded area"} left of t ${f.disc ? "add" : "adds"} up to <b>F(t) = ${fmt(Ft, 3)}</b>, the height of the dot below.`,
        `つまみの数：<b>${f.knobs.length}</b>。t より左の${f.disc ? "棒" : "塗られた面積"}の合計は <b>F(t) = ${fmt(Ft, 3)}</b> で、下の図の点の高さと一致します。`);
  }

  buildKnobs();
}
