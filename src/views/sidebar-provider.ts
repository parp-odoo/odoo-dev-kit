import * as vscode from "vscode";
import { getNonce } from "../utils/nonce";

export class SidebarViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = "odoo-dev-kit-sidebar";
	private _view?: vscode.WebviewView;

	constructor(private readonly _extensionUri: vscode.Uri) {}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [
				this._extensionUri,
				vscode.Uri.joinPath(this._extensionUri, "media"),
			],
		};
		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		webviewView.webview.onDidReceiveMessage(async message => {
			switch (message.command) {
				case "showMessage":
					vscode.window.showInformationMessage(message.text);
					break;
				case "runShellCommand":
					const terminal = vscode.window.createTerminal({
						name: "Command Runner Terminal",
					});
					terminal.show();
					terminal.sendText(`${message.text}\n`);
					break;
			}
		});
	}

    private _getHtmlForWebview(webview: vscode.Webview) {
        const nonce = getNonce();

		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'app.js'));
		const owlUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'lib', 'owl.js'));

		const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
		const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'node_modules', '@vscode/codicons', 'dist', 'codicon.css'));


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
        </html>`;
    }
}
