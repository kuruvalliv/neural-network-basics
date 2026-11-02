// Builds neuroevolution/index.html: one seamless book from the four standalone chapter pages.
// Usage: npm run build:neuroevolution
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "neuroevolution");
const OUT = path.join(SRC, "index.html");
const read = f => readFileSync(f, "utf8");

const CHAPTERS = [
  {
    id: "basics",
    file: "The Basics, Evolved.html",
    title: "The Basics of Evolutionary Search",
    blurb: "The loop behind every method: make candidates, score them, keep and vary the best. Then smarter versions that learn where to search.",
    accent: ["#3E6FB0", "#7EA6E0"],
    replace: [
      ["Chapter 2 · Neuroevolution (Risi, Tang, Ha, Miikkulainen)", "Chapter 1 · Search without gradients"],
      ['<span class="brand">Ch 2</span>', '<span class="brand">Ch 1</span>'],
      ["<h4>Ch 3 · Neuroevolution fundamentals</h4>", '<h4><a href="#/networks">Next: Chapter 2 · Neuroevolution fundamentals</a></h4>'],
    ],
    primer: {
      idea: "You can improve something without knowing its slope. Keep a <b>population</b> of guesses, score each one, and make new guesses near the best ones. Repeat.",
      know: "Gradient descent follows the derivative of a loss. Here we only <em>compare</em> scores. The evolution strategies sample guesses from a normal distribution <i>N</i>(μ, σ²): μ is the current best guess, σ is how far we dare to step.",
      watch: "population, fitness, selection, mutation, covariance, Pareto front",
    },
  },
  {
    id: "networks",
    file: "Neuroevolution Fundamentals.html",
    title: "Neuroevolution Fundamentals",
    blurb: "Put a neural network inside that loop: evolve its weights, then grow its structure one neuron and connection at a time with NEAT.",
    accent: ["#B4483C", "#E07A6C"],
    replace: [[">Chapter 3<", ">Chapter 2 · Evolving neural networks<"]],
    primer: {
      idea: "A network's weights are just a long list of numbers, so Chapter 1's search can tune them. Going further, evolution can also decide <b>how many neurons</b> a network has and how they connect.",
      know: "You know a network as layers of weights plus an activation function, trained by backpropagation. Here there is no backpropagation: each network is tested on a task (like walking) and gets one score at the end.",
      watch: "genotype vs phenotype, direct vs indirect encoding, NEAT, innovation number, species",
    },
  },
  {
    id: "diversity",
    file: "Diversity, Hands-On.html",
    title: "Utilizing Diversity",
    blurb: "Why chasing only the best score gets stuck, and how rewarding difference (novelty search, MAP-Elites) finds better answers.",
    accent: ["#0F7C8C", "#4FC1CF"],
    replace: [
      ["Neuroevolution · Chapter 5", "Chapter 3 · Why being different helps"],
      ['<a href="#top">Ch 5</a>', '<a href="#top">Top</a>'],
    ],
    primer: {
      idea: "If everyone in the population copies the current best, the search can get stuck on a <b>local optimum</b>. Rewarding candidates for being <em>different</em> keeps exploring, and often finds the true best by accident.",
      know: "Gradient descent can also get stuck in a local minimum. “Different” is measured as a distance between vectors that describe behavior, just like distances between embeddings in an LLM.",
      watch: "premature convergence, deception, novelty score, archive, quality diversity, MAP-Elites",
    },
  },
  {
    id: "genai",
    file: "Evolution Meets GenAI.html",
    title: "Synergies with Generative AI",
    blurb: "Evolution improves LLMs (prompts, model merges, fine-tuning), and LLMs improve evolution by proposing smart, meaningful changes.",
    accent: ["#8C3D6E", "#D985B6"],
    replace: [
      ["Chapter 13 · Neuroevolution", "Chapter 4 · Evolution meets LLMs"],
      ['<a href="#top">Ch13</a>', '<a href="#top">Top</a>'],
    ],
    primer: {
      idea: "The arrows run both ways. Evolution can search over things an LLM uses (its prompt, its weights, how to merge models). An LLM can act as the <b>mutation step</b> of evolution, editing code or prompts in sensible ways instead of randomly.",
      know: "An LLM predicts a probability distribution over the next token. <b>Temperature</b> controls how random its samples are. The search methods are the ones from Chapters 1–3: evolution strategies, MAP-Elites and novelty search.",
      watch: "prompt, model merging, LLM mutation, latent vector, world model, temperature",
    },
  },
].map((c, i) => ({ ...c, num: i + 1 }));

