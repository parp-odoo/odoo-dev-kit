export function createMessageRouter(ctx: {
	terminalHandler: any;
	gitHandler: any;
	dbHandler: any;
	stateHandler: any;
	uiHandler: any;
}) {
	return async function handle(message: any) {
		const map: Record<string, Function> = {
			showMessage: () => ctx.uiHandler.showInfo(message.text),
			showWarning: () => ctx.uiHandler.showWarning(message.text),
			showError: () => ctx.uiHandler.showError(message.text),

			runShellCommand: () => ctx.terminalHandler.runShell(message.text),
			runCommand: () => ctx.terminalHandler.runCommand(message.text),
			stopServer: () => ctx.terminalHandler.stop(),

			runDropDb: () => ctx.dbHandler.dropDb(message),
			resolveDbNameFromAddon: () => ctx.dbHandler.resolveDb(message),

			persistState: () => ctx.stateHandler.persist(message.state),
			requestState: () => ctx.stateHandler.restore(),

			gitCommand: () => ctx.gitHandler.handle(message),
		};

		await map[message.command]?.();
	};
}
