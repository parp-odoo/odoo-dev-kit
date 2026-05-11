import * as vscode from "vscode";
import { execFile } from "child_process";

type TerminalKind = "server" | "test";
type TerminalCommandPayload = {
	text: string;
	port?: string | number;
};

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
			const name = kind === "test" ? "Tests" : "Server";
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

	private execFileOutput(file: string, args: string[]) {
		return new Promise<string>((resolve, reject) => {
			execFile(file, args, (error, stdout, stderr) => {
				const output = `${stdout || ""}\n${stderr || ""}`.trim();
				if (error && !output) {
					reject(error);
					return;
				}
				resolve(output);
			});
		});
	}

	private parsePids(rawOutput: string) {
		return [
			...new Set(
				String(rawOutput || "")
					.split(/\s+/)
					.map(value => Number.parseInt(value, 10))
					.filter(pid => Number.isInteger(pid) && pid > 0),
			),
		];
	}

	private async getUnixPidsOnPort(port: string) {
		try {
			return this.parsePids(await this.execFileOutput("lsof", ["-ti", `tcp:${port}`]));
		} catch {
			try {
				return this.parsePids(await this.execFileOutput("fuser", [`${port}/tcp`]));
			} catch {
				return [];
			}
		}
	}

	private async getWindowsPidsOnPort(port: string) {
		try {
			const output = await this.execFileOutput("netstat", ["-ano", "-p", "tcp"]);
			const pids = output
				.split(/\r?\n/)
				.map(line => line.trim())
				.filter(Boolean)
				.map(line => line.split(/\s+/))
				.filter(parts => parts.length >= 5)
				.filter(parts => parts[0].toUpperCase() === "TCP")
				.filter(parts => parts[1].endsWith(`:${port}`))
				.filter(parts => parts[3].toUpperCase() === "LISTENING")
				.map(parts => Number.parseInt(parts[4], 10))
				.filter(pid => Number.isInteger(pid) && pid > 0);

			return [...new Set(pids)];
		} catch {
			return [];
		}
	}

	private async killProcessOnPort(port?: string | number) {
		const normalizedPort = String(port ?? "").trim();
		if (!/^\d+$/.test(normalizedPort)) {
			return;
		}

		const pids =
			process.platform === "win32"
				? await this.getWindowsPidsOnPort(normalizedPort)
				: await this.getUnixPidsOnPort(normalizedPort);

		for (const pid of pids) {
			try {
				process.kill(pid, "SIGKILL");
			} catch {
				// Ignore races where the process exited between lookup and kill.
			}
		}
	}

	async runCommand({ text, port }: TerminalCommandPayload) {
		await this.killProcessOnPort(port);
		this.executeInTerminal(text, this.get(true, "server"));
		this.webview.postMessage({ command: "serverStatus", running: true });
	}

	async runTestCommand({ text, port }: TerminalCommandPayload) {
		await this.killProcessOnPort(port);
		this.executeInTerminal(text, this.get(true, "test"));
	}
}
