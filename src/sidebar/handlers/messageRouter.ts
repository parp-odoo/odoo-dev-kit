export function createMessageRouter(ctx: {
	terminalHandler: any;
	gitHandler: any;
	dbHandler: any;
	stateHandler: any;
	uiHandler: any;
	aiHandler: {
		improveCommit: (message: { text?: string }) => Promise<void>;
	};
}) {
	return async function handle(message: { command?: string; text?: string; state?: unknown }) {
		const map: Record<string, Function> = {
			showMessage: () => ctx.uiHandler.showInfo(message.text),
			showWarning: () => ctx.uiHandler.showWarning(message.text),
			showError: () => ctx.uiHandler.showError(message.text),

			runShellCommand: () => ctx.terminalHandler.runShell(message.text),
			runCommand: () => ctx.terminalHandler.runCommand(message.text),
			runTestCommand: () => ctx.terminalHandler.runTestCommand(message.text),
			stopServer: () => ctx.terminalHandler.stop(),

			runDropDb: () => ctx.dbHandler.dropDb(message),
			resolveDbNameFromAddon: () => ctx.dbHandler.resolveDb(message),
			resolveCurrentBranch: () => ctx.gitHandler.resolveCurrentBranch(),

			persistState: () => ctx.stateHandler.persist(message.state),
			requestState: () => ctx.stateHandler.restore(),

			gitCommand: () => ctx.gitHandler.handle(message),
			improveCommit: () => ctx.aiHandler.improveCommit(message),
		};

		const command = message.command || "";
		await map[command]?.();
	};
}
