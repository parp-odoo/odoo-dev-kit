import * as vscode from "vscode";

type TerminalKind = "server" | "test";

export class TerminalService {
	private terminals: Partial<Record<TerminalKind, vscode.Terminal>> = {};
	private hasShown: Partial<Record<TerminalKind, boolean>> = {};

	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly webview: vscode.Webview,
	) {}

	public readonly handlers = {
		runCommand: this.runCommand.bind(this),
		runTestCommand: this.runTestCommand.bind(this),
		stopServer: this.stopServer.bind(this),
	};

	get(show = false, kind: TerminalKind = "server") {
		let terminal = this.terminals[kind];
		if (!terminal) {
			const name = kind === "test" ? "Odoo Dev Kit - Tests" : "Odoo Dev Kit - Server";
			terminal = vscode.window.createTerminal({ name });
			this.terminals[kind] = terminal;
		}
		if (show && !this.hasShown[kind]) {
			terminal.show();
			this.hasShown[kind] = true;
		}
		return terminal;
	}

	send(cmd: string, kind: TerminalKind = "server") {
		this.get(false, kind).sendText(`${cmd}\n`);
	}

	stopServer(kind: TerminalKind = "server") {
		this.terminals[kind]?.sendText("\u0003");
		this.webview.postMessage({ command: "serverStatus", running: false });
	}

	private executeInTerminal(cmd: string, terminal = this.get(true, "server")) {
		if (terminal.shellIntegration) {
			terminal.shellIntegration.executeCommand(cmd);
		} else {
			terminal.sendText(`${cmd}\n`);
		}
	}

	runCommand({ text }: { text: string }) {
		this.executeInTerminal(text, this.get(true, "server"));
		this.webview.postMessage({ command: "serverStatus", running: true });
	}

	runTestCommand({ text }: { text: string }) {
		this.executeInTerminal(text, this.get(true, "test"));
	}
}
