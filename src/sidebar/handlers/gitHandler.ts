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


const ACTION_WARNINGS: Record<string, string> = {
	"newBranch": "No repositories had changes to create a new branch",
	"commit": "No changes detected in configured repositories. Nothing to commit.",
	"commitAmend": "No changes detected in configured repositories. Nothing to amend.",
};

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
		const action = message.action;
		const commitMessage = (message.commitMessage || "").trim();
		const branchName = (message.branch || "").trim();

		if (action === "removeHistory") {
			return await this.removeHistoryState(message.version, message.branch);
		}

		const repos = await this.getRepos();
		if (repos.length === 0) {
			return vscode.window.showWarningMessage(
				"No repositories configured. Please configure Odoo bin path or addons paths.",
			);
		}

		const isCommitActions = ["commit", "commitAmend"].includes(action);
		if (isCommitActions && !commitMessage) {
			return vscode.window.showWarningMessage("Commit message is required.");
		}

		const isBranchActions = ["checkout", "newBranch"].includes(action);
		if (isBranchActions && !branchName) {
			return vscode.window.showWarningMessage("Branch name is required.");
		}

		try {
			this.webview.postMessage({ command: "gitOperationStart" });
			vscode.window.showInformationMessage(`Starting Git ${action}...`);

			const actions = repos.map(async repo => {
				switch (action) {
					case "checkout":
						return checkoutBranch(repo, message.branch);
					case "remoteUpdate":
						return remoteUpdate(repo);
					case "newBranch": {
						const isCreated = await createNewBranch(repo, "", branchName);
						if (isCreated) {
							vscode.window.showInformationMessage(
								`Branch "${branchName}" created in ${repo.path}!`,
							);
						}
						return isCreated;
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

			if (ACTION_WARNINGS[action] && actionResults.every(result => result === false)) {
				return vscode.window.showWarningMessage(ACTION_WARNINGS[action] || "Action failed.");
			}

			if (isBranchActions) {
				await this.addBranchToHistory(message.branch, false);
			}

			vscode.window.showInformationMessage(`Git ${action} completed successfully.`);
		} catch (error: any) {
			console.log("Error [gitCommand]", action, error);
			vscode.window.showErrorMessage(error.message || "Git operation failed");
		} finally {
			this.webview.postMessage({ command: "gitOperationEnd" });
		}
		return;
	}

	async removeHistoryState(version: string, branch: string) {
		const state = this.ctx.workspaceState.get<any>("odooDevKit.webviewState") || {};
		if (!state?.gitHistory[version]) {
			return;
		}
		state.gitHistory[version] = state.gitHistory[version].filter(
			(b: string) => b !== branch,
		);
		if (state.gitHistory[version].length === 0) {
			delete state.gitHistory[version];
		}
		await this.ctx.workspaceState.update("odooDevKit.webviewState", state);
		this.webview.postMessage({
			command: "restoreState",
			state: state,
		});
	}

}
