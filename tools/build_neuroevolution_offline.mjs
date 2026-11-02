// Builds dist/neuroevolution.html (fully self-contained: fonts + three.js inlined) and a .zip of it.
// Usage: npm run build:neuroevolution:offline  (needs network once, to fetch the Google Fonts files)
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const require = createRequire(import.meta.url);

execFileSync("node", [path.join(ROOT, "tools/build_neuroevolution.mjs")], { stdio: "inherit" });
let html = readFileSync(path.join(ROOT, "neuroevolution/index.html"), "utf8");

const FONT_LINK = /<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\s*<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>\s*<link rel="stylesheet" href="(https:\/\/fonts\.googleapis\.com\/css2\?[^"]+)">/;
const THREE_TAG = '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>';
const SUBSETS = new Set(["latin", "latin-ext", "greek"]);

async function fontCss(url) {
  // A modern UA makes Google serve woff2 split by unicode-range subset.
  const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
  const res = await fetch(url.replace(/&amp;/g, "&"), { headers: { "User-Agent": ua } });
  if (!res.ok) throw new Error(`Google Fonts CSS: HTTP ${res.status}`);
  const blocks = [...(await res.text()).matchAll(/\/\* ([\w-]+) \*\/\s*(@font-face\s*\{[^}]*\})/g)]
    .filter(([, subset]) => SUBSETS.has(subset));
  if (!blocks.length) throw new Error("Google Fonts CSS: no @font-face blocks found");
  const out = [];
  for (const [, , block] of blocks) {
    const src = block.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/)?.[1];
    if (!src) throw new Error(`Google Fonts CSS: no woff2 url in ${block}`);
    const font = await fetch(src);
    if (!font.ok) throw new Error(`${src}: HTTP ${font.status}`);
    const b64 = Buffer.from(await font.arrayBuffer()).toString("base64");
    out.push(block.replace(src, `data:font/woff2;base64,${b64}`));
  }
  return out.join("\n");
}

const fontUrl = html.match(FONT_LINK)?.[1];
if (!fontUrl) throw new Error("index.html: Google Fonts <link> block not found");
html = html.replace(FONT_LINK, () => "");
const css = await fontCss(fontUrl);
html = html.replace("<style>", () => `<style>\n${css}\n`);

if (!html.includes(THREE_TAG)) throw new Error("index.html: three.js <script> tag not found");
const three = readFileSync(require.resolve("three/build/three.min.js"), "utf8").replace(/<\/script/gi, "<\\/script");
html = html.replace(THREE_TAG, () => `<script>${three}</script>`);

const leftover = html.match(/(?:src|href)="https?:\/\/[^"]+"|url\(https?:[^)]+\)/);
if (leftover) throw new Error(`still references a remote resource: ${leftover[0]}`);

mkdirSync(DIST, { recursive: true });
const htmlPath = path.join(DIST, "neuroevolution.html"), zipPath = path.join(DIST, "neuroevolution-offline.zip");
writeFileSync(htmlPath, html);
execFileSync("rm", ["-f", zipPath]);
execFileSync("zip", ["-j", "-9", "-q", zipPath, htmlPath]);
const mb = p => (statSync(p).size / 1e6).toFixed(2);
console.log(`dist/neuroevolution.html ${mb(htmlPath)} MB, dist/neuroevolution-offline.zip ${mb(zipPath)} MB`);
