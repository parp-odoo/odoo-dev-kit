import { Input } from "../components/input.js";
import { Accordion } from "../components/accordion.js";

const { Component, xml, useState, useEffect } = owl;

export class GitControl extends Component {
    static components = { Input, Accordion };

    setup() {
        const savedState = this.props.vscode.getState() || {};

        this.state = useState({
            branchName: "",
            history: savedState.gitHistory || {},
            gitPaths: savedState.gitPaths || [{ id: Date.now(), path: "" }],
            loading: false,
        });

        useEffect(
            () => {
                const prev = this.props.vscode.getState() || {};
                const next = {
                    ...prev,
                    gitHistory: this.state.history,
                    gitPaths: this.state.gitPaths,
                };
                const plain = JSON.parse(JSON.stringify(next));
                this.props.vscode.setState(plain);
                this.props.vscode.postMessage({
                    command: "persistState",
                    state: plain,
                });
            },
            () => [JSON.stringify(this.state.history), JSON.stringify(this.state.gitPaths)]
        );

        // Listen for messages from extension backend
        useEffect(
            () => {
                const handler = event => {
                    const message = event.data;
                    if (message?.command === "restoreState" && message.state) {
                        if (message.state.gitHistory !== undefined) {
                            this.state.history = message.state.gitHistory || {};
                        }
                        // Clear the branch input only once checkout + history update is done
                        if (message.clearBranchInput) {
                            this.state.branchName = "";
                        }
                    }
                    if (message?.command === "gitOperationStart") {
                        this.state.loading = true;
                    }
                    if (message?.command === "gitOperationEnd") {
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
        this.state.gitPaths.push({ id: Date.now(), path: "" });
    }

    removeGitPath(id) {
        this.state.gitPaths = this.state.gitPaths.filter(p => p.id !== id);
    }

    updateGitPath(id, val) {
        const record = this.state.gitPaths.find(p => p.id === id);
        if (record) { record.path = val; }
    }

    checkoutBranch() {
        const branch = (this.state.branchName || "").trim();
        if (!branch) {
            this.props.vscode.postMessage({ command: "showWarning", text: "Please enter a branch name." });
            return;
        }
        // Don't clear branchName here — it will be cleared by the backend's clearBranchInput signal
        this.props.vscode.postMessage({ command: "gitCommand", action: "checkout", branch });
    }

    checkoutHistoryItem(branch) {
        this.props.vscode.postMessage({ command: "gitCommand", action: "checkout", branch });
    }

    removeHistoryItem(version, branch) {
        this.props.vscode.postMessage({ command: "gitCommand", action: "removeHistory", version, branch });
        if (this.state.history[version]) {
            this.state.history[version] = this.state.history[version].filter(b => b !== branch);
            if (this.state.history[version].length === 0) {
                delete this.state.history[version];
            }
        }
    }

    remoteUpdate() { this.props.vscode.postMessage({ command: "gitCommand", action: "remoteUpdate" }); }
    newBranch() {
        const branch = (this.state.branchName || "").trim();
        if (!branch) {
            this.props.vscode.postMessage({ command: "showWarning", text: "Please enter a branch name to use for the new branch." });
            return;
        }
        this.props.vscode.postMessage({ command: "gitCommand", action: "newBranch", branch });
    }
    push()         { this.props.vscode.postMessage({ command: "gitCommand", action: "push" }); }
    forcePush()    { this.props.vscode.postMessage({ command: "gitCommand", action: "forcePush" }); }

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
                    t-on-click="checkoutBranch" title="Checkout branch">
                    <i class="codicon codicon-check"/>
                </button>
            </div>

            <!-- Action buttons — all in one row, short labels -->
            <div class="git-actions-row">
                <button class="git-action-btn" t-att-disabled="state.loading"
                    t-on-click="remoteUpdate" title="Fetch all remotes">
                    <i class="codicon codicon-sync"/> Fetch
                </button>
                <button class="git-action-btn" t-att-disabled="state.loading"
                    t-on-click="newBranch" title="Create new branch from current state">
                    <i class="codicon codicon-git-branch"/> Branch
                </button>
                <button class="git-action-btn" t-att-disabled="state.loading"
                    t-on-click="push" title="Push to remote">
                    <i class="codicon codicon-cloud-upload"/> Push
                </button>
                <button class="git-action-btn git-action-danger" t-att-disabled="state.loading"
                    t-on-click="forcePush" title="Force push to remote">
                    <i class="codicon codicon-warning"/> Force
                </button>
            </div>

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
                                            t-on-click="() => this.checkoutHistoryItem(branch)"
                                            title="Checkout">
                                            <i class="codicon codicon-check"/>
                                        </button>
                                        <button class="icon-btn danger-btn"
                                            t-on-click="() => this.removeHistoryItem(version, branch)"
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
                                    onChange="(val) => this.updateGitPath(gitPath.id, val)" />
                                <button class="delete-btn" title="Remove"
                                    t-on-click="() => this.removeGitPath(gitPath.id)">
                                    <i class="codicon codicon-trash"/>
                                </button>
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
