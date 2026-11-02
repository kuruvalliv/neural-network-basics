// Builds dist/nn-book.html (one self-contained file) and dist/nn-book-offline.zip.
// Usage: npm run build:offline
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PAGES } from "../assets/js/chapters.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const require = createRequire(import.meta.url);
const read = p => readFileSync(path.join(ROOT, p), "utf8");

const pages = [{ id: "index", file: "index.html" }, ...PAGES];
const idByFile = new Map(pages.map(p => [p.file, p.id]));
const skipped = new Set();

function rewriteLinks(html, file) {
  return html.replace(/href="([^"]+)"/g, (m, href) => {
    if (/^(https?:|mailto:)/.test(href)) return m;
    const [target, anchor] = href.split("#");
    const resolved = target ? path.posix.normalize(path.posix.join(path.posix.dirname(file), target)) : file;
    const id = idByFile.get(resolved);
    if (!id) {
      if (!existsSync(path.join(ROOT, decodeURIComponent(resolved)))) throw new Error(`Broken link ${href} in ${file}`);
      skipped.add(resolved);
      return m;
    }
    return `href="#${id}${anchor ? `:${anchor}` : ""}"`;
  });
}

function pageSections() {
  const seenIds = new Set();
  let styles = "";
  const sections = pages.map(({ id, file }) => {
    const src = read(file);
    const main = src.match(/<main>([\s\S]*?)<\/main>/)?.[1];
    if (!main) throw new Error(`No <main> in ${file}`);
    styles += src.match(/<head>[\s\S]*?<style>([\s\S]*?)<\/style>[\s\S]*?<\/head>/)?.[1] ?? "";
    for (const [, anchor] of main.matchAll(/\sid="([^"]+)"/g)) {
      if (seenIds.has(anchor)) throw new Error(`Duplicate id "${anchor}" (${file})`);
      seenIds.add(anchor);
    }
    return `<section class="page" data-page="${id}" hidden>${rewriteLinks(main, file)}</section>`;
  });
  return { html: sections.join("\n"), styles };
}

async function bundleJs() {
  const widgetFiles = readdirSync(path.join(ROOT, "assets/js/widgets")).filter(f => f.endsWith(".js") && !f.startsWith("_"));
  const entry = [
    `import { start } from "./tools/offline/runtime.js";`,
    ...widgetFiles.map((f, i) => `import w${i} from "./assets/js/widgets/${f}";`),
    `start({ ${widgetFiles.map((f, i) => `${JSON.stringify(f.replace(/\.js$/, ""))}: w${i}`).join(", ")} });`,
  ].join("\n");
  const cdnToNpm = {
    name: "cdn-to-npm",
    setup(b) {
      b.onResolve({ filter: /^https:\/\/cdn\.jsdelivr\.net\/npm\/d3@7\/\+esm$/ }, () => ({ path: require.resolve("d3") }));
    },
  };
  const out = await build({
    stdin: { contents: entry, resolveDir: ROOT, sourcefile: "offline-entry.js" },
    bundle: true, format: "iife", minify: true, write: false, target: "es2020",
    define: { "import.meta.url": JSON.stringify("file:///") },
    plugins: [cdnToNpm],
    logLevel: "warning",
  });
  return out.outputFiles[0].text;
}

function katexCss() {
  const dir = path.dirname(require.resolve("katex/dist/katex.min.css"));
  return readFileSync(path.join(dir, "katex.min.css"), "utf8")
    .replace(/,url\(fonts\/[^)]+\.(?:woff|ttf)\) format\("(?:woff|truetype)"\)/g, "")
    .replace(/url\(fonts\/([^)]+\.woff2)\)/g, (_, f) => `url(data:font/woff2;base64,${readFileSync(path.join(dir, "fonts", f)).toString("base64")})`);
}

function dataScript() {
  const data = Object.fromEntries(readdirSync(path.join(ROOT, "data")).filter(f => f.endsWith(".json"))
    .map(f => [f.replace(/\.json$/, ""), JSON.parse(read(`data/${f}`))]));
  return `window.__NNB_DATA__=${JSON.stringify(data).replace(/</g, "\\u003c")};`;
}

const offlineCss = `
main > section.page > * { max-width: var(--measure); margin-left: auto; margin-right: auto; }
main > section.page > figure.widget, main > section.page > .widget-placeholder { max-width: 56rem; }`;

const { html: sections, styles } = pageSections();
const js = (await bundleJs()).replace(/<\/script/gi, "<\\/script");
const langScript = `let l; try { l = localStorage.getItem("nnb-lang"); } catch (e) {} document.documentElement.dataset.lang = l || (navigator.language.startsWith("ja") ? "ja" : "en");`;

const out = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Functions That Learn Functions</title>
<script>${langScript}</script>
<style>${katexCss()}\n${read("assets/css/book.css")}\n${offlineCss}\n${styles}</style>
</head>
<body>
<main>
${sections}
</main>
<script>${dataScript()}</script>
<script>${js}</script>
</body>
</html>
`;

mkdirSync(DIST, { recursive: true });
const htmlPath = path.join(DIST, "nn-book.html"), zipPath = path.join(DIST, "nn-book-offline.zip");
writeFileSync(htmlPath, out);
try { execFileSync("rm", ["-f", zipPath]); } catch { /* nothing to remove */ }
execFileSync("zip", ["-j", "-9", "-q", zipPath, htmlPath]);
const mb = p => (statSync(p).size / 1e6).toFixed(2);
console.log(`dist/nn-book.html ${mb(htmlPath)} MB, dist/nn-book-offline.zip ${mb(zipPath)} MB`);
if (skipped.size) console.warn(`not bundled (links kept as-is, need the full site): ${[...skipped].join(", ")}`);
