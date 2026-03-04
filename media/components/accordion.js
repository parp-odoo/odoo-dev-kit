const { Component, xml, useState } = owl;

export class Accordion extends Component {
    static props = {
        title: String,
        info: {type: String, optional: true},
    };

    setup() {
        this.state = useState({
            hidden: true,
        });
    }

    toggleAccordion() {
        this.state.hidden = !this.state.hidden;
    }

    static template = xml`
        <div class="accordion">
            <div class="accordion-header" t-on-click="toggleAccordion">
                <span class="accordion-title" t-esc="props.title" />
                <div class="accordion-right">
                    <span t-if="props.info" t-out="props.info" />
                    <i class="codicon" t-att-class="state.hidden ? 'codicon-chevron-right' : 'codicon-chevron-down'" />
                </div>
            </div>

            <div class="accordion-body" t-att-class="state.hidden ? 'collapsed' : ''">
                <t t-slot="default" />
            </div>
        </div>
    `;
}
