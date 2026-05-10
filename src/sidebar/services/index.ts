import { addService } from "./serviceRegistry";
import { CopilotService } from "./copilotService";
import { DbService } from "./dbService";
import { GitService } from "./gitService";
import { StateService } from "./stateService";
import { TerminalService } from "./terminalService";
import { UIService } from "./uiService";

let servicesRegistered = false;

export function registerServices() {
	if (servicesRegistered) {
		return;
	}

	addService("db", DbService);
	addService("git", GitService);
	addService("state", StateService);
	addService("terminal", TerminalService);
	addService("ui", UIService);
	addService("ai", CopilotService);

	servicesRegistered = true;
}

export { CopilotService, DbService, GitService, StateService, TerminalService, UIService };
