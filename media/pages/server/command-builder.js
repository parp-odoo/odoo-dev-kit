export function formatValue(value) {
	const str = String(value);
	if (/[\s"]/g.test(str)) {
		return `"${str.replace(/"/g, '\\"')}"`;
	}
	return str;
}

export function getFirstAddonPath(addons = []) {
	for (const addon of addons) {
		const path = (addon.path || "").trim();
		if (path) {
			return path;
		}
	}
	return "";
}

export function getValidAddons(addons = []) {
	return addons.filter(addon => (addon.path || "").trim() !== "");
}

export function getEnabledAddons(addons = []) {
	return getValidAddons(addons).filter(addon => addon.enabled !== false);
}

export function getEnabledOptionsList(cliOptions = [], enabledByGroup = {}) {
	return cliOptions.flatMap(group => {
		const enabled = enabledByGroup[group.groupName] || {};
		return group.options.filter(opt => enabled[opt.name]);
	});
}

export function stripOptionalQuotes(value) {
	const str = String(value || "").trim();
	if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
		return str.slice(1, -1).trim();
	}
	return str;
}

export function resolvePythonExecutablePath(rawVenv) {
	const normalized = stripOptionalQuotes(rawVenv);
	if (!normalized) {
		return "";
	}

	const withoutSource = normalized.replace(/^source\s+/i, "").trim();
	const withoutActivate = withoutSource.replace(/[\\/]+bin[\\/]activate$/i, "");
	const cleaned = withoutActivate.replace(/[\\/]+$/g, "");

	if (!cleaned) {
		return "";
	}

	if (
		/[\\/]bin[\\/]python(?:\d+(?:\.\d+)*)?$/i.test(cleaned) ||
		/[\\/]python(?:\d+(?:\.\d+)*)?$/i.test(cleaned)
	) {
		return cleaned;
	}

	const sep = cleaned.includes("\\") ? "\\" : "/";
	return `${cleaned}${sep}bin${sep}python`;
}

export function resolveActivationScriptPath(rawVenv) {
	const normalized = stripOptionalQuotes(rawVenv);
	if (!normalized) {
		return "";
	}

	const withoutSource = normalized.replace(/^(?:source|\.)\s+/i, "").trim();
	const cleaned = withoutSource.replace(/[\\/]+$/g, "");
	if (!cleaned) {
		return "";
	}

	if (/[\\/]bin[\\/]activate$/i.test(cleaned)) {
		return cleaned;
	}

	const fromPython = cleaned.replace(/[\\/]bin[\\/]python(?:\d+(?:\.\d+)*)?$/i, "");
	if (fromPython !== cleaned) {
		const sep = cleaned.includes("\\") ? "\\" : "/";
		return `${fromPython}${sep}bin${sep}activate`;
	}

	const sep = cleaned.includes("\\") ? "\\" : "/";
	return `${cleaned}${sep}bin${sep}activate`;
}

export function getCommandArgs({ cliOptions, config, params, runMode }) {
	const args = [];
	const enabledOptions = getEnabledOptionsList(cliOptions, config.cliOptions || {});

	for (const opt of enabledOptions) {
		if (opt.name === "addons-path" || opt.name === "init" || opt.name === "update") {
			continue;
		}
		const value = params[opt.name];
		if (opt.type === "boolean") {
			if (value === true) {
				args.push(opt.key);
			}
			continue;
		}
		if (value === undefined || value === null || value === "") {
			continue;
		}
		args.push(opt.key, formatValue(value));
	}

	const initOpt = enabledOptions.find(opt => opt.name === "init");
	const updateOpt = enabledOptions.find(opt => opt.name === "update");
	if (runMode === "init" && initOpt) {
		const initValue = params[initOpt.name];
		if (initValue !== undefined && initValue !== null && initValue !== "") {
			args.push(initOpt.key, formatValue(initValue));
		}
	}
	if (runMode !== "init" && updateOpt) {
		const updateValue = params[updateOpt.name];
		if (updateValue !== undefined && updateValue !== null && updateValue !== "") {
			args.push(updateOpt.key, formatValue(updateValue));
		}
	}

	const addonsParam = (params["addons-path"] || "").trim();
	let addonsValue = addonsParam;
	if (!addonsValue) {
		const paths = getEnabledAddons(config.addons || [])
			.map(addon => (addon.path || "").trim())
			.filter(Boolean);
		if (paths.length) {
			addonsValue = paths.join(",");
		}
	}
	if (addonsValue) {
		args.push("--addons-path", formatValue(addonsValue));
	}

	return args;
}

