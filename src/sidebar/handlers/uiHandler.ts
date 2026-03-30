import * as vscode from "vscode";

export class UIHandler {
	showInfo(msg: string) {
		vscode.window.showInformationMessage(msg);
	}
	showWarning(msg: string) {
		vscode.window.showWarningMessage(msg);
	}
	showError(msg: string) {
		vscode.window.showErrorMessage(msg);
	}
}
