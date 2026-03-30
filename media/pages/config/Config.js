import { Accordion } from "../../components/accordion.js";
import { Input } from "../../components/input.js";
import { cliOptions } from "../../utils/cli-options.js";
import { clonePlainState } from "../../utils/general-utils.js";
import {
    getInitialConfigState,
    countActiveOptions,
} from "./state.js";

const { Component, xml, useState, useEffect } = owl;

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
            () => [JSON.stringify(this.state.config)]
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