const OVERRIDE_CSS = `
:host{display:block}
nav.toc{top:var(--bar-h,56px) !important}
@media (min-width:1024px){nav.toc{display:none !important}}
[id]{scroll-margin-top:0 !important}
.wrap{padding-bottom:8px !important}
.ne-primer{margin:30px 0 8px;padding:18px 22px;background:var(--panel);border:1px solid var(--line);border-left:4px solid var(--accent);border-radius:12px;font-size:16px;line-height:1.55}
.ne-primer .ne-k{font:600 12px/1.2 "JetBrains Mono",ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);margin:0 0 12px}
.ne-primer dl{display:grid;grid-template-columns:11em minmax(0,1fr);gap:10px 18px;margin:0}
.ne-primer dt{font:600 13px/1.5 "Bricolage Grotesque",system-ui,sans-serif;color:var(--muted)}
.ne-primer dd{margin:0;max-width:70ch}
@media (max-width:640px){.ne-primer dl{grid-template-columns:1fr;gap:2px}.ne-primer dd{margin-bottom:10px}}
`;

function replaceRequired(text, from, to, where) {
  if (!text.includes(from)) throw new Error(`${where}: expected to find ${JSON.stringify(from)}`);
  return text.replace(from, to);
}

function scopeCss(css, where) {
  const out = css
    .replace(/:root\[data-theme="dark"\]/g, ':host([data-theme="dark"])')
    .replace(/:root:not\(\[data-theme="light"\]\)/g, ':host(:not([data-theme="light"]))')
    .replace(/:root\b/g, ":host")
    .replace(/(^|[{}\s;])html\{[^}]*\}/g, "$1")
    .replace(/(^|[{}\s;])body\{/g, "$1:host{");
  if (/(^|[{}\s;,])(html|body)\s*[{,]|:root/.test(out)) throw new Error(`${where}: unscoped page-level CSS remains`);
  return out;
}

const escapeHtml = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function primerHtml(c) {
  return `<aside class="ne-primer" aria-label="Before you start">
<p class="ne-k">Before you start</p>
<dl>
<dt>The big idea</dt><dd>${c.primer.idea}</dd>
<dt>What you already know</dt><dd>${c.primer.know}</dd>
<dt>Words to watch</dt><dd>${c.primer.watch}. Definitions are in the <a href="#/glossary">glossary</a>.</dd>
</dl>
</aside>
`;
}

function extract(c) {
  const where = c.file;
  const src = read(path.join(SRC, c.file));
  const styles = [...src.matchAll(/<style>([\s\S]*?)<\/style>/g)];
  if (styles.length !== 2) throw new Error(`${where}: expected 2 <style> blocks, found ${styles.length}`);
  const main = styles[1];
  const bodyStart = main.index + main[0].length;
  const scriptAt = src.indexOf("<script", bodyStart);
  const scripts = [...src.slice(scriptAt).matchAll(/<script>([\s\S]*?)<\/script>/g)];
  if (scripts.length !== 1) throw new Error(`${where}: expected 1 inline <script>, found ${scripts.length}`);

  let html = src.slice(bodyStart, scriptAt).trim();
  for (const [from, to] of c.replace) html = replaceRequired(html, from, to, where);
  const mapAt = html.search(/<section(?=[^>]*\bid="map")/);
  if (mapAt < 0) throw new Error(`${where}: no <section id="map"> to place the primer before`);
  html = html.slice(0, mapAt) + primerHtml(c) + html.slice(mapAt);

  const nav = html.match(/<nav class="toc"[\s\S]*?<\/nav>/)?.[0];
  if (!nav) throw new Error(`${where}: no chapter nav found`);
  const sections = [...nav.matchAll(/<a( class="grp")? href="#([^"]+)">([^<]+)<\/a>/g)]
    .filter(([, grp, id]) => !grp && id !== "top")
    .map(([, , id, label]) => ({ id, label }));
  for (const s of sections) if (!html.includes(`id="${s.id}"`)) throw new Error(`${where}: nav target #${s.id} missing`);

  return { ...c, html, css: scopeCss(main[1], where), js: scripts[0][1], sections };
}

const chapters = CHAPTERS.map(extract);
const routes = [{ id: "intro", title: "Start here" }, ...chapters, { id: "glossary", title: "Glossary" }];
const href = id => (id === "intro" ? "#/" : `#/${id}`);

function pager(id) {
  const i = routes.findIndex(r => r.id === id);
  const label = r => (r.num ? `Chapter ${r.num} · ${r.title}` : r.title);
  const prev = routes[i - 1], next = routes[i + 1];
  return `<nav class="pager" aria-label="Chapter navigation">${
    prev ? `<a class="prev" href="${href(prev.id)}"><small>← Previous</small><b>${label(prev)}</b></a>` : ""
  }${next ? `<a class="next" href="${href(next.id)}"><small>Next →</small><b>${label(next)}</b></a>` : ""}</nav>`;
}

const sidebar = `<ol class="toc-list">
<li data-route="intro"><a href="#/"><span class="num">·</span>Start here</a></li>
${chapters.map(c => `<li data-route="${c.id}"><a href="#/${c.id}"><span class="num">${c.num}</span>${c.title}</a>
<ol class="secs">${c.sections.map(s => `<li><a href="#/${c.id}/${s.id}" data-sec="${s.id}">${escapeHtml(s.label)}</a></li>`).join("")}</ol></li>`).join("\n")}
<li data-route="glossary" class="gap"><a href="#/glossary"><span class="num">A</span>Glossary</a></li>
</ol>`;

const readingPath = `<ol class="path">
${chapters.map(c => `<li><a href="#/${c.id}" style="--c:var(--c-${c.id})"><span class="n">${c.num}</span><b>${c.title}</b><span class="d">${c.blurb}</span><span class="go">Read →</span></a></li>`).join("\n")}
</ol>`;

const accentCss = [
  `:root{${chapters.map(c => `--c-${c.id}:${c.accent[0]}`).join(";")}}`,
  `@media (prefers-color-scheme: dark){:root{${chapters.map(c => `--c-${c.id}:${c.accent[1]}`).join(";")}}}`,
  ...chapters.map(c => `body[data-route="${c.id}"]{--accent:var(--c-${c.id})}`),
].join("\n");

const chapterPages = chapters.map(c =>
  `<section class="page off" data-route="${c.id}" tabindex="-1" aria-label="Chapter ${c.num}: ${c.title}" inert>
<div class="chapter-host" data-chapter="${c.id}"></div>
${pager(c.id)}
</section>`).join("\n\n");

const templates = chapters.map(c =>
  `<template id="tpl-${c.id}"><style>${c.css}\n${OVERRIDE_CSS}</style>\n${c.html}\n</template>`).join("\n");

const chapterScripts = chapters.map(c =>
  `<script>NE.define(${JSON.stringify(c.id)}, function (document) {\n${c.js}\n});</script>`).join("\n");

const data = JSON.stringify(chapters.map(({ id, num, title }) => ({ id, num, title }))).replace(/</g, "\\u003c");

const fill = {
  ACCENT_CSS: accentCss,
  SIDEBAR: sidebar,
  PATH: readingPath,
  CHAPTER_PAGES: chapterPages,
  TEMPLATES: templates,
  DATA: data,
  CHAPTER_SCRIPTS: chapterScripts,
  "PAGER:intro": pager("intro"),
  "PAGER:glossary": pager("glossary"),
};

let out = read(path.join(ROOT, "tools/neuroevolution/shell.html"));
for (const [key, value] of Object.entries(fill)) out = replaceRequired(out, `{{${key}}}`, () => value, "shell.html");
const leftover = out.match(/\{\{[A-Z_:a-z]+\}\}/);
if (leftover) throw new Error(`shell.html: unfilled placeholder ${leftover[0]}`);

writeFileSync(OUT, out);
console.log(`neuroevolution/index.html ${(out.length / 1024).toFixed(0)} KB · ${chapters.length} chapters`);
