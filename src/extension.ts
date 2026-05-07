import * as vscode from "vscode";
import { SidebarViewProvider } from "./sidebar/SidebarViewProvider";

const EXTENSION_ID = "ParthPatel.odoo-dev-kit";
const LAST_VERSION_KEY = "odooDevKit.lastVersion";

async function maybeShowReleaseNotes(context: vscode.ExtensionContext) {
	const ext = vscode.extensions.getExtension(EXTENSION_ID);
	const currentVersion = String(ext?.packageJSON?.version || "").trim();
	if (!currentVersion) {
		return;
	}

	const previousVersion = context.globalState.get<string>(LAST_VERSION_KEY);
	await context.globalState.update(LAST_VERSION_KEY, currentVersion);

	// Don't show on first install, and don't re-show for same version.
	if (!previousVersion || previousVersion === currentVersion) {
		return;
	}

	try {
		const changelogUri = vscode.Uri.joinPath(context.extensionUri, "CHANGELOG.md");
		await vscode.commands.executeCommand("markdown.showPreviewToSide", changelogUri);
		vscode.window.showInformationMessage(
			`Odoo Dev Kit updated (${previousVersion} → ${currentVersion}). Opening release notes…`,
		);
	} catch {
		// Ignore if markdown preview is unavailable for some reason.
	}
}

export async function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "odoo-dev-kit" is now active!');

	// Show release notes whenever the extension version changes (upgrade/downgrade).
	void maybeShowReleaseNotes(context);

	context.subscriptions.push(
		vscode.commands.registerCommand("odoo-dev-kit.helloOdoo", () => {
			vscode.window.showInformationMessage("Hello Odooers from Parth!");
		}),
	);

	const sidebarProvider = new SidebarViewProvider(context, context.extensionUri);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(SidebarViewProvider.viewType, sidebarProvider),
	);
	context.subscriptions.push(sidebarProvider);
}

export function deactivate() {}
