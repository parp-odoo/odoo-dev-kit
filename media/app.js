import { Server } from "./pages/Server.js";
import { Config } from "./pages/Config.js";

const { Component, useState, useEffect, mount, xml } = owl;

class App extends Component {
    static components = { Server, Config };
    static template = xml`
        <div class="page-list">
            <t t-foreach="pages" t-as="page" t-key="page.name">
                <t t-set="active" t-value="page.name === state.activePage" />
                <div
                    t-attf-class="page-btn {{page.name === state.activePage ? 'active' : ''}}"
                    t-on-click="() => this.selectPage(page)"
                    t-att-title="page.title"
                >
                    <i t-attf-class="codicon {{page.icon}}"/>
                    <span t-if="active" t-out="page.name"/>
                </div>
            </t>
        </div>
        <t t-component="activeComponent" />
    `;

    setup() {
        this.vscode = acquireVsCodeApi();

        this.state = useState({
            activePage: localStorage.getItem("activePage") || this.pages[1].name,
        });
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
        ];
    }

    get activeComponent() {
        return this.pages.find((pg) => pg.name === this.state.activePage).component;
    }

    selectPage(page) {
        this.state.activePage = page.name;
    }
}

mount(App, document.body);
