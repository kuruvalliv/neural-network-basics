import { d3, L, div, slider, button, COLOR, tex } from "./_lib.js";
import { fmt, sigmoid } from "../math.js";

const NODES = [
  { id: "x", x: 50, y: 50, label: "x" },
  { id: "w", x: 50, y: 140, label: "w" },
  { id: "b", x: 190, y: 210, label: "b" },
  { id: "u", x: 190, y: 95, label: "u = w·x" },
  { id: "z", x: 330, y: 150, label: "z = u + b" },
  { id: "q", x: 470, y: 150, label: "q = σ(z)" },
  { id: "l", x: 610, y: 150, label: "ℓ = −ln q(y)" },
];
const EDGES = [["x", "u"], ["w", "u"], ["u", "z"], ["b", "z"], ["z", "q"], ["q", "l"]];
const FWD = ["u", "z", "q", "l"];
const BWD = ["l", "q", "z", "u", "b", "w"];

export default function mount(el) {
  let step = 0;
  const ctl = div(el, "controls");
  const ws = slider(ctl, { label: "w", min: -5, max: 15, step: 0.1, value: 4, format: v => v.toFixed(1), onInput: draw });
  const bs = slider(ctl, { label: "b", min: -10, max: 5, step: 0.1, value: -2, format: v => v.toFixed(1), onInput: draw });
  const xs = slider(ctl, { label: L("humidity x", "湿度 x"), min: 0, max: 1, step: 0.01, value: 0.7, onInput: draw });
  let y = 1;
  const ctl2 = div(el, "controls");
  const yBtn = button(ctl2, "", () => { y = 1 - y; draw(); });
  button(ctl2, L("◀ Back", "◀ 戻る"), () => { step = Math.max(0, step - 1); draw(); });
  button(ctl2, L("Step ▶", "進む ▶"), () => { step = Math.min(FWD.length + BWD.length, step + 1); draw(); });
  button(ctl2, L("Reset", "リセット"), () => { step = 0; draw(); });

  const svg = d3.select(el).append("svg").attr("class", "plot").attr("viewBox", "0 0 680 260");
  const gE = svg.append("g"), gN = svg.append("g");
  const readout = div(el, "readout");

  function draw() {
    yBtn.innerHTML = L(`observed: ${y ? "☂ rain" : "☀ dry"}`, `観測：${y ? "☂ 雨" : "☀ 晴れ"}`);
    const x = xs.value, w = ws.value, b = bs.value;
    const u = w * x, z = u + b, q = sigmoid(z), l = -Math.log(y ? q : 1 - q);
    const val = { x, w, b, u, z, q, l };
    const dl_dq = y ? -1 / q : 1 / (1 - q);
    const dz = q - y;
    const grad = { l: 1, q: dl_dq, z: dz, u: dz, b: dz, w: dz * x };
    const fwdShown = new Set(["x", "w", "b", ...FWD.slice(0, Math.min(step, FWD.length))]);
    const bwdShown = new Set(BWD.slice(0, Math.max(0, step - FWD.length)));

    gE.selectAll("line").data(EDGES).join("line")
      .attr("x1", e => NODES.find(n => n.id === e[0]).x + 45).attr("y1", e => NODES.find(n => n.id === e[0]).y)
      .attr("x2", e => NODES.find(n => n.id === e[1]).x - 45).attr("y2", e => NODES.find(n => n.id === e[1]).y)
      .style("stroke", e => (bwdShown.has(e[1]) && bwdShown.has(e[0]) ? COLOR.loss : COLOR.muted)).style("stroke-width", 2);
    gN.selectAll("*").remove();
    NODES.forEach(n => {
      const g = gN.append("g").attr("transform", `translate(${n.x},${n.y})`);
      g.append("rect").attr("x", -55).attr("y", -30).attr("width", 110).attr("height", 60).attr("rx", 10)
        .style("fill", "var(--bg)").style("stroke", bwdShown.has(n.id) ? COLOR.loss : fwdShown.has(n.id) ? COLOR.accent : COLOR.muted).style("stroke-width", 2);
      g.append("text").attr("text-anchor", "middle").attr("y", -12).style("font-size", "11px").style("fill", COLOR.muted).text(n.label);
      g.append("text").attr("text-anchor", "middle").attr("y", 5).style("font-weight", 700).text(fwdShown.has(n.id) ? fmt(val[n.id], 3) : "?");
      if (bwdShown.has(n.id)) g.append("text").attr("text-anchor", "middle").attr("y", 22).style("fill", COLOR.loss).style("font-size", "12px").text(`∂ℓ/∂${n.id} = ${fmt(grad[n.id], 3)}`);
    });

    const msgs = [
      L("Press Step. First the <b>forward pass</b> computes every value from left to right.", "「進む」を押してください。まず<b>順伝播</b>で、すべての値を左から右へ計算します。"),
      L("u = w·x.", "u = w·x。"), L("z = u + b, the logit.", "z = u + b（ロジット）。"), L("q = σ(z), the model's chance of rain.", "q = σ(z)：モデルが考える雨の確率。"),
      L("ℓ, the surprise at what actually happened. Now the <b>backward pass</b>: start from ∂ℓ/∂ℓ = 1.", "ℓ：実際に起きたことへの驚き。ここから<b>逆伝播</b>です。∂ℓ/∂ℓ = 1 から始めます。"),
      L("Multiply by the local slope of each box, right to left.", "右から左へ、各箱の局所的な傾きを掛けていきます。"),
      L("∂ℓ/∂q = −1/q (rain) or 1/(1−q) (dry).", "∂ℓ/∂q = −1/q（雨）または 1/(1−q)（晴れ）。"),
      L(`Times σ′(z) = q(1−q) gives ∂ℓ/∂z = <b>q − y = ${fmt(dz, 3)}</b>. All the messy factors cancel.`, `σ′(z) = q(1−q) を掛けると ∂ℓ/∂z = <b>q − y = ${fmt(dz, 3)}</b>。ややこしい因子はすべて打ち消し合います。`),
      L("A sum passes the gradient through unchanged.", "和は勾配をそのまま通します。"),
      L("So ∂ℓ/∂b = q − y as well.", "したがって ∂ℓ/∂b も q − y です。"),
      L(`A product multiplies by the other input: ∂ℓ/∂w = (q − y)·x = ${fmt(dz * x, 3)}. Done: one backward sweep gives every gradient.`, `積では、もう一方の入力が掛かります：∂ℓ/∂w = (q − y)·x = ${fmt(dz * x, 3)}。完了です。1回の逆向きの走査で、すべての勾配が求まりました。`),
    ];
    readout.innerHTML = msgs[step];
  }
  draw();
}
