export function createGitControlState(savedState = {}) {
    return {
        branchName: "",
        history: savedState.gitHistory || {},
        gitPaths: savedState.gitPaths || [{ id: Date.now(), path: "" }],
        loading: false,
    };
}

export function removeHistoryEntry(history, version, branch) {
    if (!history[version]) {
        return;
    }

    history[version] = history[version].filter(item => item !== branch);
    if (history[version].length === 0) {
        delete history[version];
    }
}
