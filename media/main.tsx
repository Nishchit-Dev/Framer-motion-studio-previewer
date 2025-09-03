import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { motion, useAnimationControls } from 'framer-motion'

declare const acquireVsCodeApi: any
const vscode = acquireVsCodeApi()

function App() {
    const [data, setData] = useState<any>(null)
    const controls = useAnimationControls()
    const onScrub: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        const p = Number(e.currentTarget.value) // 0..1
        controls.set({
            x: p * 120, // move 0→120px
            opacity: 0.5 + 0.5 * p, // 0.5→1
            scale: 0.8 + 0.2 * p, // 0.8→1.0
        })
    }

    ;(window as any).onmessage = (e: MessageEvent) => {
        if (e.data?.type === 'render') setData(e.data.payload)
    }

    if (!data) return <div>Waiting for selection…</div>

    const props = data.nodes?.[0]?.props ?? {}
    return (
        <div className="studio">
            <div className="stage">
                <motion.div {...coerceProps(props)} animate={controls} />
            </div>
            <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                onChange={onScrub}
            />
        </div>
    )
}

function coerceProps(p: any) {
    // eval safe-ish JSON-like props where needed, or interpret known keys
    return {
        initial: safeEval(p.initial),
        animate: safeEval(p.animate),
        variants: safeEval(p.variants),
        transition: safeEval(p.transition),
    }
}
function safeEval(s?: string) {
    if (!s) return undefined
    try {
        return Function(`"use strict";return (${s})`)()
    } catch {
        return undefined
    }
}

createRoot(document.getElementById('app')!).render(<App />)
