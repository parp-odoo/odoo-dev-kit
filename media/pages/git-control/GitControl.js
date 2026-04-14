import { Input } from "../../components/input.js";
import { Accordion } from "../../components/accordion.js";
import { createGitControlState, removeHistoryEntry } from "./state.js";
import { clonePlainState } from "../../utils/general-utils.js";

const { Component, xml, useState, useEffect } = owl;

export class GitControl extends Component {
    static components = { Input, Accordion };

    setup() {
        this.vscode = this.props.vscode;
        const savedState = this.vscode.getState() || {};

        this.state = useState(createGitControlState(savedState));

        useEffect(
            () => {
                const prev = this.props.vscode.getState() || {};
                const next = {
                    ...prev,
                    gitHistory: this.state.history,
                    gitPaths: this.state.gitPaths,
                    gitCommitMessage: this.state.commitMessage,
                };
                const plain = clonePlainState(next);
                this.props.vscode.setState(plain);
                this.props.vscode.postMessage({
                    command: "persistState",
                    state: plain,
                });
            },
            () => [JSON.stringify(this.state.history), JSON.stringify(this.state.gitPaths), this.state.commitMessage]
        );

        useEffect(
            () => {
                const handler = event => {
                    const message = event.data;
                    if (!message) {
                        return;
                    }
                    const {command, state} = message;
                    if (command === "restoreState" && state) {
                        if (state.gitHistory) {
                            this.state.history = state.gitHistory;
                        }
                        if (typeof state.gitCommitMessage === "string") {
                            this.state.commitMessage = state.gitCommitMessage;
                        }
                        if (message.clearBranchInput) {
                            this.state.branchName = "";
                        }
                    }
                    if (command === "gitOperationStart") {
                        this.state.loading = true;
                    }
                    if (command === "gitOperationEnd") {
                        this.state.loading = false;
                    }
                };
                window.addEventListener("message", handler);
                return () => window.removeEventListener("message", handler);
            },
            () => []
        );
    }

    addGitPath() {
        this.state.gitPaths.push({ id: Date.now(), path: "", base: "", dev: "" });
    }

    removeGitPath(id) {
        this.state.gitPaths = this.state.gitPaths.filter(p => p.id !== id);
    }

    updateGitRepo(id, keyName, val) {
        const record = this.state.gitPaths.find(p => p.id === id);
        if (record) {
            record[keyName] = val;
        }
    }

    updateCommitMessage(value) {
        this.state.commitMessage = value;
        if (this.state.commitValidation) {
            this.state.commitValidation = "";
        }
    }

    gitAction(action, opts = {}) {
        const message = {
            command: "gitCommand",
            action,
            ...opts
        };
        if (action === "removeHistory") {
            const {version, branch} = opts;
            removeHistoryEntry(this.state.history, version, branch);
        }
        if (action === "newBranch" || (action === "checkout" && !opts.branch)) {
            const branch = (this.state.branchName || "").trim();
            if (!branch) {
                this.vscode.postMessage({ command: "showWarning", text: "Please enter a branch name." });
                return;
            }
            message.branch = branch;
        }
        this.vscode.postMessage(message);
    }

    runCommitAction(amend = false) {
        const commitMessage = (this.state.commitMessage || "").trim();
        if (!amend && !commitMessage) {
            this.state.commitValidation = "Commit message is required.";
            this.vscode.postMessage({
                command: "showWarning",
                text: "Please enter a commit message.",
            });
            return;
        }

        this.state.commitValidation = "";
        this.gitAction(amend ? "commitAmend" : "commit", {
            commitMessage: commitMessage || undefined,
        });
    }

    get versions() {
        return Object.keys(this.state.history).sort().reverse();
    }

    get repoCount() {
        return this.state.gitPaths.filter(p => p.path.trim()).length;
    }

