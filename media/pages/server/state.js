export const DEFAULT_SERVER_CONFIG = {
    addons: [{ id: 1, name: "", path: "", enabled: true }],
    cliOptions: {},
    pythonVenv: "",
    odooBinPath: "",
    autoDetectDbName: true,
};

export function createServerState(savedState = {}) {
    return {
        config: {
            ...DEFAULT_SERVER_CONFIG,
            ...(savedState.config || {}),
        },
        params: savedState.params || {},
        runMode: "update",
        isRunning: false,
    };
}
