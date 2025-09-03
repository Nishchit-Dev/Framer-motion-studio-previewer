import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { motion, AnimatePresence } from 'framer-motion'
import * as Babel from '@babel/standalone'
import { codeToHtml } from 'shiki'
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
                        border: '2px dashed #818cf8',
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
    const [codeSectiom, setCodeSection] = useState('')

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
            codeToHtml(jsx, {
                lang: 'tsx',
                theme: 'min-dark',
            }).then((highlightedCode) => {
                setCodeSection(highlightedCode)
            })
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
                    display: 'flex',
                    width: 'full',
                    flex: 1,
                    flexDirection: 'column',
                    // gridTemplateColumns: '1fr 1fr',
                    gap: 16,
                }}
            >
                <div
                    style={{
                        minHeight: 240,
                        display: 'flex',
                        justifyContent: 'center',
                        placeItems: 'center',
                        background: 'rgba(0, 0, 0, 0.04)',
                        borderRadius: 10,
                    }}
                >
                    <div
                        style={{
                            position: 'absolute',
                            top: 16,
                            right: 16,
                            zIndex: 1,
                        }}
                    >
                        <div
                            onClick={() => setSeq((n) => n + 1)}
                            style={{
                                cursor: 'pointer',
                                background: 'rgba(255,255,255,0.15)',
                                borderRadius: '50%',
                                padding: 4,
                                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                            title="Replay animation"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="lucide lucide-rotate-ccw-icon lucide-rotate-ccw"
                            >
                                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                <path d="M3 3v5h5" />
                            </svg>
                        </div>
                    </div>
                    {/* 🔁 Force remount so initial→animate runs each time */}
                    <AnimatePresence mode="wait">
                        <div
                            key={remountKey}
                            style={{ display: '', placeItems: 'center' }}
                        >
                            {element || (
                                <div style={{ opacity: 0.6 }}>
                                    Select JSX and run Preview
                                </div>
                            )}
                        </div>
                    </AnimatePresence>
                </div>

                {/* <pre
                    style={{
                        margin: 0,
                        padding: 12,
                        borderRadius: 10,
                        background: 'rgba(0,0,0,0.25)',
                        whiteSpace: 'pre-wrap',
                    }}
                >
                    <code>
                        {jsx
                            ? `\`\`\`tsx
        ${jsx}
        \`\`\``
                            : '<no selection>'}
                    </code>
                </pre> */}
                <div
                    style={{
                        margin: 0,
                        padding: 12,
                        borderRadius: 10,
                        background: 'rgba(0,0,0,0.25)',
                        // whiteSpace: 'pre-wrap',
                    }}
                    dangerouslySetInnerHTML={{ __html: codeSectiom }}
                />
            </div>

            {/* (Optional) A Replay button to rerun the same selection */}
        </div>
    )
}

createRoot(document.getElementById('app')!).render(<App />)
