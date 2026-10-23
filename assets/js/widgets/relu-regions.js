import { L, div, slider, button } from "./_lib.js";
import { randomNet, forward } from "./linear-collapse.js";

const relu = z => Math.max(0, z);

export default function mount(el) {
  let seed = 3;
  const ctl = div(el, "controls");
  const ws = slider(ctl, { label: L("width", "幅"), min: 1, max: 12, step: 1, value: 4, format: v => v, onInput: draw });
  const ds = slider(ctl, { label: L("depth", "深さ"), min: 1, max: 4, step: 1, value: 1, format: v => v, onInput: draw });
  button(ctl, L("New random weights", "重みを引き直す"), () => { seed++; draw(); });

  const N = 160;
  const canvas = document.createElement("canvas");
  canvas.width = N; canvas.height = N;
  canvas.style.cssText = "width:100%;max-width:420px;aspect-ratio:1;image-rendering:pixelated;border-radius:8px;display:block;margin:auto";
  el.append(canvas);
  const ctx = canvas.getContext("2d");
  const readout = div(el, "readout");

  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

  function draw() {
    const net = randomNet(seed, ds.value, ws.value, 1.4, 2);
    const img = ctx.createImageData(N, N);
    const seen = new Set();
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const x = [-2 + (4 * i) / (N - 1), 2 - (4 * j) / (N - 1)];
        const { pattern } = forward(net, x, relu);
        seen.add(pattern);
        const h = hash(pattern), k = 4 * (j * N + i);
        img.data[k] = 90 + (h & 127);
        img.data[k + 1] = 90 + ((h >> 8) & 127);
        img.data[k + 2] = 90 + ((h >> 16) & 127);
        img.data[k + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const units = ws.value * ds.value;
    readout.innerHTML = L(
      `Each colour is a region where the network is one single linear function. <b>${seen.size}</b> regions with ${units} ReLU units (${ds.value} layer${ds.value > 1 ? "s" : ""} × ${ws.value}). Every unit draws a line where it switches on. In later layers those “lines” bend, because they are drawn in the already-folded space.`,
      `色ごとに、ネットワークがただ1つの線形関数になっている領域です。ReLU ユニット ${units} 個（${ds.value}層 × ${ws.value}）で <b>${seen.size}</b> 個の領域があります。各ユニットは、オンに切り替わる場所に線を1本引きます。後ろの層の「線」は、すでに折られた空間の中で引かれるので曲がっています。`);
  }
  draw();
}
