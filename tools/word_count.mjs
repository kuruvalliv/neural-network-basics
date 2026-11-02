// Counts visible chapter text per language and compares it with a stored baseline.
// Usage: node tools/word_count.mjs [--baseline] [--strict]
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PAGES } from "../assets/js/chapters.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE = path.join(ROOT, "tools/word_baseline.json");
const VOID = new Set(["br", "hr", "img", "input", "meta", "link", "col", "wbr", "source"]);

export function count(html) {
  const main = html.match(/<main>([\s\S]*?)<\/main>/)?.[1] ?? "";
  const stack = [];
  const text = { en: "", ja: "" };
  for (const [tok] of main.matchAll(/<[^>]+>|[^<]+/g)) {
    if (tok.startsWith("</")) { stack.pop(); continue; }
    if (tok.startsWith("<")) {
      const tag = tok.match(/^<(\w+)/)?.[1]?.toLowerCase();
      if (!tag || VOID.has(tag) || tok.endsWith("/>")) continue;
      stack.push({ tag, lang: tok.match(/\slang="(en|ja)"/)?.[1] });
      continue;
    }
    if (stack.some(s => s.tag === "script" || s.tag === "style")) continue;
    const lang = [...stack].reverse().find(s => s.lang)?.lang;
    if (lang) text[lang] += ` ${tok}`;
  }
  return {
    en: text.en.split(/\s+/).filter(w => /[A-Za-z0-9]/.test(w)).length,
    ja: (text.ja.match(/[\u3040-\u30ff\u4e00-\u9fff]/g) || []).length,
  };
}

const chapters = PAGES.filter(p => p.id.startsWith("ch"));
const now = Object.fromEntries(chapters.map(p => [p.id, count(readFileSync(path.join(ROOT, p.file), "utf8"))]));

if (process.argv.includes("--baseline")) {
  writeFileSync(BASELINE, JSON.stringify(now, null, 2) + "\n");
  console.log(`wrote ${path.relative(ROOT, BASELINE)}`);
  process.exit(0);
}
if (!existsSync(BASELINE)) throw new Error("No baseline: run with --baseline first");
const base = JSON.parse(readFileSync(BASELINE, "utf8"));

let short = 0;
console.log("chapter   EN words (base → now, ×)      JA chars (base → now, ×)");
for (const p of chapters) {
  const b = base[p.id], n = now[p.id];
  const re = n.en / b.en, rj = n.ja / b.ja;
  const ok = re >= 2 && rj >= 2;
  if (!ok) short++;
  console.log(`${p.id.padEnd(9)} ${String(b.en).padStart(5)} → ${String(n.en).padStart(5)}  ×${re.toFixed(2)}        ${String(b.ja).padStart(5)} → ${String(n.ja).padStart(5)}  ×${rj.toFixed(2)}  ${ok ? "ok" : "below 2×"}`);
}
if (process.argv.includes("--strict") && short) process.exit(1);
