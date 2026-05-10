import * as vscode from "vscode";

import {
	amendCommit,
	checkoutBranch,
	commitChanges,
	createNewBranch,
	getCurrentBranchName,
	getVersionFromBranch,
	pushBranch,
	remoteUpdate,
} from "../../utils/git";
import { Repo } from "../../types";

const ACTION_WARNINGS: Record<string, string> = {
	newBranch: "No repositories had changes to create a new branch",
	commit: "No changes detected in configured repositories. Nothing to commit.",
	commitAmend: "No changes detected in configured repositories. Nothing to amend.",
};

type GitMessage = {
	action?: string;
	branch?: string;
	commitMessage?: string;
	version?: string;
};

const WORKSPACE_STATE_KEY = "odooDevKit.webviewState";

export class GitService {
	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly webview: vscode.Webview,
	) {}

	public readonly handlers = {
		resolveCurrentBranch: this.resolveCurrentBranch.bind(this),
		gitCommand: this.gitCommand.bind(this),
	};

	private getState() {
		return this.context.workspaceState.get<any>(WORKSPACE_STATE_KEY) || {};
	}

	private async setState(state: any) {
		await this.context.workspaceState.update(WORKSPACE_STATE_KEY, state);
	}

	private async addBranchToHistory(branch: string, clearBranchInput = false) {
		const state = this.getState();
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

		await this.setState(state);
		this.webview.postMessage({
			command: "restoreState",
			state,
			clearBranchInput,
		});
	}

	private async getRepos(): Promise<Repo[]> {
		const state = this.getState();
		if (!state.gitPaths || !Array.isArray(state.gitPaths)) {
			return [];
		}

		const gitPaths = [...state.gitPaths];
		return gitPaths.filter((repo: any) => repo.path && repo.path.trim());
	}

	async resolveCurrentBranch() {
		const repos = await this.getRepos();
		if (!repos.length) {
			this.webview.postMessage({
				command: "resolvedCurrentBranch",
				branch: "",
			});
			return;
		}

		try {
			const branch = await getCurrentBranchName(repos[0].path);
			this.webview.postMessage({
				command: "resolvedCurrentBranch",
				branch,
			});
		} catch {
			this.webview.postMessage({
				command: "resolvedCurrentBranch",
				branch: "",
			});
		}
	}

	async gitCommand(message: GitMessage) {
		const action = message.action;
		const commitMessage = (message.commitMessage || "").trim();
		const branchName = (message.branch || "").trim();

		if (action === "removeHistory") {
			return this.removeHistoryState(message.version || "", branchName);
		}

		const repos = await this.getRepos();
		if (repos.length === 0) {
			return vscode.window.showWarningMessage(
				"No repositories configured. Please configure Odoo bin path or addons paths.",
			);
		}

		const isCommitAction = action === "commit";
		if (isCommitAction && !commitMessage) {
			return vscode.window.showWarningMessage("Commit message is required.");
		}

		const isBranchAction = action === "checkout" || action === "newBranch";
		if (isBranchAction && !branchName) {
			return vscode.window.showWarningMessage("Branch name is required.");
		}

		try {
			this.webview.postMessage({ command: "gitOperationStart" });
			vscode.window.showInformationMessage(`Starting Git ${action}...`);

			const actions = repos.map(async repo => {
				switch (action) {
					case "checkout":
						return checkoutBranch(repo, branchName);
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
					default:
						return undefined;
				}
			});
			const actionResults = await Promise.all(actions);

			if (action && ACTION_WARNINGS[action] && actionResults.every(result => result === false)) {
				return vscode.window.showWarningMessage(
					ACTION_WARNINGS[action] || "Action failed.",
				);
			}

			if (isBranchAction) {
				await this.addBranchToHistory(branchName, false);
			}

			vscode.window.showInformationMessage(`Git ${action} completed successfully.`);
		} catch (error: any) {
			console.log("Error [gitCommand]", action, error);
			vscode.window.showErrorMessage(error.message || "Git operation failed");
		} finally {
			this.webview.postMessage({ command: "gitOperationEnd" });
		}
	}

	private async removeHistoryState(version: string, branch: string) {
		const state = this.getState();
		if (!state?.gitHistory?.[version]) {
			return;
		}

		state.gitHistory[version] = state.gitHistory[version].filter((name: string) => name !== branch);
		if (state.gitHistory[version].length === 0) {
			delete state.gitHistory[version];
		}

		await this.setState(state);
		this.webview.postMessage({
			command: "restoreState",
			state,
		});
	}
}
