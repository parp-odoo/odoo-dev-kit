export const DEFAULT_CLI_OPTIONS_STATE = {
	Server: {
		database: true,
		init: true,
		update: true,
	},
	Developer: {
		dev: true,
	},
	"Demo Data": {
		"with-demo": true,
		"without-demo": true,
	},
};

export function mergeCliOptionsWithDefaults(cliOptions = {}) {
	const merged = {};

	for (const [groupName, options] of Object.entries(cliOptions || {})) {
		merged[groupName] = { ...(options || {}) };
	}

	for (const [groupName, defaults] of Object.entries(DEFAULT_CLI_OPTIONS_STATE)) {
		merged[groupName] = {
			...defaults,
			...(merged[groupName] || {}),
		};
	}

	return merged;
}

export const DEFAULT_CONFIG_STATE = {
	addons: [{ id: 1, name: "", path: "", enabled: true }],
	cliOptions: mergeCliOptionsWithDefaults(),
	pythonVenv: "",
	odooBinPath: "",
	autoDetectDbName: true,
};

export function getInitialConfigState(savedState) {
	const savedConfig = savedState?.config || {};
	if (savedState?.config) {
		return {
			...DEFAULT_CONFIG_STATE,
			...savedConfig,
			cliOptions: mergeCliOptionsWithDefaults(savedConfig.cliOptions || {}),
		};
	}

	return {
		...DEFAULT_CONFIG_STATE,
		cliOptions: mergeCliOptionsWithDefaults(),
	};
}

export function countActiveOptions(cliOptions, selectedOptions, groupName) {
	const group = cliOptions.find(item => item.groupName === groupName);
	const total = group ? group.options.length : 0;
	const active = Object.values(selectedOptions[groupName] || {}).filter(Boolean).length;

	return ` (${active}/${total})`;
}
