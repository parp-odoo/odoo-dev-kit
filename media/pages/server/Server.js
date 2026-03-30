import { Input } from "../../components/input.js";
import { Accordion } from "../../components/accordion.js";
import { cliOptions } from "../../utils/cli-options.js";
import {
    formatValue,
    getFirstAddonPath,
    getValidAddons,
    getEnabledAddons,
    getEnabledOptionsList,
    getRunCommand,
    validateRunConfiguration,
    getDropDbCommand,
} from "./command-builder.js";
import { createServerState } from "./state.js";
import { clonePlainState } from "../../utils/general-utils.js";

const { Component, xml, useState, useEffect } = owl;

export class Server extends Component {
    static components = { Input, Accordion };

    setup() {
        this._dbRequestId = 0;
        this._lastAddonPath = "";
        this.cliOptions = cliOptions;
        this.vscode = this.props.vscode;

        const savedState = this.vscode.getState() || {};

        this.state = useState(createServerState(savedState));

        useEffect(
            () => {
                const prev = this.vscode.getState() || {};
                const next = {
                    ...prev,
                    params: this.state.params,
                    config: this.state.config,
                };
                const plain = clonePlainState(next);
                this.vscode.setState(plain);
                this.vscode.postMessage({
                    command: "persistState",
                    state: plain,
                });
            },
            () => [JSON.stringify(this.state.params), JSON.stringify(this.state.config)]
        );

        useEffect(
            () => {
                const handler = event => {
                    const message = event.data;
                    if (message?.command === "serverStatus") {
                        this.state.isRunning = !!message.running;
                    }
                    if (message?.command === "resolvedDbName") {
                        if (message.requestId !== this._dbRequestId) {
                            return;
                        }
                        const currentDb = (this.state.params.database || "").trim();
                        if (currentDb) {
                            return;
                        }
                        if (message.dbName) {
                            this.state.params.database = message.dbName;
                        }
                    }
                };
                window.addEventListener("message", handler);
                return () => window.removeEventListener("message", handler);
            },
            () => []
        );

        useEffect(
            () => {
                if (this.state.config.autoDetectDbName === false) {
                    return;
                }
                const currentDb = (this.state.params.database || "").trim();
                if (currentDb) {
                    return;
                }
                const addonPath = this.getFirstAddonPath();
                if (!addonPath || addonPath === this._lastAddonPath) {
                    return;
                }
                this._lastAddonPath = addonPath;
                const requestId = ++this._dbRequestId;
                this.vscode.postMessage({
                    command: "resolveDbNameFromAddon",
                    addonPath,
                    requestId,
                });
            },
            () => [JSON.stringify(this.state.config.addons), (this.state.params.database || "").trim()]
        );
    }

    getFirstAddonPath() {
        const addons = this.state.config.addons || [];
        for (const addon of addons) {
            const path = (addon.path || "").trim();
            if (path) {
                return path;
            }
        }
        return getFirstAddonPath(this.state.config.addons || []);
    }

    getEnabledOptions(group) {
        const enabled = this.state.config.cliOptions?.[group.groupName] || {};
        return group.options.filter(opt => enabled[opt.name]);
    }

    getValue(option) {
        return this.state.params[option.name] ?? (option.type === "boolean" ? false : "");
    }

    updateParam(option, value) {
        this.state.params[option.name] = value;
    }

    toggleAddonEnabled(addon, value) {
        const record = this.state.config.addons.find(a => a.id === addon.id);
        if (record) {
            record.enabled = !!value;
        }
    }

    getValidAddons() {
        return getValidAddons(this.state.config.addons || []);
    }

    getRunCommand() {
        return getRunCommand({
            cliOptions: this.cliOptions,
            config: this.state.config,
            params: this.state.params,
            runMode: this.state.runMode || "update",
        });
    }

    validateRunConfiguration() {
        return validateRunConfiguration(this.state.config, this.state.params);
    }

    getDropDbCommand() {
        return getDropDbCommand(this.state.params);
    }

