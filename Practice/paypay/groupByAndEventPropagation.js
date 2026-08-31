/**
 * PayPay Japan SSE Frontend Interview
 *
 * Q1. Group by (merchant, city) and sum amount — no string concatenation for keys
 * Q2. Event propagation with three nested colored divs
 */

// =============================================================================
// Q1. Group by (merchant, city) and sum the amount
// =============================================================================
/**
 * Group data by merchant and city, summing amounts.
 * Do NOT build keys via string concat (e.g. `${merchant}-${city}`).
 * Use nested objects: group[merchant][city] = sum.
 *
 * Input:
 *   [
 *     { merchant: "A", city: "NY", amount: 100 },
 *     { merchant: "A", city: "NY", amount: 50 },
 *     { merchant: "B", city: "LA", amount: 200 },
 *     { merchant: "A", city: "LA", amount: 300 },
 *   ]
 *
 * Nested-object result:
 *   { A: { NY: 150, LA: 300 }, B: { LA: 200 } }
 *
 * Flat array result (if needed):
 *   [
 *     { merchant: "A", city: "NY", amount: 150 },
 *     { merchant: "A", city: "LA", amount: 300 },
 *     { merchant: "B", city: "LA", amount: 200 },
 *   ]
 */

function groupByMerchantCity(data) {
  const group = {};

  for (const { merchant, city, amount } of data) {
    if (!group[merchant]) {
      group[merchant] = {};
    }
    group[merchant][city] = (group[merchant][city] || 0) + amount;
  }

  return group;
}

/** Same idea with Map of Maps — still no string concatenation. */
function groupByMerchantCityMap(data) {
  const group = new Map();

  for (const { merchant, city, amount } of data) {
    if (!group.has(merchant)) {
      group.set(merchant, new Map());
    }
    const byCity = group.get(merchant);
    byCity.set(city, (byCity.get(city) || 0) + amount);
  }

  return group;
}

/** Convert nested group object back to a flat array. */
function groupedToArray(group) {
  const result = [];

  for (const merchant of Object.keys(group)) {
    for (const city of Object.keys(group[merchant])) {
      result.push({ merchant, city, amount: group[merchant][city] });
    }
  }

  return result;
}

const data = [
  { merchant: "A", city: "NY", amount: 100 },
  { merchant: "A", city: "NY", amount: 50 },
  { merchant: "B", city: "LA", amount: 200 },
  { merchant: "A", city: "LA", amount: 300 },
];

const grouped = groupByMerchantCity(data);
console.log("Q1 nested:", grouped);
// { A: { NY: 150, LA: 300 }, B: { LA: 200 } }

console.log("Q1 array:", groupedToArray(grouped));
// [
//   { merchant: "A", city: "NY", amount: 150 },
//   { merchant: "A", city: "LA", amount: 300 },
//   { merchant: "B", city: "LA", amount: 200 },
// ]

// =============================================================================
// Q2. Event propagation — three nested colored divs
// =============================================================================
/**
 * Structure:
 *   <div id="outer"  style="background: red">     <!-- red -->
 *     <div id="middle" style="background: blue">  <!-- blue -->
 *       <div id="inner" style="background: green"><!-- green -->
 *       </div>
 *     </div>
 *   </div>
 *
 * Event flow has three phases:
 *   1. Capturing — window → document → ... → parent → target
 *   2. Target    — handlers on the clicked element itself
 *   3. Bubbling  — target → parent → ... → document → window
 *
 * addEventListener(type, handler, useCapture)
 *   useCapture === true  → runs in capturing phase
 *   useCapture === false → runs in bubbling phase (default)
 *
 * --- Example A: all listeners on bubble (default) ---
 * Click the green (inner) div:
 *
 *   outer.addEventListener("click", () => console.log("red"));
 *   middle.addEventListener("click", () => console.log("blue"));
 *   inner.addEventListener("click", () => console.log("green"));
 *
 * Console:
 *   green
 *   blue
 *   red
 * (target first, then bubble up)
 *
 * --- Example B: mix of capture + bubble ---
 *   outer.addEventListener("click", () => console.log("red-capture"), true);
 *   middle.addEventListener("click", () => console.log("blue-bubble"), false);
 *   inner.addEventListener("click", () => console.log("green-target"), false);
 *   outer.addEventListener("click", () => console.log("red-bubble"), false);
 *
 * Click green (inner). Order:
 *   1. red-capture   (capture: outer → …)
 *   2. green-target  (target / bubble on inner)
 *   3. blue-bubble   (bubble: middle)
 *   4. red-bubble    (bubble: outer)
 *
 * stopPropagation() on any handler stops further travel in that direction.
 * stopImmediatePropagation() also blocks other handlers on the same element.
 *
 * Browser demo (paste into HTML / DevTools):
 *
 *   document.getElementById("outer").addEventListener("click", () => console.log("red"), false);
 *   document.getElementById("middle").addEventListener("click", () => console.log("blue"), false);
 *   document.getElementById("inner").addEventListener("click", () => console.log("green"), false);
 *   // click inner → green, blue, red
 */

module.exports = {
  groupByMerchantCity,
  groupByMerchantCityMap,
  groupedToArray,
};
