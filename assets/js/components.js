// Interactivity for the building-block components; called once per rendered page.
const bi = (en, ja) => `<span lang="en">${en}</span><span lang="ja">${ja}</span>`;

export function enhance(root) {
  const cards = new Map([...root.querySelectorAll(".word-card[data-term]")].map(c => [c.dataset.term, c]));
  root.querySelectorAll(".term[data-term]").forEach(t => {
    const card = cards.get(t.dataset.term);
    if (!card) return;
    t.tabIndex = 0;
    const on = () => { card.classList.add("active"); t.classList.add("active"); };
    const off = () => { card.classList.remove("active"); t.classList.remove("active"); };
    t.addEventListener("mouseenter", on);
    t.addEventListener("mouseleave", off);
    t.addEventListener("focus", on);
    t.addEventListener("blur", off);
    t.addEventListener("click", () => { on(); card.scrollIntoView({ block: "nearest", behavior: "smooth" }); });
  });

  root.querySelectorAll(".derivation").forEach(d => {
    if (!d.querySelector(".step.minor") || d.querySelector(".step-toggle")) return;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "w-btn step-toggle";
    const label = () => (b.innerHTML = d.classList.contains("show-all")
      ? bi("Hide the small steps", "細かいステップを隠す")
      : bi("Show every step", "すべてのステップを表示"));
    b.addEventListener("click", () => { d.classList.toggle("show-all"); label(); });
    label();
    d.append(b);
  });

  root.querySelectorAll("nav.tree").forEach(tree => trackTree(root, tree));
}

// Sticky "you are here" trail: the tree path of the section currently being read.
function trackTree(root, tree) {
  const idOf = a => a.getAttribute("href").split(/[#:]/).pop();
  const nodes = [...tree.querySelectorAll("a.t-node")].map(a => {
    const path = [];
    for (let li = a.closest("li"); li && tree.contains(li); li = li.parentElement.closest("li")) {
      path.unshift(li.querySelector(":scope > a.t-node"));
    }
    return { a, path, head: root.querySelector(`[id="${idOf(a)}"]`) };
  }).filter(n => n.head);
  const trail = document.createElement("div");
  trail.className = "trail";
  tree.after(trail);
  let shown = null;

  const update = () => {
    if (!tree.offsetParent) return;
    const past = tree.getBoundingClientRect().bottom < 60;
    const cur = past ? nodes.filter(n => n.head.getBoundingClientRect().top < 150).pop() : null;
    trail.classList.toggle("on", !!cur);
    if (cur === shown) return;
    shown = cur;
    nodes.forEach(n => n.a.classList.toggle("active", n === cur));
    if (cur) {
      trail.innerHTML = cur.path.map(a => {
        const id = a.querySelector(".t-id");
        const label = id ? id.outerHTML + (a.querySelector(".t-title")?.innerHTML ?? "") : bi("Claim", "結論");
        return `<a href="${a.getAttribute("href")}">${label}</a>`;
      }).join('<span class="sep">›</span>');
    }
  };
  let pending = false;
  window.addEventListener("scroll", () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; update(); });
  }, { passive: true });
  update();
}
