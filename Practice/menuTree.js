/**
 * Build a hierarchical menu tree from a flat list.
 * Items: { id, parentId, label } — use parentId: null for roots.
 * Returns { allNodes: { [id]: node }, roots: [] }
 */
function buildMenuTree(items) {
  const allNodes = {};
  const roots = [];

  for (const item of items) {
    allNodes[item.id] = { ...item, children: [] };
  }

  for (const item of items) {
    const node = allNodes[item.id];
    const pid = item.parentId ?? null;
    if (pid == null || !allNodes[pid]) roots.push(node);
    else allNodes[pid].children.push(node);
  }

  return { allNodes, roots };
}

// Example
const flat = [
  { id: 1, parentId: null, label: "Home" },
  { id: 2, parentId: null, label: "Products" },
  { id: 3, parentId: 2, label: "Electronics" },
  { id: 4, parentId: 2, label: "Clothing" },
  { id: 5, parentId: 3, label: "Phones" },
  { id: 6, parentId: 3, label: "Laptops" },
];

const { allNodes, roots } = buildMenuTree(flat);
console.log("allNodes:", allNodes);
console.log("roots:", JSON.stringify(roots, null, 2));