export function getBaseCommandParts(config) {
	const activationPath = resolveActivationScriptPath(config.pythonVenv || "");
	const pythonPath = resolvePythonExecutablePath(config.pythonVenv || "");
	const odooBin = (config.odooBinPath || "").trim() || "odoo-bin";
	const parts = [];
	if (activationPath) {
		parts.push(`source ${formatValue(activationPath)} && python`);
		parts.push(formatValue(odooBin));
		return parts;
	}
	if (pythonPath) {
		parts.push(formatValue(pythonPath));
	}
	parts.push(formatValue(odooBin));
	return parts;
}

export function getRunCommand({ cliOptions, config, params, runMode }) {
	return [
		...getBaseCommandParts(config),
		...getCommandArgs({ cliOptions, config, params, runMode }),
	].join(" ");
}

export function getResolvedAddonsPath(config, params) {
	const addonsParam = (params["addons-path"] || "").trim();
	if (addonsParam) {
		return addonsParam;
	}
	const paths = getEnabledAddons(config.addons || [])
		.map(addon => (addon.path || "").trim())
		.filter(Boolean);
	return paths.join(",");
}

export function validateRunConfiguration(config, params) {
	const errors = [];
	const enabledAddons = getEnabledAddons(config.addons || []);
	const enabledAddonPaths = enabledAddons.map(addon => (addon.path || "").trim());
	const invalidAddonPaths = enabledAddonPaths.filter(path => path.length < 3);
	const addonsParam = (params["addons-path"] || "").trim();
	const rawPythonVenv = stripOptionalQuotes(config.pythonVenv || "");

	if (!addonsParam && enabledAddonPaths.length === 0) {
		errors.push("Add at least one enabled addon path or set --addons-path.");
	}
	if (invalidAddonPaths.length) {
		errors.push("Some enabled addon paths look invalid.");
	}

	if (rawPythonVenv && rawPythonVenv.length < 3) {
		errors.push("Python venv path looks too short.");
	}
	const odooBin = (config.odooBinPath || "").trim();
	if (odooBin && odooBin.length < 3) {
		errors.push("Odoo bin path looks too short.");
	}

	if (addonsParam && addonsParam.length < 3) {
		errors.push("--addons-path looks too short.");
	}

	return errors;
}

export function getTestCommand({ config, params, testing }) {
	const args = [];
	const addonsPath = getResolvedAddonsPath(config, params);
	const dbName = (params.database || "").trim();
	const testTags = (testing.testTags || "").trim();
	const port = (testing.port || "").trim();

	if (addonsPath) {
		args.push("--addons-path", formatValue(addonsPath));
	}
	if (dbName) {
		args.push("-d", formatValue(dbName));
	}
	if (port) {
		args.push("-p", formatValue(port));
	}
	args.push("--test-enable");
	if (testTags) {
		args.push("--test-tags", formatValue(testTags));
	}

	return [...getBaseCommandParts(config), ...args].join(" ");
}

export function validateTestConfiguration(config, params, testing) {
	const errors = [];
	const addonsPath = getResolvedAddonsPath(config, params);
	const dbName = (params.database || "").trim();
	const testTags = (testing.testTags || "").trim();
	const port = (testing.port || "").trim();

	if (!addonsPath) {
		errors.push("Add at least one enabled addon path or set --addons-path.");
	}
	if (!dbName) {
		errors.push("Set a database name (-d) before running tests.");
	}
	if (!port) {
		errors.push("Set a test port (-p).");
	} else if (!/^\d+$/.test(port)) {
		errors.push("Test port must be numeric.");
	}
	if (!testTags) {
		errors.push("Set test tags (--test-tags).");
	}

	return errors;
}

export function getDropDbCommand(params) {
	const dbName = (params.database || "").trim();
	if (!dbName) {
		return "";
	}
	return `dropdb ${formatValue(dbName)}`;
}
