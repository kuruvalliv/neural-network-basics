// Smoke test: every page, both languages, online (local server) and offline (dist/nn-book.html).
// Usage: npm test   (run `npm run build:offline` first to include the offline file)
import { chromium } from "playwright";
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PAGES } from "../assets/js/chapters.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };
const shots = process.argv.includes("--shots");

const server = createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
  if (!file.startsWith(ROOT) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" }).end(readFileSync(file));
}).listen(0);
const base = `http://localhost:${server.address().port}`;

const inspect = sel => {
  const scope = document.querySelector(sel);
  const ws = [...scope.querySelectorAll("figure.widget")];
  return {
    widgets: ws.length,
    empty: ws.filter(w => !w.querySelector(".w-body")?.children.length).map(w => w.dataset.widget),
    failed: ws.filter(w => w.querySelector(".widget-error")).map(w => w.dataset.widget),
    dollars: (scope.innerText.match(/\$/g) || []).length,
    katexErr: scope.querySelectorAll(".katex-error").length,
    deadTerms: [...scope.querySelectorAll(".term[data-term]")].filter(t => !scope.querySelector(`.word-card[data-term="${t.dataset.term}"]`)).length,
  };
};

let fails = 0;
const report = (tag, info, errs) => {
  const bad = errs.length || info.empty.length || info.failed.length || info.dollars || info.katexErr || info.deadTerms;
  if (bad) fails++;
  console.log(`${bad ? "FAIL" : "ok  "} ${tag} widgets=${info.widgets}`, bad ? JSON.stringify({ ...info, errs: errs.slice(0, 4) }) : "");
};

const browser = await chromium.launch();
for (const lang of ["en", "ja"]) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(l => localStorage.setItem("nnb-lang", l), lang);
  for (const p of [{ file: "index.html", id: "index" }, ...PAGES]) {
    const page = await ctx.newPage();
    const errs = [];
    page.on("console", m => { if (["error", "warning"].includes(m.type())) errs.push(m.text()); });
    page.on("pageerror", e => errs.push(e.message));
    await page.goto(`${base}/${p.file}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    report(`[online ${lang}] ${p.id}`, await page.evaluate(inspect, "main"), errs);
    if (shots && lang === "en") await page.screenshot({ path: `/tmp/nnb-${p.id}.png`, fullPage: true });
    await page.close();
  }
  await ctx.close();
}

const offline = path.join(ROOT, "dist/nn-book.html");
if (existsSync(offline)) {
  for (const lang of ["en", "ja"]) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, offline: true });
    await ctx.route(/^(?!file:)/, r => r.abort());
    await ctx.addInitScript(l => localStorage.setItem("nnb-lang", l), lang);
    const page = await ctx.newPage();
    const errs = [];
    page.on("console", m => { if (["error", "warning"].includes(m.type())) errs.push(m.text()); });
    page.on("pageerror", e => errs.push(e.message));
    await page.goto(pathToFileURL(offline).href);
    for (const id of ["index", ...PAGES.map(p => p.id)]) {
      errs.length = 0;
      await page.evaluate(h => { location.hash = h; }, id);
      await page.waitForFunction(h => document.querySelector(`section.page[data-page="${h}"]`)?.dataset.ready === "1", id);
      await page.waitForTimeout(500);
      report(`[offline ${lang}] ${id}`, await page.evaluate(inspect, `section.page[data-page="${id}"]`), errs);
    }
    await ctx.close();
  }
} else {
  console.log("dist/nn-book.html not found: offline checks skipped");
}

await browser.close();
server.close();
console.log(`failures: ${fails}`);
process.exit(fails ? 1 : 0);
