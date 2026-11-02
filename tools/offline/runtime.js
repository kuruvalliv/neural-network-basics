// Runtime for the single-file offline build: hash routing instead of separate pages.
import katex from "katex";
import renderMathInElement from "katex/contrib/auto-render";
import { PARTS, PAGES } from "../../assets/js/chapters.js";
import { enhance } from "../../assets/js/components.js";

window.katex = katex;

const doc = document.documentElement;
const LANG_KEY = "nnb-lang";
const IDS = ["index", ...PAGES.map(p => p.id)];
const bi = (en, ja) => `<span lang="en">${en}</span><span lang="ja">${ja}</span>`;
let widgets = {};

function setLang(lang) {
  doc.dataset.lang = lang;
  try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* some file viewers block storage */ }
  document.querySelectorAll(".lang-toggle span").forEach(s => s.setAttribute("aria-current", String(s.dataset.l === lang)));
  document.dispatchEvent(new CustomEvent("langchange", { detail: lang }));
}

function buildChrome() {
  const bar = document.createElement("header");
  bar.className = "topbar";
  bar.innerHTML = `
    <button class="menu-btn" type="button" aria-label="Menu">☰</button>
    <a class="title" href="#index">${bi("Functions That Learn Functions", "関数を学ぶ関数")}</a>
    <button class="lang-toggle" type="button" aria-label="Switch language">
      <span data-l="en">EN</span> | <span data-l="ja">日本語</span>
    </button>`;
  bar.querySelector(".lang-toggle").addEventListener("click", () => setLang(doc.dataset.lang === "ja" ? "en" : "ja"));
  bar.querySelector(".menu-btn").addEventListener("click", () => document.body.classList.toggle("nav-open"));

  const nav = document.createElement("nav");
  nav.className = "sidebar";
  nav.setAttribute("aria-label", "Contents");
  nav.innerHTML = PARTS.map(part => `<h4>${bi(part.en, part.ja)}</h4><ol>${PAGES.filter(p => p.part === part.id)
    .map(p => `<li><a href="#${p.id}" data-id="${p.id}"><span class="num">${p.num}</span>${bi(p.en, p.ja)}</a></li>`).join("")}</ol>`).join("");

  const main = document.querySelector("main");
  const layout = document.createElement("div");
  layout.className = "layout";
  main.before(bar);
  main.replaceWith(layout);
  layout.append(nav, main);

  PAGES.forEach((p, i) => {
    const sec = document.querySelector(`section.page[data-page="${p.id}"]`);
    const prev = PAGES[i - 1], next = PAGES[i + 1];
    const el = document.createElement("nav");
    el.className = "chapter-nav";
    el.innerHTML =
      (prev ? `<a class="prev" href="#${prev.id}"><small>${bi("Previous", "前へ")}</small>${prev.num}. ${bi(prev.en, prev.ja)}</a>` : "<span></span>") +
      (next ? `<a class="next" href="#${next.id}"><small>${bi("Next", "次へ")}</small>${next.num}. ${bi(next.en, next.ja)}</a>` : "<span></span>");
    sec.append(el);
  });

  document.getElementById("toc").innerHTML = PARTS.map(part => `
    <section class="toc-part">
      <h3>${bi(part.en, part.ja)}</h3>
      <ol>${PAGES.filter(p => p.part === part.id).map(p => `
        <li><a href="#${p.id}">${p.num}. ${bi(p.en, p.ja)}</a>${p.qEn ? `<p>${bi(p.qEn, p.qJa)}</p>` : ""}</li>`).join("")}
      </ol>
    </section>`).join("");
}

async function prepare(sec) {
  sec.dataset.ready = "1";
  renderMathInElement(sec, {
    delimiters: [{ left: "$$", right: "$$", display: true }, { left: "$", right: "$", display: false }],
    throwOnError: false,
  });
  enhance(sec);
  for (const el of sec.querySelectorAll("figure.widget[data-widget]")) {
    const body = document.createElement("div");
    body.className = "w-body";
    el.prepend(body);
    try {
      await widgets[el.dataset.widget](body);
    } catch (err) {
      console.error(err);
      body.innerHTML = `<p class="widget-error">${bi("This interactive failed to load.", "このインタラクティブ図を読み込めませんでした。")}</p>`;
    }
  }
}

async function route() {
  const [raw, anchor] = decodeURIComponent(location.hash.slice(1)).split(":");
  const id = IDS.includes(raw) ? raw : "index";
  let sec;
  document.querySelectorAll("section.page").forEach(s => {
    s.hidden = s.dataset.page !== id;
    if (!s.hidden) sec = s;
  });
  document.querySelectorAll(".sidebar a").forEach(a => (a.dataset.id === id ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
  document.body.classList.remove("nav-open");
  const page = PAGES.find(p => p.id === id);
  document.title = page ? `${page.num}. ${page.en} · Functions That Learn Functions` : "Functions That Learn Functions";
  window.scrollTo(0, 0);
  if (!sec.dataset.ready) await prepare(sec);
  if (anchor) document.getElementById(anchor)?.scrollIntoView();
}

export function start(registry) {
  widgets = registry;
  buildChrome();
  setLang(doc.dataset.lang || "en");
  window.addEventListener("hashchange", route);
  route();
}
