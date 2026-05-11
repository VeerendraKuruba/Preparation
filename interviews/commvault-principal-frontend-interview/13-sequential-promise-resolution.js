'use strict';

let resolvedPromises = [];

async function sequentialResolution(promises, order) {
    try {
        for (const idx of order) {
            const value = await promises[idx - 1];
            resolvedPromises.push(value);
        }
    } catch (err) {
        resolvedPromises.push('Error Thrown');
    }
}

async function main() {
    const n = parseInt(readLine().trim(), 10);
    const promises = [];
    for (let i = 0; i < n; i++) {
        const v = parseInt(readLine().trim(), 10);
        promises.push(
            new Promise((resolve, reject) => {
                if (v !== 0) resolve(v);
                else reject(new Error('Error'));
            })
        );
    }

    const m = parseInt(readLine().trim(), 10);
    const order = [];
    for (let i = 0; i < m; i++) {
        order.push(parseInt(readLine().trim(), 10));
    }

    promises.forEach(p => p.catch(() => {}));

    await sequentialResolution(promises, order);

    resolvedPromises.forEach(v => console.log(v));
}
