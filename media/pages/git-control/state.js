export function createGitControlState(savedState = {}) {
	return {
		branchName: "",
		currentBranch: "",
		commitMessage: savedState.gitCommitMessage || "",
		commitValidation: "",
		history: savedState.gitHistory || {},
		gitPaths: savedState.gitPaths || [{ id: Date.now(), path: "", base: "", dev: "" }],
		loading: false,
	};
}

function parseHistoryVersion(version) {
	if (version === "master") {
		return { kind: "master", major: Number.POSITIVE_INFINITY, minor: Number.POSITIVE_INFINITY };
	}

	const saasMatch = version.match(/^saas-(\d+)\.(\d+)$/);
	if (saasMatch) {
		return {
			kind: "saas",
			major: Number(saasMatch[1]),
			minor: Number(saasMatch[2]),
		};
	}

	const versionMatch = version.match(/^(\d+)\.0$/);
	if (versionMatch) {
		return {
			kind: "stable",
			major: Number(versionMatch[1]),
			minor: 0,
		};
	}

	return null;
}

export function sortHistoryVersions(versions) {
	return [...versions].sort((left, right) => {
		const a = parseHistoryVersion(left);
		const b = parseHistoryVersion(right);

		if (a?.kind === "master" || b?.kind === "master") {
			if (a?.kind === b?.kind) {
				return 0;
			}
			return a?.kind === "master" ? -1 : 1;
		}

		if (a && b) {
			if (a.major !== b.major) {
				return b.major - a.major;
			}
			if (a.kind !== b.kind) {
				return a.kind === "saas" ? -1 : 1;
			}
			if (a.minor !== b.minor) {
				return b.minor - a.minor;
			}
			return left.localeCompare(right);
		}

		if (a || b) {
			return a ? -1 : 1;
		}

		return right.localeCompare(left);
	});
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
