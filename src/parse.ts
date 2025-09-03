import { parse } from '@babel/parser';
import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';

export function parseSelection(code: string) {
    const ast = parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript'],
    });
    const found: Array<{ tag: string; props: Record<string, unknown> }> = [];

    traverse(ast, {
        JSXOpeningElement(path: NodePath<t.JSXOpeningElement>) {
            const elName = path.node.name;

            // Only handle <motion.something />
            if (t.isJSXMemberExpression(elName)) {
                const root = getJSXMemberRoot(elName); // JSXIdentifier or null
                if (root && root.name === 'motion') {
                    const tag = elName.property.name; // property is always JSXIdentifier
                    const props = propsMap(path.node.attributes);
                    found.push({ tag, props });
                }
            }
        },
    });

    return { nodes: found, jsx: code };
}

/** Walks left through MemberExpression until it finds the root JSXIdentifier. */
function getJSXMemberRoot(node: t.JSXMemberExpression): t.JSXIdentifier | null {
    let cur: t.JSXMemberExpression['object'] | t.JSXMemberExpression = node;
    while (t.isJSXMemberExpression(cur)) {
        cur = cur.object;
    }
    return t.isJSXIdentifier(cur) ? cur : null;
}

function propsMap(attrs: (t.JSXAttribute | t.JSXSpreadAttribute)[]) {
    const out: Record<string, unknown> = {};
    for (const a of attrs) {
        if (a.type !== 'JSXAttribute' || !a.name || !t.isJSXIdentifier(a.name))
            {continue;}
        const key = a.name.name;
        if (!a.value) {
            out[key] = true;
            continue;
        } // boolean prop
        if (t.isStringLiteral(a.value)) {
            out[key] = a.value.value;
            continue;
        }
        if (t.isJSXExpressionContainer(a.value)) {
            out[key] = print(a.value.expression);
            continue;
        }
    }
    return out;
}

function print(node: t.Node): string {
    const gen = require('@babel/generator'); // or import generate from '@babel/generator'
    const generate = gen.default ?? gen; // handle CJS/ESM
    return generate(node, { concise: true }).code as string;
}
