import { PARTS, PAGES } from "./chapters.js";

const bi = (en, ja) => `<span lang="en">${en}</span><span lang="ja">${ja}</span>`;

document.getElementById("toc").innerHTML = PARTS.map(part => `
  <section class="toc-part">
    <h3>${bi(part.en, part.ja)}</h3>
    <ol>${PAGES.filter(p => p.part === part.id).map(p => `
      <li>
        <a href="${p.file}">${p.num}. ${bi(p.en, p.ja)}</a>
        <span class="badge ${p.full ? "full" : "draft"}">${p.full ? bi("interactive", "インタラクティブ") : bi("draft", "草稿")}</span>
        ${p.qEn ? `<p>${bi(p.qEn, p.qJa)}</p>` : ""}
      </li>`).join("")}
    </ol>
  </section>`).join("");
