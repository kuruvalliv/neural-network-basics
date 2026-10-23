import { d3, L, div, button, plot, legend, COLOR, tex } from "./_lib.js";
import { fmt, clamp, entropy, crossEntropy, kl } from "../math.js";

const CATS = ["☀", "☁", "☂", "❄"];

function setProb(dist, k, v) {
  v = clamp(v, 0.01, 0.97);
  const rest = dist.reduce((s, x, i) => (i === k ? s : s + x), 0);
  const out = dist.map((x, i) => (i === k ? v : rest > 0 ? Math.max(0.003, (x / rest) * (1 - v)) : (1 - v) / 3));
  const s = out.reduce((a, b) => a + b, 0);
  return out.map(x => x / s);
}

export default function mount(el) {
  let p = [0.5, 0.25, 0.2, 0.05];
  let q = [0.25, 0.25, 0.25, 0.25];

  const ctl = div(el, "controls");
  button(ctl, L("Swap p and q", "p と q を入れ替え"), () => { [p, q] = [q, p]; draw(); });
  button(ctl, L("Set q = p", "q = p にする"), () => { q = [...p]; draw(); });
  div(ctl, "", `<span style="color:var(--muted)">${L("Drag the top of any bar.", "棒の上端をドラッグしてください。")}</span>`);

  const row = div(el, "row");
  const left = div(row, ""), right = div(row, "");
  const P = plot(left, { width: 360, height: 280, xBand: CATS, y: [0, 1], yLabel: "P" });
  legend(left, [[COLOR.p, L("true weather p", "真の天気 p")], [COLOR.q, L("model q", "モデル q")]]);
  const S = plot(right, { width: 260, height: 280, xBand: ["H(p,q)", "D(q‖p)"], y: [0, 4], yLabel: "bits", margin: { left: 40 } });
  legend(right, [[COLOR.p, "H(p)"], [COLOR.loss, "KL"]]);
  const readout = div(el, "readout");

  const bw = () => P.x.bandwidth() / 2;
  const drag = which => d3.drag().on("drag", (ev, d) => {
    if (which === "p") p = setProb(p, d.k, P.y.invert(ev.y));
    else q = setProb(q, d.k, P.y.invert(ev.y));
    draw();
  });

  function bars(cls, dist, off, color, which) {
    const data = dist.map((v, k) => ({ v, k }));
    P.g.selectAll(`rect.${cls}`).data(data).join("rect").attr("class", cls)
      .attr("x", d => P.x(CATS[d.k]) + off).attr("width", bw())
      .attr("y", d => P.y(d.v)).attr("height", d => P.H - P.y(d.v)).style("fill", color);
    P.g.selectAll(`rect.${cls}-h`).data(data).join("rect").attr("class", `${cls}-h handle`)
      .attr("x", d => P.x(CATS[d.k]) + off).attr("width", bw())
      .attr("y", d => P.y(d.v) - 6).attr("height", 12).attr("rx", 3)
      .style("fill", color).style("stroke", "var(--panel)").style("stroke-width", 2)
      .call(drag(which));
  }

  function draw() {
    bars("pb", p, 0, COLOR.p, "p");
    bars("qb", q, bw(), COLOR.q, "q");
    const Hp = entropy(p), Hpq = crossEntropy(p, q), D = kl(p, q), Drev = kl(q, p);
    const top = Math.max(4, Hpq, Drev) * 1.05;
    S.y.domain([0, top]);
    S.drawAxes();
    const segs = [
      { k: "H(p,q)", y0: 0, y1: Hp, c: COLOR.p }, { k: "H(p,q)", y0: Hp, y1: Hpq, c: COLOR.loss },
      { k: "D(q‖p)", y0: 0, y1: Drev, c: COLOR.loss },
    ];
    S.g.selectAll("rect").data(segs).join("rect")
      .attr("x", d => S.x(d.k)).attr("width", S.x.bandwidth())
      .attr("y", d => S.y(d.y1)).attr("height", d => Math.max(0, S.y(d.y0) - S.y(d.y1))).style("fill", d => d.c)
      .style("opacity", d => (d.k === "D(q‖p)" ? 0.55 : 1));

    readout.innerHTML =
      tex(`\\underbrace{H(p,q)}_{${fmt(Hpq, 3)}}=\\underbrace{H(p)}_{${fmt(Hp, 3)}}+\\underbrace{D_{KL}(p\\|q)}_{${fmt(D, 3)}}`) + "&emsp;" +
      tex(`D_{KL}(q\\|p)=${fmt(Drev, 3)}`) + "<br>" +
      L("Try to make the red part negative. You can't: the smallest it gets is 0, exactly when q = p. Notice also that swapping the roles changes the KL.",
        "赤い部分を負にしようとしてみてください。できません。最小値は0で、それは q = p のときだけです。また、役割を入れ替えると KL の値が変わることにも注目しましょう。");
  }
  draw();
}
