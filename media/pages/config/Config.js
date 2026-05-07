import { Accordion } from "../../components/accordion.js";
import { Input } from "../../components/input.js";
import { cliOptions } from "../../utils/cli-options.js";
import { clonePlainState } from "../../utils/general-utils.js";
import { getInitialConfigState, countActiveOptions } from "./state.js";

const { Component, xml, useState, useEffect } = owl;

function stripOptionalQuotes(value) {
	const str = String(value || "").trim();
	if (
		(str.startsWith('"') && str.endsWith('"')) ||
		(str.startsWith("'") && str.endsWith("'"))
	) {
		return str.slice(1, -1).trim();
	}
	return str;
}

function normalizePath(value) {
	return stripOptionalQuotes(value).replace(/\\/g, "/").replace(/\/+$/g, "");
}

function joinPath(root, segment) {
	const sep = root.includes("\\") ? "\\" : "/";
	const cleanedRoot = String(root || "").replace(/[\\/]+$/g, "");
	return `${cleanedRoot}${sep}${segment}`;
}

function resolveOdooRootFromBinPath(odooBinPath) {
	const raw = stripOptionalQuotes(odooBinPath);
	if (!raw || raw === "odoo-bin") {
		return "";
	}
	// Only auto-detect when an absolute-ish path is provided.
	if (!/[\\/]/.test(raw)) {
		return "";
	}
	return raw.replace(/[\\/][^\\/]*$/g, "");
}

export class Config extends Component {
	static components = { Accordion, Input };

	setup() {
		this.cliOptions = cliOptions;

		const savedState = this.props.vscode.getState();

		this.state = useState({
			config: getInitialConfigState(savedState),
		});

		useEffect(
			() => {
				const odooRoot = resolveOdooRootFromBinPath(this.state.config.odooBinPath);
				if (!odooRoot) {
					return;
				}

				const communityAddonsPath = joinPath(odooRoot, "addons");
				const normalizedCommunity = normalizePath(communityAddonsPath);

				let didChange = false;

				// Auto-populate "community" addons path
				const addons = this.state.config.addons || [];
				const communityRecord = addons.find(a => {
					const name = String(a?.name || "").trim().toLowerCase();
					const path = normalizePath(a?.path || "");
					return name === "community" || path === normalizedCommunity;
				});

				if (communityRecord) {
					if (normalizePath(communityRecord.path) !== normalizedCommunity) {
						communityRecord.path = communityAddonsPath;
						didChange = true;
					}
					if (!String(communityRecord.name || "").trim()) {
						communityRecord.name = "community";
						didChange = true;
					}
					if (communityRecord.enabled === false) {
						communityRecord.enabled = true;
						didChange = true;
					}
				} else {
					const emptyRecord = addons.find(
						a => !String(a?.name || "").trim() && !String(a?.path || "").trim(),
					);
					if (emptyRecord) {
						emptyRecord.name = "community";
						emptyRecord.path = communityAddonsPath;
						emptyRecord.enabled = true;
					} else {
						addons.unshift({
							id: Date.now(),
							name: "community",
							path: communityAddonsPath,
							enabled: true,
						});
					}
					didChange = true;
				}

				// Auto-add repo to Git Repositories list (base: odoo, dev: odoo-dev)
				const prev = this.props.vscode.getState() || {};
				const gitPaths = Array.isArray(prev.gitPaths) ? [...prev.gitPaths] : [];
				const normalizedRoot = normalizePath(odooRoot);
				const existingRepo = gitPaths.find(
					gp => normalizePath(gp?.path || "") === normalizedRoot,
				);

				if (existingRepo) {
					let didUpdateRepo = false;
					if (!String(existingRepo.base || "").trim()) {
						existingRepo.base = "odoo";
						didUpdateRepo = true;
					}
					if (!String(existingRepo.dev || "").trim()) {
						existingRepo.dev = "odoo-dev";
						didUpdateRepo = true;
					}
					if (didUpdateRepo) {
						const next = { ...prev, gitPaths };
						const plain = clonePlainState(next);
						this.props.vscode.setState(plain);
						this.props.vscode.postMessage({
							command: "persistState",
							state: plain,
						});
					}
				} else {
					const emptyGp = gitPaths.find(gp => !String(gp?.path || "").trim());
					if (emptyGp) {
						emptyGp.path = odooRoot;
						emptyGp.base = emptyGp.base || "odoo";
						emptyGp.dev = emptyGp.dev || "odoo-dev";
					} else {
						gitPaths.push({
							id: Date.now(),
							path: odooRoot,
							base: "odoo",
							dev: "odoo-dev",
						});
					}
					const next = { ...prev, gitPaths };
					const plain = clonePlainState(next);
					this.props.vscode.setState(plain);
					this.props.vscode.postMessage({
						command: "persistState",
						state: plain,
					});
				}

				if (didChange) {
					// Trigger persist effect
					this.state.config.addons = [...addons];
				}
			},
			() => [this.state.config.odooBinPath],
		);

		useEffect(
			() => {
				const prev = this.props.vscode.getState() || {};
				const next = {
					...prev,
					config: this.state.config,
				};
				const plain = clonePlainState(next);
				this.props.vscode.setState(plain);
				this.props.vscode.postMessage({
					command: "persistState",
					state: plain,
				});
			},
			() => [JSON.stringify(this.state.config)],
		);
	}

