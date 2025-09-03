import * as vscode from 'vscode'
import { parseSelection } from './parse' // you write this using Babel or TS

export function activate(ctx: vscode.ExtensionContext) {
    ctx.subscriptions.push(
        vscode.commands.registerCommand('framerMotion.openStudio', () =>
            openStudio(ctx)
        ),
        vscode.commands.registerCommand('framerMotion.previewHere', () =>
            previewHere(ctx)
        )
    )
}

async function previewHere(ctx: vscode.ExtensionContext) {
    const ed = vscode.window.activeTextEditor
    if (!ed) return
    const sel = ed.selection.isEmpty
        ? ed.document.lineAt(ed.selection.active.line).range
        : ed.selection
    const code = ed.document.getText(sel)
    const payload = parseSelection(code) // { jsx, variants, transition, errors }

    const panel = getPanel(ctx, 'Framer Motion Preview')
    panel.webview.html = getHtml(ctx, panel.webview)
    panel.webview.postMessage({ type: 'render', payload })

    panel.webview.onDidReceiveMessage(async (msg) => {
        if (msg.type === 'applyFix') {
            const edit = new vscode.WorkspaceEdit()
            edit.replace(ed.document.uri, sel, msg.fixedCode)
            await vscode.workspace.applyEdit(edit)
        }
    })
}

let studioPanel: vscode.WebviewPanel | undefined
function openStudio(ctx: vscode.ExtensionContext) {
    studioPanel = getPanel(ctx, 'Framer Motion Studio', studioPanel)
    studioPanel.webview.html = getHtml(ctx, studioPanel.webview)
}

function getPanel(
    ctx: vscode.ExtensionContext,
    title: string,
    existing?: vscode.WebviewPanel
) {
    const panel =
        existing ??
        vscode.window.createWebviewPanel(
            'framerMotionStudio',
            title,
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(ctx.extensionUri, 'media'),
                ],
            }
        )
    return panel
}

function getHtml(ctx: vscode.ExtensionContext, webview: vscode.Webview) {
    const scriptUri = webview.asWebviewUri(
        vscode.Uri.joinPath(ctx.extensionUri, 'media', 'main.js')
    )
    const styleUri = webview.asWebviewUri(
        vscode.Uri.joinPath(ctx.extensionUri, 'media', 'main.css')
    )
    const csp = `default-src 'none'; img-src data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource};`
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta http-equiv="Content-Security-Policy" content="${csp}">
<link rel="stylesheet" href="${styleUri}">
<title>Framer Motion Studio</title>
</head>
<body>
  <div id="app"></div>
  <script src="${scriptUri}"></script>
</body>
</html>`
}

export function deactivate() {}
