function flatten(obj, prefix = "") {
  let result = {};

  for (const key in obj) {
    const fullKey = prefix ? prefix + "." + key : key;
    const value = obj[key];

    if (value != null && typeof value === "object" && !Array.isArray(value)) {
      // Nested object → recurse (spread: merge flattened keys into result)
      result = { ...result, ...flatten(value, fullKey) };
    } else if (Array.isArray(value)) {
      // Array → flatten each item with index in key
      value.forEach((item, index) => {
        const itemKey = fullKey + "." + index;
        const isNested = item != null && typeof item === "object" && !Array.isArray(item);
        result = { ...result, ...(isNested ? flatten(item, itemKey) : { [itemKey]: item }) };
      });
    } else {
      result[fullKey] = value;
    }
  }

  return result;
}

const data = {
  id: 1,
  user: {
    name: "Bob",
    roles: ["admin", "editor"],
    contact: {
      email: "bob@example.com",
      phones: [
        { type: "home", number: "123-456" },
        { type: "work", number: "987-654" }
      ]
    }
  },
  active: false
};

console.log(JSON.stringify(flatten(data), null, 2));