	addPath() {
		this.state.config.addons.push({
			id: Date.now(),
			name: "",
			path: "",
			enabled: true,
		});
	}

	removePath(id) {
		this.state.config.addons = this.state.config.addons.filter(a => a.id !== id);
	}

	updateAddon(id, field, value) {
		const record = this.state.config.addons.find(a => a.id === id);
		if (record) {
			record[field] = value;
		}
	}

	toggleCliOption(group, option, value) {
		const groupName = group.groupName;

		this.state.config.cliOptions = {
			...this.state.config.cliOptions,
			[groupName]: {
				...(this.state.config.cliOptions[groupName] || {}),
				[option.name]: value,
			},
		};
	}

	getCountStatus(groupName) {
		return countActiveOptions(this.cliOptions, this.state.config.cliOptions, groupName);
	}

	static template = xml`
        <div class="config-container">
            <div class="main-title">Server Configuration</div>

            <div class="section-title">Environment</div>
            <div class="options-list">
                <div class="option-row">
                    <div class="cli-key">Auto-detect DB name</div>
                    <div class="cli-input">
                        <Input
                            type="'checkbox'"
                            value="state.config.autoDetectDbName !== false"
                            onChange="(val) => this.state.config.autoDetectDbName = val"
                        />
                    </div>
                </div>
                <div class="option-row">
                    <div class="cli-key">Python venv</div>
                    <div class="cli-input">
                        <Input type="'text'" value="state.config.pythonVenv" placeholder="'/path/to/venv'"
                            onChange="(val) => this.state.config.pythonVenv = val" />
                    </div>
                </div>
                <div class="option-row">
                    <div class="cli-key">Odoo bin</div>
                    <div class="cli-input">
                        <Input type="'text'" value="state.config.odooBinPath" placeholder="'/path/to/odoo-bin'"
                            onChange="(val) => this.state.config.odooBinPath = val" />
                    </div>
                </div>
            </div>

            <div class="section-title">
                <span>Addons Paths</span>
                <button class="add-btn" t-on-click="addPath" title="Add Addons Path">
                    <i class="codicon codicon-add"></i>
                </button>
            </div>

            <div class="addons-list">
                <t t-foreach="state.config.addons" t-as="addon" t-key="addon.id">
                    <div class="addon-row">
                        <Input type="'text'" value="addon.name" placeholder="'Addon Name'"
                            onChange="(val) => this.updateAddon(addon.id, 'name', val)" />

                        <Input type="'text'" value="addon.path" placeholder="'/home/user/odoo/custom_addons'"
                            onChange="(val) => this.updateAddon(addon.id, 'path', val)" />

                        <button class="delete-btn" title="Delete"
                            t-on-click="() => this.removePath(addon.id)">
                            <i class="codicon codicon-trash"/>
                        </button>
                    </div>
                </t>
            </div>

            <div class="section-title">Cli Options</div>

            <Accordion
                class="cli-group"
                t-foreach="cliOptions"
                t-as="group"
                t-key="group.groupName"
                title="group.groupName"
                info="this.getCountStatus(group.groupName)"
            >
                <div class="options-grid">
                    <t t-foreach="group.options" t-as="option" t-key="option.name">
                        <t t-set="isEnable"
                           t-value="state.config.cliOptions[group.groupName] and state.config.cliOptions[group.groupName][option.name]" />

                        <div class="option-card"
                             t-att-title="option.description"
                             t-on-click="() => this.toggleCliOption(group, option, !isEnable)">

                            <Input type="'checkbox'" value="isEnable"/>

                            <span class="option-label" t-out="option.name"/>
                        </div>
                    </t>
                </div>
            </Accordion>
        </div>
    `;
}
