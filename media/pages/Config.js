import { Accordion } from "../components/accordion.js";
import { Input } from "../components/input.js";
import { cliOptions } from "../utils/cli-options.js";

const { Component, xml, useState, useEffect } = owl;

export class Config extends Component {
	static components = { Accordion, Input };

	setup() {
		this.cliOptions = cliOptions;
		this.state = useState({
			config: { ...this.initalConfigState },
		});
		useEffect(
			() => {
				localStorage.setItem("odoo-dev-kit-config", JSON.stringify(this.state.config));
			},
			() => [JSON.stringify(this.state.config)],
		);
	}

	get initalConfigState() {
		const storedConfig = localStorage.getItem("odoo-dev-kit-config");
		let configState = {
			addons: [{ id: 1, name: "", path: "", versionChange: false }],
			cliOptions: {},
		};
		try {
			if (storedConfig) {
				configState = { ...configState, ...JSON.parse(storedConfig) };
			}
		} catch {}
		return configState;
	}

	addPath() {
		this.state.config.addons.push({
			id: Date.now(),
			name: "",
			path: "",
			versionChange: false,
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
		const total = this.cliOptions.find(group => group.groupName === groupName).options.length;
		const active = Object.values(this.state.config.cliOptions[groupName] || {}).filter(
			Boolean,
		).length;
		return ` (${active}/${total})`;
	}

	static template = xml`
        <div class="config-container">
            <div class="main-title">Server Configuration</div>
            <div class="section-title">
                <span>Addons Paths</span>
                <button class="add-btn" t-on-click="addPath" title="Add Addons Path">
                    <i class="codicon codicon-add"></i>
                </button>
            </div>
            <div class="addons-list">
                <t t-foreach="state.config.addons" t-as="addon" t-key="addon.id">
                    <div class="addon-row">
                        <Input type="'text'" value="addon.name" placeholder="'Addon Name'" onChange="(val) => this.updateAddon(addon.id, 'name', val)" />
                        <Input type="'text'" value="addon.path" placeholder="'/home/user/odoo/custom_addons'" onChange="(val) => this.updateAddon(addon.id, 'path', val)" />
                        <Input type="'checkbox'" value="addon.versionChange" onChange="(val) => this.updateAddon(addon.id, 'versionChange', val)" />
                        <button class="delete-btn" title="Delete" t-on-click="() => this.removePath(addon.id)">
                            <i class="codicon codicon-trash" />
                        </button>
                    </div>
                </t>
            </div>

            <div class="section-title">Cli Options</div>
            <Accordion class="cli-group" t-foreach="cliOptions" t-as="group" t-key="group.groupName" title="group.groupName" info="this.getCountStatus(group.groupName)">
                <div class="options-grid">
                    <t t-foreach="group.options" t-as="option" t-key="option.name">
                        <t t-set="isEnable" t-value="state.config.cliOptions[group.groupName] and state.config.cliOptions[group.groupName][option.name]" />
                        <div class="option-card" t-att-title="option.description" t-on-click="() => this.toggleCliOption(group, option, !isEnable)">
                            <Input type="'checkbox'" value="isEnable" />
                            <span class="option-label" t-out="option.name" />
                        </div>
                    </t>
                </div>
            </Accordion>
        </div>
	`;
}
