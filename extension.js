const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

function activate(context) {
  const disposable = vscode.commands.registerCommand('nginx-viewer.open', (uri) => {
    let fileUri = uri;
    if (!fileUri && vscode.window.activeTextEditor) {
      fileUri = vscode.window.activeTextEditor.document.uri;
    }

    if (!fileUri) {
      vscode.window.showErrorMessage('No nginx config file selected.');
      return;
    }

    const filePath = fileUri.fsPath;
    const fileName = path.basename(filePath);

    const panel = vscode.window.createWebviewPanel(
      'nginxViewer',
      `Nginx Viewer: ${fileName}`,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, 'webview')
        ]
      }
    );

    const webviewUri = panel.webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, 'webview')
    ).toString();

    let html = fs.readFileSync(
      path.join(context.extensionPath, 'webview', 'index.html'),
      'utf8'
    );

    // Replace relative asset paths: ./assets/... (Vite build with base: './')
    html = html.replace(/(src|href)="\.\/assets\//g, `$1="${webviewUri}/assets/`);
    // Fallback: /nginx/assets/... (older build)
    html = html.replace(/\/nginx\/assets\//g, `${webviewUri}/assets/`);

    // Add Content-Security-Policy
    const csp = [
      `default-src 'none'`,
      `script-src 'unsafe-inline' ${panel.webview.cspSource}`,
      `style-src 'unsafe-inline' ${panel.webview.cspSource}`,
      `img-src ${panel.webview.cspSource} data:`,
      `font-src ${panel.webview.cspSource}`
    ].join('; ');
    html = html.replace(
      '<meta charset="UTF-8" />',
      `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${csp}">`
    );

    // Inject VS Code flag, locale, and file content before </head>
    const locale = vscode.env.language;
    const fileContent = fs.readFileSync(filePath, 'utf8').replace(/`/g, '\\`');
    html = html.replace(
      '</head>',
      `<script>window.__vscode_webview__ = true; window.__vscode_locale__ = '${locale}'; window.__nginx_initial_content__ = \`${fileContent}\`</script>\n  </head>`
    );

    panel.webview.html = html;

    // 사이드바 숨기고 에디터 최대화
    vscode.commands.executeCommand('workbench.action.maximizeEditorHideSidebar');
  });

  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = { activate, deactivate };
