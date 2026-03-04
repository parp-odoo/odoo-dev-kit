const { Component, xml } = owl;

export class Input extends Component {
    static props = {
        type: String,              // text | checkbox | select
        value: { optional: true },
        options: { optional: true },
        placeholder: { optional: true },
        onChange: { optional: true },
        name: { optional: true },
        disabled: { optional: true },
        label: { optional: true },
    };

    get isText() {
        return this.props.type === "text";
    }

    get isCheckbox() {
        return this.props.type === "checkbox";
    }

    get isSelect() {
        return this.props.type === "select";
    }

    handleChange(ev) {
        const value = this.isCheckbox ? ev.target.checked : ev.target.value;
        this.props.onChange && this.props.onChange(value);
    }

    static template = xml`
        <div class="o-input-wrapper">
            <t t-if="props.label">
                <label class="o-input-label">
                    <t t-esc="props.label"/>
                </label>
            </t>

            <t t-if="isText">
                <input
                    class="o-input"
                    type="text"
                    t-att-name="props.name"
                    t-att-value="props.value"
                    t-att-placeholder="props.placeholder"
                    t-att-disabled="props.disabled"
                    t-on-input="handleChange"
                />
            </t>

            <t t-elif="isCheckbox">
                <label class="o-checkbox-container">
                    <input
                        type="checkbox"
                        t-att-checked="props.value"
                        t-on-change="handleChange"
                    />
                    <span class="o-checkmark"></span>
                </label>
            </t>

            <t t-elif="isSelect">
                <select
                    class="o-input"
                    t-att-name="props.name"
                    t-att-disabled="props.disabled"
                    t-on-change="handleChange"
                >
                    <t t-foreach="props.options || []" t-as="opt" t-key="opt.value">
                        <option
                            t-att-value="opt.value"
                            t-att-selected="opt.value === props.value"
                        >
                            <t t-esc="opt.label"/>
                        </option>
                    </t>
                </select>
            </t>
        </div>
    `;
}
