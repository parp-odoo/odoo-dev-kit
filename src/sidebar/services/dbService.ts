import * as vscode from "vscode";
import { exec, execFile } from "child_process";

import { getVersionFromBranch } from "../../utils/git";

type DbMessage = {
	text?: string;
	dbName?: string;
	addonPath?: string;
	requestId?: string;
};

export class DbService {
	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly webview: vscode.Webview,
	) {}

	public readonly handlers = {
		runDropDb: this.dropDb.bind(this),
		resolveDbNameFromAddon: this.resolveDb.bind(this),
	};

	private postMessage(message: Record<string, unknown>) {
		return this.webview.postMessage(message);
	}

	dropDb(message: DbMessage) {
		exec(String(message.text || ""), (error, _stdout, stderr) => {
			const dbName = message.dbName || "database";
			if (error) {
				vscode.window.showErrorMessage(`Drop DB failed: ${stderr || error.message}`);
				return;
			}
			if (stderr) {
				vscode.window.showWarningMessage(`Drop DB warning: ${stderr}`);
			}
			vscode.window.showInformationMessage(`DB "${dbName}" dropped successfully.`);
		});
	}

	resolveDb(message: DbMessage) {
		const addonPath = String(message.addonPath || "").trim();
		const requestId = message.requestId;
		if (!addonPath) {
			return this.postMessage({
				command: "resolvedDbName",
				requestId,
				error: "Addon path is missing.",
			});
		}

		execFile("git", ["-C", addonPath, "rev-parse", "--abbrev-ref", "HEAD"], (error, stdout, stderr) => {
			if (error) {
				return this.postMessage({
					command: "resolvedDbName",
					requestId,
					error: (stderr || error.message || "").trim(),
				});
			}

			const branch = String(stdout || "").trim();
			if (!branch) {
				return this.postMessage({
					command: "resolvedDbName",
					requestId,
					error: "Could not detect branch name.",
				});
			}

			const version = getVersionFromBranch(branch);
			const dbName = `testdb-${version}`;
			return this.postMessage({
				command: "resolvedDbName",
				requestId,
				branch,
				version,
				dbName,
			});
		});
	}
}
