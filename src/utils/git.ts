import { exec, execFile } from "child_process";
import { Repo } from "../types";

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

function execGitCommand(args: string[], cwd: string): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
        execFile("git", args, { cwd, encoding: "utf8" }, (error, stdout, stderr) => {
            if (error) {
                reject({ error, stdout, stderr });
            } else {
                resolve({ stdout: stdout || "", stderr: stderr || "" });
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

export async function checkoutBranch(repo: Repo, branch: string): Promise<void> {
    const {path, base} = repo;
    try {
        const remote = await findRemoteWithBranch(path, branch);
        const version = getVersionFromBranch(branch);

        await execCommand(`git fetch ${base} ${version}`, path);
        
        const targetBranch = remote ? branch : version;
        await execCommand(`git checkout ${targetBranch}`, path);

        if (targetBranch === version) {
            await execCommand(`git pull ${base} ${version} --rebase`, path);
        } else {
            await execCommand(`git rebase ${base}/${version}`, path);
        }
        console.log(`Checked out ${targetBranch} in ${path}`);
    } catch (err: any) {
        throw new Error(`Checkout failed in ${path}: ${err.stderr || err.error?.message || err.message}`);
    }
}

export async function remoteUpdate(repo: Repo): Promise<void> {
    const {path} = repo;
    try {
        await execCommand(`git fetch --all`, path);
        console.log(`Updated remotes in ${path}`);
    } catch (err: any) {
        console.log("Error [remoteUpdate]", path, err);
        throw new Error(`Remote update failed in ${path}: ${err.stderr || err.error?.message || err.message}`);
    }
}

export async function createNewBranch(repo: Repo, baseBranch: string, newBranch: string): Promise<boolean> {
    const {path} = repo;
    try {
        const hasChanges = await hasDiff(repo);
        if (!hasChanges) {
            console.log(`There are no changes in ${path}`);
            return false;
        }
        await execCommand(`git checkout -b ${newBranch}`, path);
        console.log(`Created new branch ${newBranch} in ${path}`);
        return true;
    } catch (err: any) {
        console.log("Error [createNewBranch]", path, err);
        throw new Error(`New branch failed in ${path}: ${err.stderr || err.error?.message || err.message}`);
    }
}

export async function pushBranch(repo: Repo, force: boolean = false): Promise<void> {
    const {path, dev, base} = repo;
    try {
        const { stdout } = await execCommand("git rev-parse --abbrev-ref HEAD", path);
        const currentBranch = stdout.trim();
        const version = getVersionFromBranch(currentBranch);
        const forceFlag = force ? "-f" : "";
        if (currentBranch === version) {
            await execCommand(`git pull ${base} ${version} --rebase`, path);
            console.log(`pull rebase of ${version} in ${path}`);
            return;
        }
        await execCommand(`git rebase ${base}/${version}`, path);
        await execCommand(`git push ${dev} ${currentBranch} ${forceFlag}`, path);
        console.log(`Push to ${currentBranch} in ${path}`);
    } catch (err: any) {
        console.log("Error [pushBranch]", path, err);
        throw new Error(`Push failed in ${path}: ${err.stderr || err.error?.message || err.message}`);
    }
}

async function hasWorkingTreeChanges(repoPath: string): Promise<boolean> {
    try {
        const { stdout } = await execGitCommand(["status", "--porcelain"], repoPath);
        return stdout.trim().length > 0;
    } catch (err) {
        console.log("Error [hasWorkingTreeChanges]", repoPath, err);
        return false;
    }
}

export async function commitChanges(repo: Repo, commitMessage: string): Promise<boolean> {
    const {path} = repo;
    const message = (commitMessage || "").trim();

    if (!message) {
        throw new Error("Commit message is required.");
    }

    try {
        const hasChanges = await hasWorkingTreeChanges(path);
        if (!hasChanges) {
            console.log(`No changes to commit in ${path}`);
            return false;
        }

        await execGitCommand(["add", "-A"], path);
        await execGitCommand(["commit", "-m", message], path);
        console.log(`Committed changes in ${path}`);
        return true;
    } catch (err: any) {
        console.log("Error [commitChanges]", path, err);
        throw new Error(`Commit failed in ${path}: ${err.stderr || err.error?.message || err.message}`);
    }
}

export async function amendCommit(repo: Repo, commitMessage?: string): Promise<boolean> {
    const {path} = repo;
    const message = (commitMessage || "").trim();

    try {
        const hasChanges = await hasWorkingTreeChanges(path);
        if (!hasChanges && !message) {
            console.log(`No changes to amend in ${path}`);
            return false;
        }

        if (hasChanges) {
            await execGitCommand(["add", "-A"], path);
        }

        const commitArgs = ["commit", "--amend"];
        if (message) {
            commitArgs.push("-m", message);
        } else {
            commitArgs.push("--no-edit");
        }
        await execGitCommand(commitArgs, path);
        console.log(`Amended commit in ${path}`);
        return true;
    } catch (err: any) {
        console.log("Error [amendCommit]", path, err);
        throw new Error(`Amend failed in ${path}: ${err.stderr || err.error?.message || err.message}`);
    }
}

export async function hasDiff(repo: Repo): Promise<boolean> {
    const {path} = repo;
    try {
        const { stdout: diffStdout } = await execCommand("git diff --shortstat", path);
        const { stdout: commitsStdout } = await execCommand("git log @{u}..HEAD --oneline", path).catch(() => ({stdout: "no tracking"}));
        
        return diffStdout.trim().length > 0 || (commitsStdout.trim().length > 0 && commitsStdout !== "no tracking");
    } catch (err) {
        console.log("Error [hasDiff]", path, err);
        return false;
    }
}
