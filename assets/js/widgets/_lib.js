import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export { d3 };

// The offline build embeds data/*.json in window.__NNB_DATA__ because file:// pages cannot fetch.
export async function loadData(name) {
  if (window.__NNB_DATA__?.[name]) return window.__NNB_DATA__[name];
  return (await fetch(new URL(`../../../data/${name}.json`, import.meta.url))).json();
}

export const COLOR = {
  p: "var(--p)", q: "var(--q)", data: "var(--data)", loss: "var(--loss)",
  ink: "var(--ink)", muted: "var(--muted)", grid: "var(--grid)", accent: "var(--accent)", ok: "var(--ok)",
};

export const L = (en, ja) => `<span lang="en">${en}</span><span lang="ja">${ja}</span>`;

export function tex(src, display = false) {
  return window.katex ? window.katex.renderToString(src, { throwOnError: false, displayMode: display }) : src;
}

export function h(tag, attrs = {}, html = "") {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  e.innerHTML = html;
  return e;
}

export function div(parent, cls, html = "") {
  const e = h("div", { class: cls }, html);
  parent.append(e);
  return e;
}

export function slider(parent, { label, min, max, step, value, format = v => v.toFixed(2), onInput }) {
  const wrap = h("label", { class: "ctl" }, `<span class="ctl-label">${label}</span>`);
  const input = h("input", { type: "range", min, max, step, value });
  const out = h("output");
  wrap.append(input, out);
  parent.append(wrap);
  const update = () => {
    out.innerHTML = format(+input.value);
    onInput?.(+input.value);
  };
  input.addEventListener("input", update);
  out.innerHTML = format(+input.value);
  return {
    input,
    get value() { return +input.value; },
    set(v) { input.value = v; update(); },
  };
}

export function choice(parent, { label, options, value, onChange }) {
  const wrap = h("div", { class: "ctl ctl-choice", role: "group" });
  if (label) wrap.innerHTML = `<span class="ctl-label">${label}</span>`;
  let cur = value;
  const btns = options.map(o => {
    const b = h("button", { type: "button", "data-value": o.value }, o.label);
    b.addEventListener("click", () => set(o.value, true));
    wrap.append(b);
    return b;
  });
  function set(v, fire) {
    cur = v;
    btns.forEach(b => {
      const on = b.dataset.value === String(v);
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", String(on));
    });
    if (fire) onChange?.(v);
  }
  set(value, false);
  parent.append(wrap);
  return { get value() { return cur; }, set };
}

export function button(parent, label, onClick) {
  const b = h("button", { type: "button", class: "w-btn" }, label);
  b.addEventListener("click", onClick);
  parent.append(b);
  return b;
}

export function legend(parent, items) {
  return div(parent, "legend", items.map(([color, label, dashed]) =>
    `<span><i style="background:${dashed ? "transparent" : color};${dashed ? `border-top:2px dashed ${color};height:0` : ""}"></i>${label}</span>`).join(""));
}

export function plot(parent, {
  width = 560, height = 300, margin = {}, x = [0, 1], y = [0, 1], xBand = null, xLog = false,
  xLabel = "", yLabel = "", xTicks = 6, yTicks = 5, xFormat = null, yFormat = null,
} = {}) {
  const m = { top: 14, right: 16, bottom: 40, left: 50, ...margin };
  const svg = d3.select(parent).append("svg")
    .attr("class", "plot").attr("viewBox", `0 0 ${width} ${height}`).attr("role", "img");
  const W = width - m.left - m.right, H = height - m.top - m.bottom;
  const root = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);
  const xs = xBand
    ? d3.scaleBand().domain(xBand).range([0, W]).padding(0.25)
    : (xLog ? d3.scaleLog() : d3.scaleLinear()).domain(x).range([0, W]);
  const ys = d3.scaleLinear().domain(y).range([H, 0]);
  const gx = root.append("g").attr("class", "axis").attr("transform", `translate(0,${H})`);
  const gy = root.append("g").attr("class", "axis");
  const drawAxes = () => {
    const ax = d3.axisBottom(xs);
    if (!xBand) xLog ? ax.ticks(xTicks, ".2") : ax.ticks(xTicks);
    if (xFormat) ax.tickFormat(xFormat);
    if (xFormat === piFormat) ax.tickValues([0, 1, 2, 3, 4].map(k => (k * Math.PI) / 2));
    gx.call(ax);
    const ay = d3.axisLeft(ys).ticks(yTicks);
    if (yFormat) ay.tickFormat(yFormat);
    gy.call(ay);
  };
  drawAxes();
  if (xLabel) root.append("text").attr("class", "axis-label").attr("x", W / 2).attr("y", H + 34).attr("text-anchor", "middle").text(xLabel);
  if (yLabel) root.append("text").attr("class", "axis-label").attr("transform", "rotate(-90)").attr("x", -H / 2).attr("y", -38).attr("text-anchor", "middle").text(yLabel);
  const g = root.append("g");
  return { svg, root, g, x: xs, y: ys, W, H, drawAxes };
}

export const piFormat = v => {
  const k = Math.round((v / Math.PI) * 2);
  if (Math.abs(v - (k * Math.PI) / 2) > 1e-6) return d3.format(".1f")(v);
  return ["0", "π/2", "π", "3π/2", "2π"][k] ?? "";
};

export const line = (xs, ys) => d3.line().x(d => xs(d[0])).y(d => ys(d[1]));
