import { PARTS, PAGES } from "./chapters.js";

const doc = document.documentElement;
const root = doc.dataset.root || ".";
const pageId = document.body.dataset.page;
const LANG_KEY = "nnb-lang";

const bi = (en, ja) => `<span lang="en">${en}</span><span lang="ja">${ja}</span>`;
const href = file => `${root}/${file}`;

function setLang(lang) {
  doc.dataset.lang = lang;
  localStorage.setItem(LANG_KEY, lang);
  document.querySelectorAll(".lang-toggle span").forEach(s =>
    s.setAttribute("aria-current", String(s.dataset.l === lang)));
  document.dispatchEvent(new CustomEvent("langchange", { detail: lang }));
}

function buildChrome() {
  const bar = document.createElement("header");
  bar.className = "topbar";
  bar.innerHTML = `
    <button class="menu-btn" type="button" aria-label="Menu">☰</button>
    <a class="title" href="${href("index.html")}">${bi("Functions That Learn Functions", "関数を学ぶ関数")}</a>
    <button class="lang-toggle" type="button" aria-label="Switch language">
      <span data-l="en">EN</span> | <span data-l="ja">日本語</span>
    </button>`;
  bar.querySelector(".lang-toggle").addEventListener("click", () =>
    setLang(doc.dataset.lang === "ja" ? "en" : "ja"));
  bar.querySelector(".menu-btn").addEventListener("click", () =>
    document.body.classList.toggle("nav-open"));

  const nav = document.createElement("nav");
  nav.className = "sidebar";
  nav.setAttribute("aria-label", "Contents");
  nav.innerHTML = PARTS.map(part => {
    const items = PAGES.filter(p => p.part === part.id).map(p => `
      <li><a href="${href(p.file)}"${p.id === pageId ? ' aria-current="page"' : ""}>
        <span class="num">${p.num}</span>${bi(p.en, p.ja)}${p.full ? "" : `<span class="draft">${bi("draft", "草稿")}</span>`}
      </a></li>`).join("");
    return `<h4>${bi(part.en, part.ja)}</h4><ol>${items}</ol>`;
  }).join("");

  const main = document.querySelector("main");
  const layout = document.createElement("div");
  layout.className = "layout";
  main.before(bar);
  main.replaceWith(layout);
  layout.append(nav, main);

  const i = PAGES.findIndex(p => p.id === pageId);
  if (i >= 0) {
    const prev = PAGES[i - 1], next = PAGES[i + 1];
    const navEl = document.createElement("nav");
    navEl.className = "chapter-nav";
    navEl.innerHTML =
      (prev ? `<a class="prev" href="${href(prev.file)}"><small>${bi("Previous", "前へ")}</small>${prev.num}. ${bi(prev.en, prev.ja)}</a>` : "<span></span>") +
      (next ? `<a class="next" href="${href(next.file)}"><small>${bi("Next", "次へ")}</small>${next.num}. ${bi(next.en, next.ja)}</a>` : "<span></span>");
    main.append(navEl);
  }
}

function renderMath() {
  if (!window.renderMathInElement) return;
  window.renderMathInElement(document.querySelector("main"), {
    delimiters: [
      { left: "$$", right: "$$", display: true },
      { left: "$", right: "$", display: false },
    ],
    throwOnError: false,
  });
}

async function mountWidgets() {
  for (const el of document.querySelectorAll("figure.widget[data-widget]")) {
    const body = document.createElement("div");
    body.className = "w-body";
    el.prepend(body);
    try {
      const mod = await import(`./widgets/${el.dataset.widget}.js`);
      await mod.default(body);
    } catch (err) {
      console.error(err);
      body.innerHTML = `<p class="widget-error">${bi("This interactive failed to load.", "このインタラクティブ図を読み込めませんでした。")}</p>`;
    }
  }
}

buildChrome();
setLang(doc.dataset.lang || "en");
renderMath();
mountWidgets();
