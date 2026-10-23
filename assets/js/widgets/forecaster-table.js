import { L, div, button, choice, h } from "./_lib.js";
import { fmt, log2 } from "../math.js";

// Both forecasters call 9 of 10 days in the right direction; both miss day 6.
const DAYS = [1, 1, 0, 1, 0, 1, 1, 0, 0, 1];
const CALL = DAYS.map((y, i) => (i === 5 ? 1 - y : y));
const A = CALL.map(c => (c ? 0.99 : 0.01));
const B = CALL.map(c => (c ? 0.8 : 0.2));

export default function mount(el) {
  let revealed = false, guess = null;
  const ctl = div(el, "controls");
  choice(ctl, {
    label: L("Your guess: who is better?", "予想：どちらが優秀？"),
    options: [{ value: "A", label: "A" }, { value: "B", label: "B" }, { value: "same", label: L("tie", "同じ") }],
    value: null,
    onChange: v => { guess = v; },
  });
  const btn = button(ctl, L("Reveal the score", "スコアを表示"), () => { revealed = !revealed; draw(); });

  const table = h("table", { class: "w-table" });
  el.append(table);
  const readout = div(el, "readout");

  const s = q => -log2(q);
  const icon = y => (y ? "☂" : "☀");

  function draw() {
    btn.innerHTML = revealed ? L("Hide", "隠す") : L("Reveal the score", "スコアを表示");
    const sa = DAYS.map((y, i) => s(y ? A[i] : 1 - A[i]));
    const sb = DAYS.map((y, i) => s(y ? B[i] : 1 - B[i]));
    const cell = (q, sur) => {
      const style = revealed ? `color:${sur > 2 ? "var(--loss)" : "inherit"};font-weight:${sur > 2 ? 700 : 400}` : "";
      return `<td style="${style}">${fmt(q)}${revealed ? `<br><small>${fmt(sur)} bit</small>` : ""}</td>`;
    };
    table.innerHTML =
      `<tr><th>${L("day", "日")}</th>${DAYS.map((_, i) => `<th>${i + 1}</th>`).join("")}${revealed ? `<th>${L("avg surprise", "平均の驚き")}</th>` : ""}</tr>` +
      `<tr><th>${L("weather", "天気")}</th>${DAYS.map(y => `<td style="font-size:1.3em">${icon(y)}</td>`).join("")}${revealed ? "<td></td>" : ""}</tr>` +
      `<tr><th>A: q(☂)</th>${A.map((q, i) => cell(q, sa[i])).join("")}${revealed ? `<td><b>${fmt(sa.reduce((a, b) => a + b) / 10)}</b></td>` : ""}</tr>` +
      `<tr><th>B: q(☂)</th>${B.map((q, i) => cell(q, sb[i])).join("")}${revealed ? `<td><b>${fmt(sb.reduce((a, b) => a + b) / 10)}</b></td>` : ""}</tr>`;

    const verdict = guess === "B" ? L(" You guessed B. Correct!", " あなたの予想は B。正解です！")
      : guess ? L(" Most people guess A or a tie at first.", " 最初は A か「同じ」と予想する人がほとんどです。") : "";
    readout.innerHTML = revealed
      ? L(`Both forecasters call 9 of 10 days in the right direction. But on day 6, A said “1% chance of rain” and it rained. That is a surprise of ${fmt(sa[5])} bits, and it swamps everything else. <b>Lower average surprise wins: B.</b>`,
          `どちらの予報士も10日中9日で向きを当てています。しかし6日目、A は「雨の確率1%」と言い、実際には雨でした。これは ${fmt(sa[5])} ビットの驚きで、他のすべてを打ち消してしまいます。<b>平均の驚きが小さいほうが勝ち：B です。</b>`) + verdict
      : L("Each cell is the probability that forecaster gave to rain that day. Make a guess, then reveal.",
          "各マスは、その日に予報士が雨に与えた確率です。予想してから表示してみましょう。");
  }
  draw();
}
