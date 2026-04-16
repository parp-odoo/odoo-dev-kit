import * as vscode from "vscode";

type TerminalKind = "server" | "test";

export class TerminalService {
	private terminals: Partial<Record<TerminalKind, vscode.Terminal>> = {};
	private hasShown: Partial<Record<TerminalKind, boolean>> = {};

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

	stop(kind: TerminalKind = "server") {
		this.terminals[kind]?.sendText("\u0003");
	}
}
