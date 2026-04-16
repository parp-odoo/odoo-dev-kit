import { TerminalService } from "../services/terminalService";

export class TerminalHandler {
	constructor(private service: TerminalService, private webview: any) {}

	runShell(cmd: string) {
		this.service.send(cmd, "server");
	}

	private executeInTerminal(cmd: string, terminal = this.service.get(true, "server")) {
		if (terminal.shellIntegration) {
			terminal.shellIntegration.executeCommand(cmd);
		} else {
			terminal.sendText(`${cmd}\n`);
		}
	}

	runCommand(cmd: string) {
		this.executeInTerminal(cmd, this.service.get(true, "server"));

		this.webview.postMessage({ command: "serverStatus", running: true });
	}

	runTestCommand(cmd: string) {
		this.executeInTerminal(cmd, this.service.get(true, "test"));
	}

	stop() {
		this.service.stop("server");
		this.webview.postMessage({ command: "serverStatus", running: false });
	}
}
