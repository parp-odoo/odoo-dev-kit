import * as vscode from "vscode";
import { exec, execFile } from "child_process";
import { getVersionFromBranch } from "../../utils/git";

export class DbHandler {
	constructor(private webview: any) {
		this.webview = webview;
	}

	postMessage(msgObject: Object) {
		return this.webview.postMessage(msgObject);
	}

	dropDb(message: any) {
		const callback = (error: any, stdout: string, stderr: string) => {
			const dbName = message.dbName || "database";
			if (error) {
				vscode.window.showErrorMessage(`Drop DB failed: ${stderr || error.message}`);
				return;
			}
			if (stderr) {
				vscode.window.showWarningMessage(`Drop DB warning: ${stderr}`);
			}
			vscode.window.showInformationMessage(`DB "${dbName}" dropped successfully.`);
		};
		exec(message.text, callback);
	}

	resolveDb(message: any) {
		const addonPath = String(message.addonPath || "").trim();
		const requestId = message.requestId;
		if (!addonPath) {
			return this.postMessage({
				command: "resolvedDbName",
				requestId,
				error: "Addon path is missing.",
			});
		}
		const callback = (error: any, stdout: string, stderr: string) => {
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
		};
		execFile("git", ["-C", addonPath, "rev-parse", "--abbrev-ref", "HEAD"], callback);
	}
}
