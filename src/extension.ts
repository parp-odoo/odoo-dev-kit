import * as vscode from "vscode";
import { SidebarViewProvider } from "./views/sidebar-provider";

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "odoo-dev-kit" is now active!');

	context.subscriptions.push(
		vscode.commands.registerCommand("odoo-dev-kit.helloOdoo", () => {
			vscode.window.showInformationMessage("Hello Odooers from Parth!");
		}),
	);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			SidebarViewProvider.viewType,
			new SidebarViewProvider(context.extensionUri)
		),
	);
}

export function deactivate() {}
