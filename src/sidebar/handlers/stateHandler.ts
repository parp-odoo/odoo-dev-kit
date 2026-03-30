import { StateService } from "../services/stateService";

export class StateHandler {
	constructor(private state: StateService, private webview: any) {}

	async persist(data: any) {
		await this.state.set(data || null);
	}

	restore() {
		this.webview.postMessage({
			command: "restoreState",
			state: this.state.get(),
		});
	}
}
