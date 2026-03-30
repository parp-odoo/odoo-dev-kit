import * as vscode from "vscode";
import { getNonce } from "../../utils/nonce";

export function getWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri) {
	const nonce = getNonce();

	const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "app.js"));
	const owlUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "lib", "owl.js"));

	const styleVSCodeUri = webview.asWebviewUri(
		vscode.Uri.joinPath(extensionUri, "media", "vscode.css"),
	);
	const codiconsUri = webview.asWebviewUri(
		vscode.Uri.joinPath(
			extensionUri,
			"node_modules",
			"@vscode/codicons",
			"dist",
			"codicon.css",
		),
	);

	return `<!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta
                http-equiv="Content-Security-Policy"
                content="
                    default-src 'none';
                    img-src ${webview.cspSource} https:;
                    style-src ${webview.cspSource} 'unsafe-inline';
                    script-src ${webview.cspSource} 'nonce-${nonce}' 'unsafe-eval';
                    font-src ${webview.cspSource};
                "
            />
            <meta name="viewport" content="width=device-width, initial-scale=1.0">

            <link href="${codiconsUri}" rel="stylesheet">
            <link href="${styleVSCodeUri}" rel="stylesheet">

            <title>Odoo Dev Kit</title>
        </head>
        <body>
            <script nonce="${nonce}" src="${owlUri}"></script>
            <script nonce="${nonce}" type="module" src="${scriptUri}"></script>
        </body>
        </html>
    `;
}
