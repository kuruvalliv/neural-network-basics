import { d3, L, div, slider, button, plot, legend, COLOR, tex } from "./_lib.js";
import { CLS } from "../running-example.js";
import { linspace, fmt, sigmoid } from "../math.js";

export default function mount(el) {
  const ctl = div(el, "controls");
  const ws = slider(ctl, { label: "w", min: -5, max: 25, step: 0.01, value: 2, format: v => v.toFixed(2), onInput: draw });
  const bs = slider(ctl, { label: "b", min: -15, max: 5, step: 0.01, value: 0, format: v => v.toFixed(2), onInput: draw });
  const ctl2 = div(el, "controls");
  const eta = 4;
  const stepOnce = () => {
    const g = grads(ws.value, bs.value);
    ws.set(ws.value - eta * g.w);
    bs.set(bs.value - eta * g.b);
  };
  button(ctl2, L("One gradient step", "勾配で1歩進む"), stepOnce);
  button(ctl2, L("50 steps", "50歩進む"), () => { for (let i = 0; i < 50; i++) stepOnce(); });

  const row = div(el, "row");
  const mainBox = div(row, "");
  mainBox.style.flex = "2 1 340px";
  const P = plot(mainBox, { width: 440, height: 300, x: [0, 1], y: [-0.05, 1.05], xLabel: "h", yLabel: "q / y", yTicks: 5 });
  const segs = P.g.append("g");
  const curve = P.g.append("path").style("fill", "none").style("stroke", COLOR.q).style("stroke-width", 3);
  P.g.selectAll("circle").data(CLS.data).join("circle").attr("cx", d => P.x(d.x)).attr("cy", d => P.y(d.y)).attr("r", 3).style("fill", COLOR.data);
  legend(mainBox, [[COLOR.loss, L("q − y for each day (red: push down, blue: push up)", "各日の q − y（赤：下げる、青：上げる）")]]);
  const B = plot(div(row, ""), { width: 240, height: 300, xBand: ["Σq", "Σy"], y: [0, 40], yLabel: "count", margin: { left: 40 } });
  const readout = div(el, "readout");

  function grads(w, b) {
    const r = CLS.data.map(d => sigmoid(w * d.x + b) - d.y);
    return { w: d3.mean(r, (v, i) => v * CLS.data[i].x), b: d3.mean(r) };
  }

  function draw() {
    const w = ws.value, b = bs.value;
    curve.attr("d", d3.line().x(h => P.x(h)).y(h => P.y(sigmoid(w * h + b)))(linspace(0, 1, 120)));
    segs.selectAll("line").data(CLS.data).join("line")
      .attr("x1", d => P.x(d.x)).attr("x2", d => P.x(d.x)).attr("y1", d => P.y(d.y)).attr("y2", d => P.y(sigmoid(w * d.x + b)))
      .style("stroke", d => (sigmoid(w * d.x + b) > d.y ? COLOR.loss : COLOR.p)).style("stroke-width", 2).style("opacity", 0.7);
    const sq = d3.sum(CLS.data, d => sigmoid(w * d.x + b)), sy = d3.sum(CLS.data, d => d.y);
    B.g.selectAll("rect").data([sq, sy]).join("rect").attr("x", (_, i) => B.x(["Σq", "Σy"][i])).attr("width", B.x.bandwidth())
      .attr("y", v => B.y(v)).attr("height", v => B.H - B.y(v)).style("fill", (_, i) => (i ? COLOR.data : COLOR.q));
    const g = grads(w, b);
    readout.innerHTML = tex(`\\frac{\\partial \\hat R}{\\partial b}=\\tfrac1n\\textstyle\\sum_i(q_i-y_i)=${fmt(g.b, 3)},\\quad \\frac{\\partial \\hat R}{\\partial w}=\\tfrac1n\\textstyle\\sum_i(q_i-y_i)\\,x_i=${fmt(g.w, 3)}`) + "<br>" +
      L(`The model expects <b>${fmt(sq, 1)}</b> rainy days, and the data has <b>${sy}</b>. Each step moves b by the average miss and w by the miss weighted by humidity. At the minimum both gradients are zero, which means the model's expected counts <b>match</b> the observed ones (Σq = Σy and Σqx = Σyx). This is moment matching.`,
        `モデルが予想する雨の日数は <b>${fmt(sq, 1)}</b> 日、データでは <b>${sy}</b> 日です。1歩ごとに、b は平均の外れ分だけ、w は湿度で重み付けした外れ分だけ動きます。最小点では両方の勾配が0になります。つまり、モデルの期待する数が観測された数に<b>一致</b>します（Σq = Σy かつ Σqx = Σyx）。これがモーメント一致です。`);
  }
  draw();
}
