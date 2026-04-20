/**
 * 129. Sum Root to Leaf Numbers
 *
 * Approach 1: Recursive DFS
 * Time: O(n), Space: O(h)
 */
var sumNumbers = function(root) {
    let total = 0;

    function dfs(node, current) {
        if (!node) return;
        current = current * 10 + node.val;
        if (!node.left && !node.right) {
            total += current;
            return;
        }
        dfs(node.left, current);
        dfs(node.right, current);
    }

    dfs(root, 0);
    return total;
};

/**
 * Approach 2: Iterative DFS (stack)
 * Each stack entry carries [node, runningNumber].
 * Time: O(n), Space: O(h)
 */
var sumNumbers2 = function(root) {
    if (!root) return 0;

    let total = 0;
    const stack = [[root, 0]];

    while (stack.length) {
        const [node, current] = stack.pop();
        const num = current * 10 + node.val;

        if (!node.left && !node.right) {
            total += num;
        } else {
            if (node.right) stack.push([node.right, num]);
            if (node.left)  stack.push([node.left, num]);
        }
    }

    return total;
};
