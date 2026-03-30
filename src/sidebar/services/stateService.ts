import * as vscode from "vscode";

export class StateService {
	constructor(private ctx: vscode.ExtensionContext) {}

	get() {
		return this.ctx.workspaceState.get("odooDevKit.webviewState") || {};
	}

	async set(state: any) {
		await this.ctx.workspaceState.update("odooDevKit.webviewState", state);
	}
}
