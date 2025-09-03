# Framer Motion Studio

Preview, inspect, and refactor **Framer Motion** animations right inside VS Code.  
Live webview preview, state/variant toggles, timeline scrubbing, hover docs for easings, and handy refactors.

<p align="center">
  <img src="images/screenshot.png" alt="Framer Motion Studio preview" width="800" />
</p>

## ✨ Features

-   **Live Preview (Webview):** Render selected `motion.*` components from JSX/TSX.
-   **State/Variant Inspector:** Toggle `initial`, `animate`, `hover`, `tap` and named `variants`.
-   **Timeline Scrubber:** Scrub progress to see transitions, delay, `staggerChildren`, etc.
-   **Easing Visualizer:** Hover shows cubic-bezier curve + values (planned).
-   **Code Actions (Planned):**
    -   Extract inline `animate` → named `variants`
    -   Add `AnimatePresence` wrapper for conditionals
    -   Transition templates for `spring` / `tween` / `keyframes`
-   **Diagnostics (Planned):** Invalid props, conflicting options, missing `layoutId` pairs.

> Works alongside the official **Framer** tooling; this extension focuses on authoring _inside_ the editor.

---

## 🚀 Quick Start

1. Install **Framer Motion Studio** from the Marketplace (or use “Install from VSIX…”).
2. Open a React file (JSX/TSX) containing `motion.div`, `motion.span`, etc.
3. Run **Framer Motion: Preview Selection** on a component or selection.
4. Or open the full panel via **Framer Motion: Open Studio**.

### Commands

| Command ID                 | Title                            | Description                                |
| -------------------------- | -------------------------------- | ------------------------------------------ |
| `framerMotion.previewHere` | Framer Motion: Preview Selection | Preview the current selection/component    |
| `framerMotion.openStudio`  | Framer Motion: Open Studio       | Open the studio panel with preview & tools |

### Default Keybinding

-   **Preview Selection:** `Ctrl+Alt+M` (Windows/Linux) / `Cmd+Alt+M` (macOS)

> Change via Keyboard Shortcuts if it conflicts with other extensions.

---

## 🛠️ Requirements (dev/building from source)

This extension uses a small React app inside a webview.

**Runtime deps (packaged in the extension):**

-   `framer-motion`
-   (Your webview bundle) `media/main.js`

**Dev deps (for bundling webview):**

-   `react@18`, `react-dom@18`
-   `esbuild` (or your preferred bundler)

**Recommended scripts (`package.json`):**

```json
{
    "scripts": {
        "compile": "tsc -p ./",
        "bundle:webview": "esbuild media/main.tsx --bundle --minify --target=es2020 --format=iife --outfile=media/main.js",
        "watch:webview": "esbuild media/main.tsx --bundle --watch --target=es2020 --format=iife --outfile=media/main.js",
        "vscode:prepublish": "npm run compile && npm run bundle:webview"
    }
}
```
