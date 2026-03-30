import { Server } from "./pages/server/Server.js";
import { Config } from "./pages/config/Config.js";
import { GitControl } from "./pages/git-control/GitControl.js";
import { requestPersistedState } from "./utils/persistedState.js";
import { clonePlainState } from "./utils/general-utils.js";

const { Component, useState, useEffect, mount, xml } = owl;
const vscode = acquireVsCodeApi();

class App extends Component {
    static components = { Server, Config, GitControl };
    static template = xml`
        <div class="page-list">
            <t t-foreach="pages" t-as="page" t-key="page.name">
                <t t-set="active" t-value="page.name === state.activePage" />
                <div
                    t-attf-class="page-btn {{active ? 'active' : ''}}"
                    t-on-click="() => this.selectPage(page)"
                    t-att-title="page.title"
                >
                    <i t-attf-class="codicon {{page.icon}}"/>
                    <span t-out="page.name"/>
                </div>
            </t>
        </div>
        <t t-component="activeComponent" vscode="vscode" />
    `;

    setup() {
        this.vscode = vscode;
        const savedState = this.vscode.getState();

        this.state = useState({
            activePage: savedState?.activePage || this.pages[0].name,
        });

        useEffect(
            () => {
                const prev = this.vscode.getState() || {};
                const next = { ...prev, activePage: this.state.activePage };
                const plain = clonePlainState(next) || next;
                this.vscode.setState(plain);
                this.vscode.postMessage({
                    command: "persistState",
                    state: plain,
                });
            },
            () => [this.state.activePage]
        );
    }

    get pages() {
        return [
            {
                name: "Server",
                title: "Start Server",
                icon: "codicon-run",
                component: Server,
            },
            {
                name: "Config",
                title: "Update Configurations",
                icon: "codicon-settings",
                component: Config,
            },
            {
                name: "Git",
                title: "Git Control",
                icon: "codicon-source-control",
                component: GitControl,
            },
        ];
    }

    get activeComponent() {
        return this.pages.find(pg => pg.name === this.state.activePage).component;
    }

    selectPage(page) {
        this.state.activePage = page.name;
    }
}

(async () => {
    const persistedState = await requestPersistedState(vscode);
    if (persistedState) {
        vscode.setState(persistedState);
    }
    mount(App, document.body);
})();
