import * as vscode from "vscode";

const WORKSPACE_STATE_KEY = "odooDevKit.webviewState";

export class StateService {
	workspaceState: vscode.Memento;
	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly webview: vscode.Webview,
	) {
		this.workspaceState = this.context.workspaceState;
	}

	get handlers() {
		return {
			persistState: this.persist.bind(this),
			requestState: this.restore.bind(this),
		};
	}

	get() {
		return this.workspaceState.get(WORKSPACE_STATE_KEY) || {};
	}

	async set({ state }: { state: any }) {
		await this.workspaceState.update(WORKSPACE_STATE_KEY, state);
	}

	async persist(data: any) {
		await this.set(data || null);
	}

	restore() {
		this.webview.postMessage({
			command: "restoreState",
			state: this.get(),
		});
	}
}
