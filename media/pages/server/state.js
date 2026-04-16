import { mergeCliOptionsWithDefaults } from "../config/state.js";

export const DEFAULT_SERVER_CONFIG = {
	addons: [{ id: 1, name: "", path: "", enabled: true }],
	cliOptions: mergeCliOptionsWithDefaults(),
	pythonVenv: "",
	odooBinPath: "",
	autoDetectDbName: true,
};

export const DEFAULT_TESTING_CONFIG = {
	testTags: "",
	port: "",
};

export function createServerState(savedState = {}) {
	const savedConfig = savedState.config || {};

	return {
		config: {
			...DEFAULT_SERVER_CONFIG,
			...savedConfig,
			cliOptions: mergeCliOptionsWithDefaults(savedConfig.cliOptions || {}),
		},
		params: savedState.params || {},
		testing: {
			...DEFAULT_TESTING_CONFIG,
			...(savedState.testing || {}),
		},
		computedDbName: "",
		runMode: "update",
		isRunning: false,
	};
}
