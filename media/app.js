import { Server } from "./pages/Server.js";
import { Config } from "./pages/Config.js";
import { GitControl } from "./pages/GitControl.js";

const { Component, useState, useEffect, mount, xml } = owl;
const vscode = acquireVsCodeApi();

function requestPersistedState(timeoutMs = 1000) {
    const existing = vscode.getState();
    if (existing) {
        return Promise.resolve(existing);
    }
    return new Promise(resolve => {
        let settled = false;
        const handler = event => {
            const message = event.data;
            if (message?.command !== "restoreState") {
                return;
            }
            if (settled) {
                return;
            }
            settled = true;
            window.removeEventListener("message", handler);
            resolve(message.state || null);
        };
        setTimeout(() => {
            if (settled) {
                return;
            }
            settled = true;
            window.removeEventListener("message", handler);
            resolve(null);
        }, timeoutMs);
        window.addEventListener("message", handler);
        vscode.postMessage({ command: "requestState" });
    });
}

function toPlainState(state) {
    try {
        return JSON.parse(JSON.stringify(state));
    } catch {
        return null;
    }
}

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
                const plain = toPlainState(next) || next;
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
    const persistedState = await requestPersistedState();
    if (persistedState) {
        vscode.setState(persistedState);
    }
    mount(App, document.body);
})();
