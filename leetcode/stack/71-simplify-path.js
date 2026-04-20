// Split on '/', use a stack: skip "" and ".", pop on "..", push real names.
// Time O(n), space O(n) for the stack and split parts.
var simplifyPath = function (path) {
    const stack = [];
    const parts = path.split("/");

    for (const part of parts) {
        if (part === "" || part === ".") continue;
        if (part === "..") {
            stack.pop();
        } else {
            stack.push(part);
        }
    }

    return "/" + stack.join("/");
};
