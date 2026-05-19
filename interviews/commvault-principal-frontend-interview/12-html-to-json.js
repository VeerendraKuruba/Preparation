function htmlToJSON(htmlString) {
    const VOID = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
    const s = htmlString;
    let pos = 0;

    // Parse attributes on the current opening tag until '>', '/', or end of string.
    // Example: <input type="text" name=username hidden />
    //   → { type: "text", name: "username", hidden: "" }
    function parseAttrs() {
        const attrs = {};
        while (pos < s.length) {
            // /\s/ — skip spaces between attributes (e.g. after type="text" before name=)
            while (pos < s.length && /\s/.test(s[pos])) pos++;
            // Done when tag ends or self-closes: ...> or .../>
            if (s[pos] === '>' || s[pos] === '/' || pos >= s.length) break;

            let name = '';
            // /[\s=>\/]/ — attr name stops at whitespace, '=', '>', or '/'
            // e.g. type in type="text", hidden in hidden (no '=' yet)
            while (pos < s.length && !/[\s=>\/]/.test(s[pos])) name += s[pos++];
            if (!name) break;

            if (s[pos] === '=') {
                pos++;
                let val = '';
                if (s[pos] === '"' || s[pos] === "'") {
                    // Quoted value: class="a b" or class='a b' — read until matching quote
                    const q = s[pos++];
                    while (pos < s.length && s[pos] !== q) val += s[pos++];
                    pos++; // skip closing quote
                } else {
                    // Unquoted value: name=username — stop at whitespace, '>', or '/'
                    // /[\s>\/]/ same idea as tag-name regex (no '=' in value path)
                    while (pos < s.length && !/[\s>\/]/.test(s[pos])) val += s[pos++];
                }
                attrs[name] = val;
            } else {
                // Boolean attr: hidden, disabled — present with empty string
                attrs[name] = '';
            }
        }
        return attrs;
    }

    // Walk the string and build sibling nodes until a closing tag or EOF.
    // Example: <tag1><tag2>Text</tag2></tag1>
    //   parseNodes() at top level → [{ tag:"tag1", children:[{ tag:"tag2", children:[{ text:"Text" }] }] }]
    //   parseNodes() inside tag1 stops at </tag2> and returns [{ tag:"tag2", ... }]
    function parseNodes() {
        const nodes = [];
        while (pos < s.length) {
            if (s[pos] === '<') {
                // HTML comment: ignored — never becomes a JSON node.
                // Example input:  <div><!-- note --><p>x</p></div>
                // JSON output:    [{ tag:"div", children:[{ tag:"p", children:[{ text:"x" }] }] }]
                //                 (no { text:"note" } — the comment is skipped entirely)
                //
                // s.substr(pos, 4) === '<!--'  → we're at a comment opener
                // indexOf('-->', pos)          → find where the comment ends
                // pos = end + 3                → jump past '-->' and keep parsing siblings
                // end === -1 ? s.length        → unclosed comment: skip rest of string
                if (s.substr(pos, 4) === '<!--') {
                    const end = s.indexOf('-->', pos);
                    pos = end === -1 ? s.length : end + 3;
                    continue;
                }
                // Declaration / PI — skip whole token, do not emit a node
                // Example input:  <!doctype html><p>x</p>
                // JSON output:    [{ tag:"p", children:[{ text:"x" }] }]  (no doctype node)
                // s[pos+1]==='!' catches <!...>  ;  s[pos+1]==='?' catches <?...?>
                if (s[pos + 1] === '!' || s[pos + 1] === '?') {
                    const end = s.indexOf('>', pos);
                    pos = end === -1 ? s.length : end + 1;
                    continue;
                }
                // Closing tag — stop this parseNodes call and return siblings built so far
                // Example: <tag1><tag2>Text</tag2></tag1>
                //   Inside tag1, children parseNodes() runs until it sees </tag2> → returns [{ tag:"tag2", ... }]
                //   Caller tag1 then keeps going until </tag1>
                if (s[pos + 1] === '/') {
                    const end = s.indexOf('>', pos);
                    pos = end === -1 ? s.length : end + 1;
                    return nodes;
                }
                // --- Opening tag: <tag ...> or <tag/> ---
                pos++; // skip '<'
                let tag = '';
                // /[\s>\/]/ — tag name ends at whitespace, '>', or '/' (attrs or self-close)
                // e.g. <div class="a">     → read "div", stop at space before class
                // e.g. <input type="text"/> → read "input", stop at space before type
                // e.g. <br/>               → read "br", stop at '/' before '>'
                while (pos < s.length && !/[\s>\/]/.test(s[pos])) tag += s[pos++];
                const attributes = parseAttrs(); // e.g. class="a" → { class: "a" }
                while (pos < s.length && /\s/.test(s[pos])) pos++; // trim space before / or >
                let selfClosing = false;
                if (s[pos] === '/') { selfClosing = true; pos++; } // <div /> or <br/>
                if (s[pos] === '>') pos++; // consume closing '>'

                let children = [];
                // Recurse only for normal containers — not void/self-closing tags
                // <div>...</div>  → parseNodes() for children
                // <br> or <input/> → children stays []
                if (!selfClosing && !VOID.has(tag.toLowerCase())) {
                    children = parseNodes();
                }
                nodes.push({ tag, attributes, children });
            } else {
                // Text between tags — e.g. " world  " in <span>hi</span> world </div>
                let text = '';
                while (pos < s.length && s[pos] !== '<') text += s[pos++];
                // Collapse whitespace: "  hello \n  world  " → "hello world"
                const norm = text.replace(/\s+/g, ' ').trim();
                if (norm) nodes.push({ text: norm }); // skip empty/whitespace-only runs
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
