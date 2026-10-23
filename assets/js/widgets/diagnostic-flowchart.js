import { L, div, button } from "./_lib.js";

const ch = (f, n) => `<a href="${f}.html">${n}</a>`;
const TREE = {
  start: { q: L("Is the training loss acceptably low?", "訓練損失は十分に低いか？"), yes: "heldout", no: "longer" },
  longer: { q: L("Does the training loss keep falling if you train longer or retune the learning rate?", "長く学習するか学習率を調整し直すと、訓練損失は下がり続けるか？"), yes: "R_search", no: "bigger" },
  bigger: { q: L("Does a clearly bigger or better-structured model drive the training loss down?", "明らかに大きい、あるいはよりよい構造のモデルなら、訓練損失は下がるか？"), yes: "R_repr", no: "R_signal" },
  heldout: { q: L("Is the held-out loss much worse than the training loss?", "学習に使わなかったデータでの損失は、訓練損失よりずっと悪いか？"), yes: "R_overfit", no: "calib" },
  calib: { q: L("Are its probabilities calibrated on held-out data?", "その確率は、学習に使わなかったデータで較正されているか？"), yes: "shift", no: "R_calib" },
  shift: { q: L("Does it still fail on real inputs after deployment?", "実運用の入力では、まだうまくいかないか？"), yes: "R_shift", no: "R_ok" },
  R_search: { r: L("<b>Search problem.</b> The solution is reachable, but slowly. Tune the optimizer, learning-rate schedule, momentum or Adam, and the number of steps.", "<b>探索の問題。</b>解には届きますが、遅いのです。最適化手法、学習率のスケジュール、モメンタムや Adam、ステップ数を調整しましょう。"), go: `${ch("ch09-search", "9")}, ${ch("ch10-gradients", "10")}` },
  R_repr: { r: L("<b>Representation problem.</b> The old family couldn't contain a good answer. Add depth or width, or choose an architecture whose symmetries match the data.", "<b>表現の問題。</b>元の関数族には、よい答えが含まれていませんでした。深さや幅を増やすか、データの対称性に合ったアーキテクチャを選びましょう。"), go: `${ch("ch06-architectures", "6")}, ${ch("ch07-activations", "7")}, ${ch("ch08-topology", "8")}` },
  R_signal: { r: L("<b>Stuck search, or no signal.</b> Check initialization, normalization, and dead or saturated activations. If those are healthy, the inputs may simply not determine y: the entropy floor is high.", "<b>探索が行き詰まっているか、信号がない。</b>初期化、正規化、死んだ（または飽和した）活性化関数を確認しましょう。それらが健全なら、入力がそもそも y を決めていないのかもしれません。エントロピーの床が高いのです。"), go: `${ch("ch07-activations", "7.4")}, ${ch("ch10-gradients", "10.5")}, ${ch("ch02-information", "2.2")}` },
  R_overfit: { r: L("<b>Data / generalization problem.</b> The model memorized. Regularize, stop early, get more data, or build in the structure the data has.", "<b>データ・汎化の問題。</b>モデルが記憶してしまいました。正則化する、早めに止める、データを増やす、あるいはデータの持つ構造を組み込みましょう。"), go: `${ch("ch12-generalization", "12")}, ${ch("ch05-structure", "5")}` },
  R_calib: { r: L("<b>Calibration problem.</b> The ranking is fine, but the confidence is not. Fit a temperature on held-out data.", "<b>較正の問題。</b>順位付けは問題ありませんが、確信度がおかしいのです。学習に使わなかったデータで温度を当てはめましょう。"), go: ch("ch12-generalization", "12.3") },
  R_shift: { r: L("<b>Distribution shift.</b> The world your model meets differs from the one it learned. Measure epistemic uncertainty, and collect data from the new conditions.", "<b>分布のずれ。</b>モデルが出会う世界が、学習した世界と違っています。認識的不確実性を測り、新しい条件のデータを集めましょう。"), go: `${ch("ch12-generalization", "12.5")}, ${ch("ch05-structure", "5")}` },
  R_ok: { r: L("<b>Working as intended.</b> Fitted, generalizing, and honest.", "<b>意図どおりに動いています。</b>当てはまり、汎化し、正直です。"), go: ch("ch13-synthesis", "13") },
};

export default function mount(el) {
  let path = ["start"];
  const crumbs = div(el, "");
  crumbs.style.cssText = "font-size:13px;color:var(--muted);margin-bottom:.5rem";
  const card = div(el, "level");
  card.style.cssText = "padding:1rem;font-size:1.05em";
  const ctl = div(el, "controls");

  function draw() {
    const node = TREE[path.at(-1)];
    crumbs.innerHTML = path.slice(0, -1).map((k, i) => `${TREE[k].q} → <b>${path[i + 1] === TREE[k].yes ? L("yes", "はい") : L("no", "いいえ")}</b>`).join("<br>");
    ctl.innerHTML = "";
    if (node.q) {
      card.innerHTML = node.q;
      button(ctl, L("Yes", "はい"), () => { path.push(node.yes); draw(); });
      button(ctl, L("No", "いいえ"), () => { path.push(node.no); draw(); });
    } else {
      card.innerHTML = `${node.r}<br><small>${L("Revisit", "読み返す章")}: ${node.go}</small>`;
    }
    if (path.length > 1) button(ctl, L("◀ Back", "◀ 戻る"), () => { path.pop(); draw(); });
    if (path.length > 1) button(ctl, L("Start over", "最初から"), () => { path = ["start"]; draw(); });
  }
  draw();
}