    static template = xml`
        <div class="git-container">
            <!-- Loading bar -->
            <div t-if="state.loading" class="git-loading-bar">
                <div class="git-loading-progress"/>
            </div>

            <div class="main-title">Git Control</div>

            <!-- Checkout input -->
            <div class="section-title">Checkout Branch</div>
            <div style="display: flex; gap: 8px; margin-bottom: 16px;">
                <div style="flex-grow: 1;">
                    <Input type="'text'" value="state.branchName"
                        placeholder="'e.g. 16.0-my-fix'"
                        onChange="(val) => this.state.branchName = val" />
                </div>
                <button class="icon-btn primary-btn" t-att-disabled="state.loading"
                    t-on-click="() => this.gitAction('checkout')" title="Checkout branch">
                    <i class="codicon codicon-check"/>
                </button>
            </div>

            <!-- Action buttons — all in one row, short labels -->
            <div class="git-actions-row">
                <button class="git-action-btn" t-att-disabled="state.loading"
                    t-on-click="() => this.gitAction('remoteUpdate')" title="Fetch all remotes">
                    <i class="codicon codicon-sync"/> Fetch
                </button>
                <button class="git-action-btn" t-att-disabled="state.loading"
                    t-on-click="() => this.gitAction('newBranch')" title="Create new branch from current state">
                    <i class="codicon codicon-git-branch"/> Branch
                </button>
                <button class="git-action-btn" t-att-disabled="state.loading"
                    t-on-click="() => this.gitAction('push')" title="Push to remote">
                    <i class="codicon codicon-cloud-upload"/> Push
                </button>
                <button class="git-action-btn git-action-danger" t-att-disabled="state.loading"
                    t-on-click="() => this.gitAction('forcePush')" title="Force push to remote">
                    <i class="codicon codicon-warning"/> Force
                </button>
            </div>

            <Accordion title="'Commit Message'">
                <textarea
                    class="commit-msg-input"
                    t-att-disabled="state.loading"
                    t-att-value="state.commitMessage"
                    placeholder="Write commit message..."
                    t-on-input="(ev) => this.updateCommitMessage(ev.target.value)"
                />
                <div t-if="state.commitValidation" class="field-error" t-out="state.commitValidation" />
                <div class="commit-actions-row">
                    <button class="git-action-btn" t-att-disabled="state.loading"
                        t-on-click="() => this.runCommitAction(false)" title="Commit current diff">
                        <i class="codicon codicon-git-commit"/> Commit
                    </button>
                    <button class="git-action-btn " t-att-disabled="state.loading"
                        t-on-click="() => this.runCommitAction(true)" title="Amend latest commit with current diff">
                        <i class="codicon codicon-edit"/> Amend
                    </button>
                </div>
            </Accordion>

            <!-- Checkout history -->
            <t t-if="versions.length">
                <div class="section-title">Checkout History</div>
                <div class="accordion-group">
                    <Accordion
                        t-foreach="versions"
                        t-as="version"
                        t-key="version"
                        title="version"
                        info="' (' + state.history[version].length + ')'"
                    >
                        <div class="history-list">
                            <t t-foreach="state.history[version]" t-as="branch" t-key="branch">
                                <div class="history-item">
                                    <span class="branch-name" t-out="branch"/>
                                    <div class="history-actions">
                                        <button class="icon-btn" t-att-disabled="state.loading"
                                            t-on-click="() => this.gitAction('checkout', {branch})"
                                            title="Checkout">
                                            <i class="codicon codicon-check"/>
                                        </button>
                                        <button class="icon-btn danger-btn"
                                            t-on-click="() => this.gitAction('removeHistory', {version, branch})"
                                            title="Remove from history">
                                            <i class="codicon codicon-trash"/>
                                        </button>
                                    </div>
                                </div>
                            </t>
                        </div>
                    </Accordion>
                </div>
            </t>

            <!-- Git Repositories config (accordion, at the bottom) -->
            <div style="margin-top: 20px;">
                <Accordion title="'Git Repositories'" info="' (' + repoCount + ')'">
                    <div class="addons-list" style="padding-top: 8px;">
                        <t t-foreach="state.gitPaths" t-as="gitPath" t-key="gitPath.id">
                            <div class="addon-row" style="grid-template-columns: 1fr auto;">
                                <Input type="'text'" value="gitPath.path"
                                    placeholder="'/absolute/path/to/repo'"
                                    onChange="(val) => this.updateGitRepo(gitPath.id, 'path', val)" />
                                <button class="delete-btn" title="Remove"
                                    t-on-click="() => this.removeGitPath(gitPath.id)">
                                    <i class="codicon codicon-trash"/>
                                </button>
                            </div>
                            <div class="repo-remote">
                                Remote
                                <Input type="'text'" value="gitPath.base"
                                    placeholder="'base remote (odoo)'"
                                    onChange="(val) => this.updateGitRepo(gitPath.id, 'base', val)" />
                                <Input type="'text'" value="gitPath.dev"
                                    placeholder="'dev remote (odoo-dev)'"
                                    onChange="(val) => this.updateGitRepo(gitPath.id, 'dev', val)" />
                            </div>
                        </t>
                        <button class="add-btn" style="margin-top: 6px;" t-on-click="addGitPath" title="Add repo path">
                            <i class="codicon codicon-add"/> Add Path
                        </button>
                    </div>
                </Accordion>
            </div>
        </div>
    `;
}
