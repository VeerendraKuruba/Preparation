// Decode the secret message from a published Google Doc.
// The doc contains a table where each row is (x-coordinate, character, y-coordinate).
// (0, 0) is the BOTTOM-LEFT corner — y increases upward — so we flip rows when printing.

async function printSecretMessage(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch document: ${response.status}`);
  }
  const html = await response.text();

  // Pull out every <td>...</td> cell from the document. The published Google Doc
  // renders the data as an HTML table with three columns per row: x, char, y.
  const cellMatches = [...html.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)];
  const cells = cellMatches.map(m =>
    m[1].replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
  );

  // The first three cells are the header row ("x-coordinate", "Character", "y-coordinate").
  // After that, cells come in groups of three: x, char, y.
  const entries = [];
  for (let i = 3; i + 2 < cells.length; i += 3) {
    const x = Number(cells[i]);
    const ch = cells[i + 1];
    const y = Number(cells[i + 2]);
    if (Number.isInteger(x) && Number.isInteger(y) && ch.length > 0) {
      entries.push({ x, y, ch });
    }
  }

  if (entries.length === 0) {
    return;
  }

  const maxX = Math.max(...entries.map(e => e.x));
  const maxY = Math.max(...entries.map(e => e.y));

  const grid = Array.from({ length: maxY + 1 }, () =>
    Array(maxX + 1).fill(' ')
  );
  for (const { x, y, ch } of entries) {
    grid[y][x] = ch;
  }

  // y = 0 is the bottom row in the source data, so print from the top down (maxY → 0).
  for (let y = maxY; y >= 0; y--) {
    console.log(grid[y].join(''));
  }
}

// Example usage:
// printSecretMessage('https://docs.google.com/document/d/e/.../pub');

module.exports = { printSecretMessage };
