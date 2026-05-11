function htmlToJSON(htmlString) {
    const VOID = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
    const s = htmlString;
    let pos = 0;

    function parseAttrs() {
        const attrs = {};
        while (pos < s.length) {
            while (pos < s.length && /\s/.test(s[pos])) pos++;
            if (s[pos] === '>' || s[pos] === '/' || pos >= s.length) break;

            let name = '';
            while (pos < s.length && !/[\s=>\/]/.test(s[pos])) name += s[pos++];
            if (!name) break;

            if (s[pos] === '=') {
                pos++;
                let val = '';
                if (s[pos] === '"' || s[pos] === "'") {
                    const q = s[pos++];
                    while (pos < s.length && s[pos] !== q) val += s[pos++];
                    pos++;
                } else {
                    while (pos < s.length && !/[\s>\/]/.test(s[pos])) val += s[pos++];
                }
                attrs[name] = val;
            } else {
                attrs[name] = '';
            }
        }
        return attrs;
    }

    function parseNodes() {
        const nodes = [];
        while (pos < s.length) {
            if (s[pos] === '<') {
                if (s.substr(pos, 4) === '<!--') {
                    const end = s.indexOf('-->', pos);
                    pos = end === -1 ? s.length : end + 3;
                    continue;
                }
                if (s[pos + 1] === '!' || s[pos + 1] === '?') {
                    const end = s.indexOf('>', pos);
                    pos = end === -1 ? s.length : end + 1;
                    continue;
                }
                if (s[pos + 1] === '/') {
                    const end = s.indexOf('>', pos);
                    pos = end === -1 ? s.length : end + 1;
                    return nodes;
                }
                pos++;
                let tag = '';
                while (pos < s.length && !/[\s>\/]/.test(s[pos])) tag += s[pos++];
                const attributes = parseAttrs();
                while (pos < s.length && /\s/.test(s[pos])) pos++;
                let selfClosing = false;
                if (s[pos] === '/') { selfClosing = true; pos++; }
                if (s[pos] === '>') pos++;

                let children = [];
                if (!selfClosing && !VOID.has(tag.toLowerCase())) {
                    children = parseNodes();
                }
                nodes.push({ tag, attributes, children });
            } else {
                let text = '';
                while (pos < s.length && s[pos] !== '<') text += s[pos++];
                const norm = text.replace(/\s+/g, ' ').trim();
                if (norm) nodes.push({ text: norm });
            }
        }
        return nodes;
    }

    return JSON.stringify(parseNodes());
}

const tests = [
    '<tag1><tag2>Text</tag2></tag1>',
    '<div></div>',
    '<input type="text" name="username" placeholder="Username"/>',
    '<br>',
    '<div class="a" hidden><span>hi</span> world  </div>',
    '<!doctype html><!-- comment --><p>x</p>',
];

for (const t of tests) {
    console.log('IN :', t);
    console.log('OUT:', htmlToJSON(t));
    console.log();
}

// HackerRank stdin entry point
if (require.main === module && !process.stdin.isTTY) {
    let data = '';
    process.stdin.on('data', c => data += c);
    process.stdin.on('end', () => {
        process.stdout.write(htmlToJSON(data.trim()));
    });
}

module.exports = htmlToJSON;
