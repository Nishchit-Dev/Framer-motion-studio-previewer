import * as vscode from 'vscode'

let panel: vscode.WebviewPanel | undefined
const VIEW_TYPE = 'framerMotionStudio'

export function activate(ctx: vscode.ExtensionContext) {
    ctx.subscriptions.push(
        vscode.commands.registerCommand('framerMotion.openStudio', () => {
            const p = ensurePanel(ctx)
            void p.webview.postMessage({ type: 'hello' })
        }),
        vscode.commands.registerCommand('framerMotion.previewHere', () =>
            previewHere(ctx)
        )
    )
}

function ensurePanel(ctx: vscode.ExtensionContext): vscode.WebviewPanel {
    if (!panel) {
        panel = vscode.window.createWebviewPanel(
            VIEW_TYPE,
            'Framer Motion Studio',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(ctx.extensionUri, 'media'),
                ],
            }
        )
        panel.onDidDispose(() => {
            panel = undefined
        })
        panel.webview.html = getHtml(ctx, panel.webview)
    } else {
        try {
            panel.reveal(vscode.ViewColumn.Beside)
        } catch {
            panel = undefined
            return ensurePanel(ctx)
        }
    }
    return panel
}

async function previewHere(ctx: vscode.ExtensionContext) {
    const ed = vscode.window.activeTextEditor
    if (!ed) return

    const sel = ed.selection.isEmpty
        ? ed.document.lineAt(ed.selection.active.line).range
        : ed.selection

    const jsx = ed.document.getText(sel)

    const p = ensurePanel(ctx)
    await p.webview.postMessage({ type: 'render', payload: { jsx } })
}

function getHtml(ctx: vscode.ExtensionContext, webview: vscode.Webview) {
    const scriptUri = webview.asWebviewUri(
        vscode.Uri.joinPath(ctx.extensionUri, 'media', 'main.js')
    )

    // ✅ Allow 'unsafe-eval' so @babel/standalone and new Function() can run
    const csp = [
        "default-src 'none';",
        `img-src ${webview.cspSource} data:;`,
        `style-src ${webview.cspSource} 'unsafe-inline';`,
        `font-src ${webview.cspSource};`,
        `script-src ${webview.cspSource} 'unsafe-eval';`,
    ].join(' ')

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Framer Motion Studio</title>
  <style>html,body{padding:0;margin:0}</style>
</head>
<body>
  <div id="app"></div>
  <script src="${scriptUri}"></script>
</body>
</html>`
}

export function deactivate() {}