    async copyRunCommand() {
        const command = this.getRunCommand();
        if (!command) {
            this.vscode.postMessage({
                command: "showMessage",
                text: "No command to copy. Configure options first.",
            });
            return;
        }
        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(command);
            } else {
                const textarea = document.createElement("textarea");
                textarea.value = command;
                textarea.style.position = "fixed";
                textarea.style.opacity = "0";
                document.body.appendChild(textarea);
                textarea.focus();
                textarea.select();
                document.execCommand("copy");
                document.body.removeChild(textarea);
            }
            this.vscode.postMessage({
                command: "showMessage",
                text: "Run command copied to clipboard.",
            });
        } catch {
            this.vscode.postMessage({
                command: "showMessage",
                text: "Failed to copy command.",
            });
        }
    }

    async runServer() {
        const validationErrors = this.validateRunConfiguration();
        if (validationErrors.length) {
            this.vscode.postMessage({
                command: "showWarning",
                text: `Cannot run server: ${validationErrors.join(" ")}`,
            });
            return;
        }
        this.state.runMode = "update";
        const command = this.getRunCommand();
        if (!command) {
            this.vscode.postMessage({
                command: "showMessage",
                text: "No command to run. Configure options first.",
            });
            return;
        }
        this.vscode.postMessage({
            command: "runCommand",
            text: command,
        });
        this.state.isRunning = true;
    }

    async dropDbAndRun() {
        const validationErrors = this.validateRunConfiguration();
        if (validationErrors.length) {
            this.vscode.postMessage({
                command: "showWarning",
                text: `Cannot run server: ${validationErrors.join(" ")}`,
            });
            return;
        }
        const dbName = (this.state.params.database || "").trim();
        if (!dbName) {
            this.vscode.postMessage({
                command: "showWarning",
                text: "Set a database name first.",
            });
            return;
        }
        this.state.runMode = "init";
        const runCommand = this.getRunCommand();
        const dropCommand = this.getDropDbCommand();
        if (!runCommand || !dropCommand) {
            this.vscode.postMessage({
                command: "showMessage",
                text: "No command to run. Configure options first.",
            });
            return;
        }
        this.vscode.postMessage({
            command: "runCommand",
            text: `${dropCommand} && ${runCommand}`,
        });
        this.state.isRunning = true;
    }

    async stopServer() {
        this.vscode.postMessage({
            command: "stopServer",
        });
        this.state.isRunning = false;
    }

    async dropDb() {
        const command = this.getDropDbCommand();
        const dbName = (this.state.params.database || "").trim();
        if (!command) {
            this.vscode.postMessage({
                command: "showWarning",
                text: "Set a database name first.",
            });
            return;
        }
        this.vscode.postMessage({
            command: "runDropDb",
            text: command,
            dbName,
        });
    }

    hasAnyEnabledCliOption() {
        const groups = Object.values(this.state.config.cliOptions || {});
        return groups.some(group =>
            Object.values(group || {}).some(Boolean)
        );
    }

    hasConfiguration() {
        const hasAddons = this.getValidAddons().length > 0;
        const hasCli = this.hasAnyEnabledCliOption();
        const hasEnv = (this.state.config.pythonVenv || "").trim() !== "" ||
            (this.state.config.odooBinPath || "").trim() !== "";
        return hasAddons || hasCli || hasEnv;
    }

    getInputTypeForOption(option) {
        const inputOptionTypeMap = {
            boolean: "checkbox",
            text: "text",
            number: "text",
            list: "text",
        };
        return inputOptionTypeMap[option.type] || "text";
    }

    static template = xml`
        <div class="server-container">
            <div class="main-title">Server Parameters</div>

            <div class="section-title">Actions</div>
            <div class="action-buttons">
                <button class="icon-btn primary-btn" t-on-click="runServer" title="Run server">
                    <i class="codicon codicon-debug-start"/>
                </button>
                <button class="icon-btn danger-btn" t-on-click="dropDbAndRun" title="Drop DB and run server">
                    <i class="codicon codicon-debug-restart"/>
                </button>
                <div class="action-right">
                    <button
                        t-att-class="state.isRunning ? 'icon-btn stop-btn active' : 'icon-btn stop-btn'"
                        t-att-disabled="!state.isRunning"
                        t-on-click="stopServer"
                        title="Stop server"
                    >
                        <i class="codicon codicon-debug-stop"/>
                    </button>
                    <span
                        t-att-class="state.isRunning ? 'running-indicator active' : 'running-indicator'"
                        title="Server running"
                    />
                </div>
            </div>

            <t t-if="!this.hasConfiguration()">
                <div class="empty-state">
                    No configuration found. Configure your environment, addons, or CLI options first.
                </div>
            </t>

            <t t-set="validAddons" t-value="this.getValidAddons()"/>
            <t t-if="validAddons.length">
                <div class="section-title">Configured Addons</div>
                <div class="options-grid">
                    <t t-foreach="validAddons" t-as="addon" t-key="addon.id">
                        <div class="option-card" t-att-title="addon.path || addon.name || ''">
                            <Input
                                type="'checkbox'"
                                value="addon.enabled !== false"
                                onChange="(val) => this.toggleAddonEnabled(addon, val)"
                            />
                            <span class="option-label" t-out="addon.name || addon.path || 'Unnamed addon'"/>
                        </div>
                    </t>
                </div>
            </t>

            <t t-foreach="cliOptions" t-as="group" t-key="group.groupName">
                <t t-set="options" t-value="this.getEnabledOptions(group)" />

                <div t-if="options.length" class="cli-group">
                    <div class="section-title" t-out="group.groupName"/>

                    <div class="options-list">
                        <div
                            t-foreach="options"
                            t-as="option"
                            t-key="option.name"
                            class="option-row"
                            t-att-title="option.description"
                        >
                            <div class="cli-key">
                                <span t-out="option.key"/>
                            </div>

                            <div class="cli-input">
                                <Input
                                    type="getInputTypeForOption(option)"
                                    value="this.getValue(option)"
                                    placeholder="option.name"
                                    onChange="(val) => this.updateParam(option, val)"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </t>

            <t t-if="this.hasConfiguration()">
                <div class="run-command-section">
                    <Accordion title="'Run Command'">
                        <div class="command-wrap">
                            <pre class="command-box" t-out="this.getRunCommand()"/>
                            <button class="copy-btn" t-on-click="copyRunCommand" title="Copy command">
                                <i class="codicon codicon-copy"/>
                            </button>
                        </div>
                    </Accordion>
                </div>
            </t>
        </div>
    `;
}
