import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { motion, useAnimationControls } from 'framer-motion';
const vscode = acquireVsCodeApi();
function App() {
    const [data, setData] = useState(null);
    const controls = useAnimationControls();
    const onScrub = (e) => {
        const p = Number(e.currentTarget.value); // 0..1
        controls.set({
            x: p * 120, // move 0→120px
            opacity: 0.5 + 0.5 * p, // 0.5→1
            scale: 0.8 + 0.2 * p, // 0.8→1.0
        });
    };
    window.onmessage = (e) => {
        if (e.data?.type === 'render')
            setData(e.data.payload);
    };
    if (!data)
        return _jsx("div", { children: "Waiting for selection\u2026" });
    const props = data.nodes?.[0]?.props ?? {};
    return (_jsxs("div", { className: "studio", children: [_jsx("div", { className: "stage", children: _jsx(motion.div, { ...coerceProps(props), animate: controls }) }), _jsx("input", { type: "range", min: 0, max: 1, step: 0.01, onChange: onScrub })] }));
}
function coerceProps(p) {
    // eval safe-ish JSON-like props where needed, or interpret known keys
    return {
        initial: safeEval(p.initial),
        animate: safeEval(p.animate),
        variants: safeEval(p.variants),
        transition: safeEval(p.transition),
    };
}
function safeEval(s) {
    if (!s)
        return undefined;
    try {
        return Function(`"use strict";return (${s})`)();
    }
    catch {
        return undefined;
    }
}
createRoot(document.getElementById('app')).render(_jsx(App, {}));
