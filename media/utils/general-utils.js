
export function clonePlainState(value) {
    try {
        return JSON.parse(JSON.stringify(value));
    } catch {
        return {};
    }
}
