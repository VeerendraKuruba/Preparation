/**
 * Event Delegation Demo — bubbling, capturing, delegation
 * Run in browser: node won't work (needs DOM)
 *
 * Paste into DevTools or serve with infinite-scroll-demo.html
 */

export function setupDelegation(listEl, onItemClick) {
  listEl.addEventListener("click", (event) => {
    const item = event.target.closest("[data-item-id]");
    if (!item || !listEl.contains(item)) return;
    onItemClick(item.dataset.itemId, event);
  });
}

export function setupCaptureDemo(container) {
  const log = [];

  container.addEventListener(
    "click",
    () => log.push("parent-capture"),
    true
  );
  container.addEventListener("click", () => log.push("parent-bubble"));

  const btn = container.querySelector("button");
  btn?.addEventListener("click", () => log.push("button-bubble"));

  btn?.click();
  return log;
}

// Expected order for setupCaptureDemo click:
// parent-capture → button-bubble → parent-bubble

export function runDelegationDemo() {
  const list = document.getElementById("delegation-list");
  if (!list) return;

  setupDelegation(list, (id) => {
    const status = document.getElementById("delegation-status");
    if (status) status.textContent = `Clicked item ${id}`;
  });

  const addBtn = document.getElementById("add-item");
  let n = list.querySelectorAll("[data-item-id]").length;
  addBtn?.addEventListener("click", () => {
    n += 1;
    const li = document.createElement("li");
    li.dataset.itemId = String(n);
    li.innerHTML = `<button type="button" data-item-id="${n}">Dynamic item ${n}</button>`;
    list.appendChild(li);
  });
}
