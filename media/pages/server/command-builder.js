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
    const venv = (config.pythonVenv || "").trim();
    const odooBin = (config.odooBinPath || "").trim() || "odoo-bin";
    const parts = [];
    if (venv) {
        const pythonPath = `${venv.replace(/\/+$/, "")}/bin/python`;
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

export function validateRunConfiguration(config, params) {
    const errors = [];
    const enabledAddons = getEnabledAddons(config.addons || []);
    const enabledAddonPaths = enabledAddons.map(addon => (addon.path || "").trim());
    const invalidAddonPaths = enabledAddonPaths.filter(path => path.length < 3);
    const addonsParam = (params["addons-path"] || "").trim();

    if (!addonsParam && enabledAddonPaths.length === 0) {
        errors.push("Add at least one enabled addon path or set --addons-path.");
    }
    if (invalidAddonPaths.length) {
        errors.push("Some enabled addon paths look invalid.");
    }

    const venv = (config.pythonVenv || "").trim();
    if (venv && venv.length < 3) {
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

export function getDropDbCommand(params) {
    const dbName = (params.database || "").trim();
    if (!dbName) {
        return "";
    }
    return `dropdb ${formatValue(dbName)}`;
}
