import * as vscode from "vscode";
import { exec, execFile } from "child_process";
import * as path from "path";
import { getNonce } from "../utils/nonce";
import {
    getVersionFromBranch,
    checkoutBranch,
    remoteUpdate,
    createNewBranch,
    pushBranch,
    hasDiff
} from "../utils/git";

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
		const config = state.config || {};
		const paths = new Set<string>();

		// Prefer dedicated gitPaths from the Git Control page
		if (state.gitPaths && Array.isArray(state.gitPaths)) {
			for (const gp of state.gitPaths) {
				if (gp.path && gp.path.trim()) {
					paths.add(gp.path.trim());
				}
			}
		}

		// Fallback: use odooBinPath and addons if no gitPaths configured
		if (paths.size === 0) {
			if (config.odooBinPath) {
				const odooPath = path.dirname(config.odooBinPath);
				if (odooPath) { paths.add(odooPath); }
			}
			if (config.addons && Array.isArray(config.addons)) {
				for (const addon of config.addons) {
					if (addon.path && addon.path.trim()) {
						paths.add(addon.path.trim());
					}
				}
			}
		}
		return Array.from(paths);
	}

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
		webviewView.webview.postMessage({
			command: "serverStatus",
			running: this._serverRunning,
		});

		webviewView.webview.onDidReceiveMessage(async message => {
			switch (message.command) {
				case "showMessage":
					vscode.window.showInformationMessage(message.text);
					break;
				case "showWarning":
					vscode.window.showWarningMessage(message.text);
					break;
				case "showError":
					vscode.window.showErrorMessage(message.text);
					break;
				case "runShellCommand":
					if (!this._terminal) {
						this._terminal = vscode.window.createTerminal({
							name: "Odoo Dev Kit",
						});
					}
					this._terminal.sendText(`${message.text}\n`);
					break;
				case "runCommand":
					if (!this._terminal) {
						this._terminal = vscode.window.createTerminal({
							name: "Odoo Dev Kit",
						});
					}
					if (!this._hasShownTerminal) {
						this._terminal.show();
						this._hasShownTerminal = true;
					}
					if (this._terminal.shellIntegration) {
						this._lastExecution = this._terminal.shellIntegration.executeCommand(
							message.text,
						);
					} else {
						this._terminal.sendText(`${message.text}\n`);
					}
					this._serverRunning = true;
					webviewView.webview.postMessage({
						command: "serverStatus",
						running: true,
					});
					break;
				case "stopServer":
					if (this._terminal) {
						this._terminal.sendText("\u0003");
					}
					this._serverRunning = false;
					webviewView.webview.postMessage({
						command: "serverStatus",
						running: false,
					});
					break;
				case "runDropDb":
					exec(message.text, (error, stdout, stderr) => {
						const dbName = message.dbName || "database";
						if (error) {
							vscode.window.showErrorMessage(
								`Drop DB failed: ${stderr || error.message}`,
							);
							return;
						}
						if (stderr) {
							vscode.window.showWarningMessage(
								`Drop DB warning: ${stderr}`,
							);
						}
						vscode.window.showInformationMessage(
							`DB "${dbName}" dropped successfully.`,
						);
					});
					break;
				case "resolveDbNameFromAddon": {
					const addonPath = String(message.addonPath || "").trim();
					const requestId = message.requestId;
					if (!addonPath) {
						webviewView.webview.postMessage({
							command: "resolvedDbName",
							requestId,
							error: "Addon path is missing.",
						});
						break;
					}
					execFile(
						"git",
						["-C", addonPath, "rev-parse", "--abbrev-ref", "HEAD"],
						(error, stdout, stderr) => {
							if (error) {
								webviewView.webview.postMessage({
									command: "resolvedDbName",
									requestId,
									error: (stderr || error.message || "").trim(),
								});
								return;
							}
							const branch = String(stdout || "").trim();
							if (!branch) {
								webviewView.webview.postMessage({
									command: "resolvedDbName",
									requestId,
									error: "Could not detect branch name.",
								});
								return;
							}
							const version = getVersionFromBranch(branch);
							const dbName = `testdb-${version}`;
							webviewView.webview.postMessage({
								command: "resolvedDbName",
								requestId,
								branch,
								version,
								dbName,
							});
						},
					);
					break;
				}
				case "persistState":
					await this._context.workspaceState.update(
						"odooDevKit.webviewState",
						message.state || null,
					);
					break;
				case "requestState":
					webviewView.webview.postMessage({
						command: "restoreState",
						state: this._context.workspaceState.get("odooDevKit.webviewState") || null,
					});
					break;
				case "gitCommand": {
					if (message.action === "removeHistory") {
						const state = this._context.workspaceState.get<any>("odooDevKit.webviewState") || {};
						if (state.gitHistory && state.gitHistory[message.version]) {
							state.gitHistory[message.version] = state.gitHistory[message.version].filter((b: string) => b !== message.branch);
							if (state.gitHistory[message.version].length === 0) {
								delete state.gitHistory[message.version];
							}
							await this._context.workspaceState.update("odooDevKit.webviewState", state);
							webviewView.webview.postMessage({
								command: "restoreState",
								state: state
							});
						}
						break;
					}

					const repoPaths = await this.getRepoPaths();
					if (repoPaths.length === 0) {
						vscode.window.showWarningMessage("No repositories configured. Please configure Odoo bin path or addons paths.");
						break;
					}

					try {
						webviewView.webview.postMessage({ command: "gitOperationStart" });
						vscode.window.showInformationMessage(`Starting Git ${message.action}...`);
						
						const actions = repoPaths.map(async repoPath => {
							switch (message.action) {
								case "checkout":
									return checkoutBranch(repoPath, message.branch);
								case "remoteUpdate":
									return remoteUpdate(repoPath);
								case "newBranch": {
								const newBranchName = (message.branch || "").trim();
								if (!newBranchName) {
									return;
								}
								vscode.window.showInformationMessage(`Creating branch "${newBranchName}" in ${repoPath}`);
								return createNewBranch(repoPath, "", newBranchName);
							}	
								case "push":
									return pushBranch(repoPath, false);
								case "forcePush":
									return pushBranch(repoPath, true);
							}
						});
						await Promise.all(actions);

						vscode.window.showInformationMessage(`Git ${message.action} completed successfully.`);

						if (message.action === "checkout") {
							const state = this._context.workspaceState.get<any>("odooDevKit.webviewState") || {};
							if (!state.gitHistory) { state.gitHistory = {}; }
							
							const version = getVersionFromBranch(message.branch);
							if (!state.gitHistory[version]) {
								state.gitHistory[version] = [];
							}
							if (!state.gitHistory[version].includes(message.branch)) {
								state.gitHistory[version].push(message.branch);
							}
							
							await this._context.workspaceState.update("odooDevKit.webviewState", state);
							// Push updated state AND signal to clear the input now that checkout is done
							webviewView.webview.postMessage({
								command: "restoreState",
								state: state,
								clearBranchInput: true,
							});
						}
					} catch (error: any) {
						console.log("Error [gitCommand]", message.action, error);
						vscode.window.showErrorMessage(error.message || 'Git operation failed');
					} finally {
						webviewView.webview.postMessage({ command: "gitOperationEnd" });
					}
					break;
				}
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
