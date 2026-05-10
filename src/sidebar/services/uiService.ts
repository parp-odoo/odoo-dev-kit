import * as vscode from "vscode";

export class UIService {
	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly webview: vscode.Webview,
	) {}

	public readonly handlers = {
		showMessage: this.showInfo.bind(this),
		showWarning: this.showWarning.bind(this),
		showError: this.showError.bind(this),
	};

	showInfo({ text }: { text: string }) {
		vscode.window.showInformationMessage(text);
	}
	showWarning({ text }: { text: string }) {
		vscode.window.showWarningMessage(text);
	}
	showError({ text }: { text: string }) {
		vscode.window.showErrorMessage(text);
	}
}
