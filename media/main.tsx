import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { motion,AnimatePresence  } from 'framer-motion'
import * as Babel from '@babel/standalone'

/** Find capitalized JSX tags (likely custom components) so we can stub them */
function collectUppercaseComponents(src: string): string[] {
    const re = /<([A-Z][A-Za-z0-9_]*)\b/g
    const set = new Set<string>()
    let m: RegExpExecArray | null
    while ((m = re.exec(src))) {
        const name = m[1]
        if (name !== 'Fragment') set.add(name)
    }
    return [...set]
}

/** Build code that defines stubs for unknown components */
function buildStubPrelude(names: string[]): string {
    return names.map((n) => `const ${n} = stubs["${n}"];`).join('\n')
}

/** Build (and eval) a function that returns a React element from JSX */
function renderFromJSX(jsx: string): React.ReactNode {
    // 1) Stub unknown capitalized components so they don't crash the preview
    const names = collectUppercaseComponents(jsx).filter((n) => n !== 'motion')
    const stubs: Record<string, React.FC<any>> = {}
    for (const n of names) {
        stubs[n] = () =>
            React.createElement(
                'div',
                {
                    style: {
                        display: 'inline-flex',
                        padding: 6,
                        margin: 4,
                        borderRadius: 6,
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px dashed rgba(255,255,255,0.2)',
                        fontSize: 12,
                        color: 'rgba(255,255,255,0.7)',
                    },
                },
                `<${n} />`
            )
    }

    // 2) Ensure a single JSX expression; wrap with () so Babel parses it as an expression
    const trimmed = jsx.trim()
    const expr = trimmed.startsWith('<')
        ? `(${trimmed})`
        : `(<div>${trimmed}</div>)`

    // 3) Compile ONLY the expression; tell Babel to parse JSX + TypeScript
    const { code: compiledExpr } = Babel.transform(expr, {
        // transform JSX to JS
        presets: [['react', { runtime: 'classic' }]],
        // strip TS syntax when present
        plugins: [
            ['transform-typescript', { isTSX: true, allExtensions: true }],
        ],
        // 👇 this is the key: enable JSX + TSX in the parser
        parserOpts: { sourceType: 'script', plugins: ['jsx', 'typescript'] },
        filename: 'inline.tsx',
    })

    // 4) Put the `return` in the Function body (not in the code we give to Babel)
    const prelude = names.map((n) => `const ${n} = stubs["${n}"];`).join('\n')
    const factorySrc = `${prelude}\nreturn ${compiledExpr};`

    const factory = new Function('React', 'motion', 'stubs', factorySrc)
    return factory(React, motion, stubs) as React.ReactNode
}

type Payload = { jsx?: string }

function hash(s: string) {
    let h = 0
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
    return String(h >>> 0)
}

function App() {
    const [payload, setPayload] = useState<Payload>({})
    const [seq, setSeq] = useState(0) // <-- increments every preview

    useEffect(() => {
        const onMsg = (e: MessageEvent) => {
            if (e.data?.type === 'render') {
                setPayload(e.data.payload || {})
                setSeq((n) => n + 1) // <-- bump to force remount
            }
        }
        window.addEventListener('message', onMsg)
        return () => window.removeEventListener('message', onMsg)
    }, [])

    const jsx = payload.jsx ?? ''
    const element = useMemo(() => {
        if (!jsx) return null
        try {
            return renderFromJSX(jsx)
        } catch (err) {
            const msg = (err as Error)?.message ?? String(err)
            return (
                <div style={{ color: '#ff6b6b', whiteSpace: 'pre-wrap' }}>
                    Failed to render selection:{'\n'}
                    {msg}
                </div>
            )
        }
    }, [jsx])

    const remountKey = useMemo(() => `${hash(jsx)}-${seq}`, [jsx, seq]) // <-- unique per preview

    return (
        <div
            style={{
                padding: 16,
                fontFamily: 'system-ui, Segoe UI, Arial, sans-serif',
            }}
        >
            <h2 style={{ marginTop: 0 }}>Framer Motion Studio</h2>

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 16,
                }}
            >
                <div
                    style={{
                        minHeight: 240,
                        display: 'grid',
                        placeItems: 'center',
                        background: 'rgba(255,255,255,0.04)',
                        borderRadius: 10,
                    }}
                >
                    {/* 🔁 Force remount so initial→animate runs each time */}
                    <AnimatePresence mode="wait">
                        <div
                            key={remountKey}
                            style={{ display: 'grid', placeItems: 'center' }}
                        >
                            {element || (
                                <div style={{ opacity: 0.6 }}>
                                    Select JSX and run Preview
                                </div>
                            )}
                        </div>
                    </AnimatePresence>
                </div>

                <pre
                    style={{
                        margin: 0,
                        padding: 12,
                        borderRadius: 10,
                        background: 'rgba(0,0,0,0.25)',
                        whiteSpace: 'pre-wrap',
                    }}
                >
                    {jsx || '<no selection>'}
                </pre>
            </div>

            {/* (Optional) A Replay button to rerun the same selection */}
            <div style={{ marginTop: 10 }}>
                <button onClick={() => setSeq((n) => n + 1)}>
                    Replay animation
                </button>
            </div>
        </div>
    )
}

createRoot(document.getElementById('app')!).render(<App />)
