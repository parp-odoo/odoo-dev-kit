import * as vscode from "vscode";
import {
	getVersionFromBranch,
	checkoutBranch,
	remoteUpdate,
	createNewBranch,
	pushBranch,
	commitChanges,
	amendCommit,
} from "../../utils/git";
import { Repo } from "../../types";

export class GitHandler {
	constructor(
		private ctx: vscode.ExtensionContext,
		private webview: any,
	) {}

	private async addBranchToHistory(branch: string, clearBranchInput = false) {
		const state = this.ctx.workspaceState.get<any>("odooDevKit.webviewState") || {};
		if (!state.gitHistory) {
			state.gitHistory = {};
		}

		const version = getVersionFromBranch(branch);
		if (!state.gitHistory[version]) {
			state.gitHistory[version] = [];
		}
		if (!state.gitHistory[version].includes(branch)) {
			state.gitHistory[version].push(branch);
		}

		await this.ctx.workspaceState.update("odooDevKit.webviewState", state);
		this.webview.postMessage({
			command: "restoreState",
			state,
			clearBranchInput,
		});
	}

	private async getRepos(): Promise<Repo[]> {
		const state = this.ctx.workspaceState.get<any>("odooDevKit.webviewState") || {};
		if (!state.gitPaths || !Array.isArray(state.gitPaths)) {
			return [];
		}

		const gitPaths = [...state.gitPaths];
		return gitPaths
			.filter((gp: any) => gp.path && gp.path.trim());
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

		const repos = await this.getRepos();
		if (repos.length === 0) {
			vscode.window.showWarningMessage(
				"No repositories configured. Please configure Odoo bin path or addons paths.",
			);
			return;
		}

		if (message.action === "commit") {
			const commitMessage = (message.commitMessage || "").trim();
			if (!commitMessage) {
				vscode.window.showWarningMessage("Commit message is required.");
				return;
			}
		}

		try {
			this.webview.postMessage({ command: "gitOperationStart" });
			vscode.window.showInformationMessage(`Starting Git ${message.action}...`);

			const commitMessage = (message.commitMessage || "").trim();
			const actions = repos.map(async repo => {
				switch (message.action) {
					case "checkout":
						return checkoutBranch(repo, message.branch);
					case "remoteUpdate":
						return remoteUpdate(repo);
					case "newBranch": {
						const newBranchName = (message.branch || "").trim();
						if (!newBranchName) {
							return false;
						}
						vscode.window.showInformationMessage(
							`Creating branch "${newBranchName}" in ${repo.path}`,
						);
						return createNewBranch(repo, "", newBranchName);
					}
					case "push":
						return pushBranch(repo, false);
					case "forcePush":
						return pushBranch(repo, true);
					case "commit":
						return commitChanges(repo, commitMessage);
					case "commitAmend":
						return amendCommit(repo, commitMessage);
				}
			});
			const actionResults = await Promise.all(actions);

			if (message.action === "commit" || message.action === "commitAmend") {
				const hasCommitted = actionResults.some(result => result === true);
				if (!hasCommitted) {
					const actionName = message.action === "commit" ? "commit" : "amend";
					vscode.window.showWarningMessage(
						`No changes detected in configured repositories. Nothing to ${actionName}.`,
					);
					return;
				}
			}

			if (message.action === "newBranch") {
				const hasCreated = actionResults.some(result => result === true);
				if (!hasCreated) {
					vscode.window.showWarningMessage(
						"No branch was created because no repository has changes to commit.",
					);
					return;
				}
			}

			vscode.window.showInformationMessage(`Git ${message.action} completed successfully.`);

			if (message.action === "checkout") {
				await this.addBranchToHistory(message.branch, true);
			}

			if (message.action === "newBranch") {
				await this.addBranchToHistory(message.branch, false);
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
