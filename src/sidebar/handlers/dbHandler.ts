import { exec, execFile } from "child_process";

export class DbHandler {
	constructor(private webview: any) {}

	dropDb(message: any) {
		exec(message.text, (error, stdout, stderr) => {
			// same logic
		});
	}

	resolveDb(message: any) {
		// move resolveDbNameFromAddon here
	}
}
