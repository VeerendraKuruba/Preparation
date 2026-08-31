/**
 * LinkedIn Phone Screen — getElementsByClassName (no native API)
 * Run in browser console or with jsdom
 *
 * Source: GreatFrontEnd / Frontend Interview Handbook — LinkedIn FE
 */

export function getElementsByClassName(root, className) {
  const result = [];

  function walk(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const classes = node.className;
    if (typeof classes === "string") {
      const list = classes.split(/\s+/).filter(Boolean);
      if (list.includes(className)) result.push(node);
    }

    for (const child of node.children) {
      walk(child);
    }
  }

  walk(root);
  return result;
}

// ─── Browser self-test ───────────────────────────────────────────────────────

if (typeof document !== "undefined") {
  document.body.innerHTML = `
    <div id="root">
      <span class="chip active">A</span>
      <div class="chip">B</div>
      <section><p class="chip active">C</p></section>
    </div>
  `;
  const root = document.getElementById("root");
  const custom = getElementsByClassName(root, "chip");
  const native = root.getElementsByClassName("chip");
  console.assert(custom.length === native.length, "length mismatch");
  console.assert(
    [...custom].every((el, i) => el === native[i]),
    "elements mismatch"
  );
  console.log("getElementsByClassName tests passed:", custom.length, "nodes");
}
