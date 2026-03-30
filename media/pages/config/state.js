export const DEFAULT_CONFIG_STATE = {
    addons: [{ id: 1, name: "", path: "", enabled: true }],
    cliOptions: {},
    pythonVenv: "",
    odooBinPath: "",
    autoDetectDbName: true,
};

export function getInitialConfigState(savedState) {
    if (savedState?.config) {
        return { ...DEFAULT_CONFIG_STATE, ...savedState.config };
    }

    return { ...DEFAULT_CONFIG_STATE };
}

export function countActiveOptions(cliOptions, selectedOptions, groupName) {
    const group = cliOptions.find(item => item.groupName === groupName);
    const total = group ? group.options.length : 0;
    const active = Object.values(selectedOptions[groupName] || {}).filter(Boolean).length;

    return ` (${active}/${total})`;
}
