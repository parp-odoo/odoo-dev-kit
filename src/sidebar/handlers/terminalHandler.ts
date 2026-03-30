import { TerminalService } from "../services/terminalService";

export class TerminalHandler {
	constructor(private service: TerminalService, private webview: any) {}

	runShell(cmd: string) {
		this.service.send(cmd);
	}

	runCommand(cmd: string) {
		const terminal = this.service.get(true);

		if (terminal.shellIntegration) {
			terminal.shellIntegration.executeCommand(cmd);
		} else {
			terminal.sendText(`${cmd}\n`);
		}

		this.webview.postMessage({ command: "serverStatus", running: true });
	}

	stop() {
		this.service.stop();
		this.webview.postMessage({ command: "serverStatus", running: false });
	}
}
