import * as vscode from "vscode";

export class TerminalService {
	private terminal?: vscode.Terminal;
	private hasShown = false;

	get(show = false) {
		if (!this.terminal) {
			this.terminal = vscode.window.createTerminal({ name: "Odoo Dev Kit" });
		}
		if (show && !this.hasShown) {
			this.terminal.show();
			this.hasShown = true;
		}
		return this.terminal;
	}

	send(cmd: string) {
		this.get().sendText(`${cmd}\n`);
	}

	stop() {
		this.terminal?.sendText("\u0003");
	}
}
