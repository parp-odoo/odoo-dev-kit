import * as vscode from "vscode";
import {
	getVersionFromBranch,
	checkoutBranch,
	remoteUpdate,
	createNewBranch,
	pushBranch,
	hasDiff,
} from "../../utils/git";

export class GitHandler {
	constructor(
		private ctx: vscode.ExtensionContext,
		private webview: any,
	) {}

	private async getRepoPaths(): Promise<string[]> {
		const state = this.ctx.workspaceState.get<any>("odooDevKit.webviewState") || {};
		if (!state.gitPaths || !Array.isArray(state.gitPaths)) {
			return [];
		}

		const gitPaths = [...state.gitPaths];
		return gitPaths
			.filter((gp: any) => gp.path && gp.path.trim())
			.map((gp: any) => gp.path.trim());
	}

	async handle(message: any) {
		// move your FULL gitCommand case here
		// (no logic change, just relocation)

		if (message.action === "removeHistory") {
			const state = this.ctx.workspaceState.get<any>("odooDevKit.webviewState") || {};
			if (state.gitHistory && state.gitHistory[message.version]) {
				state.gitHistory[message.version] = state.gitHistory[message.version].filter(
					(b: string) => b !== message.branch,
				);
				if (state.gitHistory[message.version].length === 0) {
					delete state.gitHistory[message.version];
				}
				await this.ctx.workspaceState.update("odooDevKit.webviewState", state);
				this.webview.postMessage({
					command: "restoreState",
					state: state,
				});
			}
			return;
		}

		const repoPaths = await this.getRepoPaths();
		if (repoPaths.length === 0) {
			vscode.window.showWarningMessage(
				"No repositories configured. Please configure Odoo bin path or addons paths.",
			);
			return;
		}

		try {
			this.webview.postMessage({ command: "gitOperationStart" });
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
						vscode.window.showInformationMessage(
							`Creating branch "${newBranchName}" in ${repoPath}`,
						);
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
				const state = this.ctx.workspaceState.get<any>("odooDevKit.webviewState") || {};
				if (!state.gitHistory) {
					state.gitHistory = {};
				}

				const version = getVersionFromBranch(message.branch);
				if (!state.gitHistory[version]) {
					state.gitHistory[version] = [];
				}
				if (!state.gitHistory[version].includes(message.branch)) {
					state.gitHistory[version].push(message.branch);
				}

				await this.ctx.workspaceState.update("odooDevKit.webviewState", state);
				// Push updated state AND signal to clear the input now that checkout is done
				this.webview.postMessage({
					command: "restoreState",
					state: state,
					clearBranchInput: true,
				});
			}
		} catch (error: any) {
			console.log("Error [gitCommand]", message.action, error);
			vscode.window.showErrorMessage(error.message || "Git operation failed");
		} finally {
			this.webview.postMessage({ command: "gitOperationEnd" });
		}
		return;
	}
}
