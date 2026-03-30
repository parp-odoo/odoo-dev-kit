import * as vscode from "vscode";

import { TerminalService, StateService } from "./services";
import {
	UIHandler,
	TerminalHandler,
	GitHandler,
	DbHandler,
	StateHandler,
	createMessageRouter,
} from "./handlers";
import { getWebviewHtml } from "./webview/html";

export class SidebarViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = "odoo-dev-kit-sidebar";
	private _view?: vscode.WebviewView;
	private _terminal?: vscode.Terminal;
	private _serverRunning = false;
	private _disposables: vscode.Disposable[] = [];
	private _hasShownTerminal = false;
	private _lastExecution?: vscode.TerminalShellExecution;

	constructor(
		private readonly _context: vscode.ExtensionContext,
		private readonly _extensionUri: vscode.Uri,
	) {
		this._disposables.push(
			vscode.window.onDidCloseTerminal(terminal => {
				if (this._terminal && terminal === this._terminal) {
					this._serverRunning = false;
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
					this._serverRunning = false;
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

	private async getRepoPaths(): Promise<string[]> {
		const state = this._context.workspaceState.get<any>("odooDevKit.webviewState") || {};
		if (!state.gitPaths || !Array.isArray(state.gitPaths)) {
			return [];
		}

		const gitPaths = [...state.gitPaths];
		return gitPaths
			.filter((gp: any) => gp.path && gp.path.trim())
			.map((gp: any) => gp.path.trim());
	}

	public resolveWebviewView(webviewView: vscode.WebviewView) {
		this._view = webviewView;

		webviewView.webview.options = { enableScripts: true };
		webviewView.webview.html = getWebviewHtml(webviewView.webview, this._extensionUri);

		const terminalService = new TerminalService();
		const stateService = new StateService(this._context);

		const handlers = {
			uiHandler: new UIHandler(),
			terminalHandler: new TerminalHandler(terminalService, webviewView.webview),
			gitHandler: new GitHandler(this._context, webviewView.webview),
			dbHandler: new DbHandler(webviewView.webview),
			stateHandler: new StateHandler(stateService, webviewView.webview),
		};

		const router = createMessageRouter(handlers);

		webviewView.webview.onDidReceiveMessage(router);
	}
}
