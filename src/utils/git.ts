import { exec } from "child_process";
import * as path from "path";

export function getVersionFromBranch(branch: string): string {
    if (branch === "master" || branch.startsWith("master-")) {
        return "master";
    }
    const saasMatch = branch.match(/(saas-\d+\.\d+)/);
    if (saasMatch) {
        return saasMatch[1];
    }
    const versionMatch = branch.match(/(\d+\.0)/);
    if (versionMatch) {
        return versionMatch[1];
    }
    return branch;
}

export function execCommand(command: string, cwd: string): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
        exec(command, { cwd }, (error, stdout, stderr) => {
            if (error) {
                reject({ error, stdout, stderr });
            } else {
                resolve({ stdout, stderr });
            }
        });
    });
}

/**
 * List all remote names for a repo, e.g. ["origin", "odoo", "odoo-dev", "ent"]
 */
export async function getRemotes(repoPath: string): Promise<string[]> {
    try {
        const { stdout } = await execCommand("git remote", repoPath);
        return stdout.trim().split("\n").map(r => r.trim()).filter(Boolean);
    } catch (err) {
        console.log("Error [getRemotes]", repoPath, err);
        return [];
    }
}

/**
 * Check if a branch exists on ANY of the repo's remotes.
 * Returns the first remote name that has the branch, or null if none.
 */
export async function findRemoteWithBranch(repoPath: string, branch: string): Promise<string | null> {
    const remotes = await getRemotes(repoPath);
    for (const remote of remotes) {
        try {
            const { stdout } = await execCommand(`git ls-remote --heads ${remote} ${branch}`, repoPath);
            if (stdout.trim().length > 0) {
                return remote;
            }
        } catch (err) {
            console.log("Error [findRemoteWithBranch]", remote, repoPath, err);
        }
    }
    return null;
}

/**
 * Get the tracking remote for the current branch, or first available remote.
 */
export async function getPreferredRemote(repoPath: string): Promise<string> {
    try {
        const { stdout } = await execCommand("git rev-parse --abbrev-ref --symbolic-full-name @{u}", repoPath);
        // stdout is like "origin/branch-name"
        const remote = stdout.trim().split("/")[0];
        if (remote) { return remote; }
    } catch (err) {
        console.log("Error [getPreferredRemote] no upstream set", repoPath, err);
    }
    // fallback: first remote
    const remotes = await getRemotes(repoPath);
    return remotes[0] || "origin";
}

export async function checkoutBranch(repoPath: string, branch: string): Promise<void> {
    try {
        await execCommand(`git fetch --all`, repoPath);
        const remote = await findRemoteWithBranch(repoPath, branch);
        const targetBranch = remote ? branch : getVersionFromBranch(branch);

        await execCommand(`git checkout ${targetBranch}`, repoPath);
        // Pull latest using the tracking remote
        const pullRemote = await getPreferredRemote(repoPath);
        await execCommand(`git pull ${pullRemote} ${targetBranch} --rebase`, repoPath).catch(() => {});
    } catch (err: any) {
        console.log("Error [checkoutBranch]", repoPath, err);
        throw new Error(`Checkout failed in ${repoPath}: ${err.stderr || err.error?.message || err.message}`);
    }
}

export async function remoteUpdate(repoPath: string): Promise<void> {
    try {
        await execCommand(`git fetch --all`, repoPath);
    } catch (err: any) {
        console.log("Error [remoteUpdate]", repoPath, err);
        throw new Error(`Remote update failed in ${repoPath}: ${err.stderr || err.error?.message || err.message}`);
    }
}

export async function createNewBranch(repoPath: string, baseBranch: string, newBranch: string): Promise<void> {
    try {
        await execCommand(`git checkout -b ${newBranch}`, repoPath);
    } catch (err: any) {
        console.log("Error [createNewBranch]", repoPath, err);
        throw new Error(`New branch failed in ${repoPath}: ${err.stderr || err.error?.message || err.message}`);
    }
}

export async function pushBranch(repoPath: string, force: boolean = false): Promise<void> {
    try {
        const { stdout } = await execCommand("git rev-parse --abbrev-ref HEAD", repoPath);
        const currentBranch = stdout.trim();
        const remote = await getPreferredRemote(repoPath);
        const forceFlag = force ? "-f" : "";
        await execCommand(`git push ${forceFlag} ${remote} ${currentBranch}`, repoPath);
    } catch (err: any) {
        console.log("Error [pushBranch]", repoPath, err);
        throw new Error(`Push failed in ${repoPath}: ${err.stderr || err.error?.message || err.message}`);
    }
}

export async function hasDiff(repoPath: string): Promise<boolean> {
    try {
        const { stdout: diffStdout } = await execCommand("git diff --shortstat", repoPath);
        const { stdout: commitsStdout } = await execCommand("git log @{u}..HEAD --oneline", repoPath).catch(() => ({stdout: "no tracking"}));
        
        return diffStdout.trim().length > 0 || (commitsStdout.trim().length > 0 && commitsStdout !== "no tracking");
    } catch (err) {
        console.log("Error [hasDiff]", repoPath, err);
        return false;
    }
}
