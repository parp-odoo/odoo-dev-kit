import * as vscode from "vscode";

import { registerServices } from "./services";
import { getWebviewHtml } from "./webview/html";
import { getHandlers, initServices } from "./services/serviceRegistry";
type MessagePayload = { command?: string; text?: string; state?: unknown;[key: string]: unknown };

export class SidebarViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = "odoo-dev-kit-sidebar";
	private _view?: vscode.WebviewView;
	private _terminal?: vscode.Terminal;
	private _disposables: vscode.Disposable[] = [];
	private _lastExecution?: vscode.TerminalShellExecution;

	constructor(
		private readonly _context: vscode.ExtensionContext,
		private readonly _extensionUri: vscode.Uri,
	) {
		this._disposables.push(
			vscode.window.onDidCloseTerminal(terminal => {
				if (this._terminal && terminal === this._terminal) {
					this._terminal = undefined;
					this._lastExecution = undefined;
					this._view?.webview.postMessage({
						command: "serverStatus",
						running: false,
					});
				}
			}),
		);
		this._disposables.push(
			vscode.window.onDidEndTerminalShellExecution(event => {
				if (
					this._terminal &&
					event.terminal === this._terminal &&
					this._lastExecution &&
					event.execution === this._lastExecution
				) {
					this._view?.webview.postMessage({
						command: "serverStatus",
						running: false,
					});
					this._lastExecution = undefined;
				}
			}),
		);
	}

	public dispose() {
		this._disposables.forEach(disposable => disposable.dispose());
		this._disposables = [];
		this._terminal?.dispose();
		this._terminal = undefined;
		this._lastExecution = undefined;
	}

	public resolveWebviewView(webviewView: vscode.WebviewView) {
		this._view = webviewView;

		webviewView.webview.options = { enableScripts: true };
		webviewView.webview.html = getWebviewHtml(webviewView.webview, this._extensionUri);

		registerServices();
		initServices(this._context, webviewView.webview);
		const handlers = getHandlers() as Record<string, (message: MessagePayload) => Promise<unknown> | unknown>;

		webviewView.webview.onDidReceiveMessage(
			async function handle(message: MessagePayload) {
				const command = message.command || "";
				await handlers[command]?.(message);
			}
		);
	}
}
