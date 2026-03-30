
export function requestPersistedState(vscode) {
    const existing = vscode.getState();
    if (existing) {
        return Promise.resolve(existing);
    }
    return new Promise(resolve => {
        let settled = false;
        const handler = event => {
            const message = event.data;
            if (message?.command !== "restoreState") {
                return;
            }
            if (settled) {
                return;
            }
            settled = true;
            window.removeEventListener("message", handler);
            resolve(message.state || null);
        };
        setTimeout(() => {
            if (settled) {
                return;
            }
            settled = true;
            window.removeEventListener("message", handler);
            resolve(null);
        }, 1000);
        window.addEventListener("message", handler);
        vscode.postMessage({ command: "requestState" });
    });
}
