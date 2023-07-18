import { createElementWithAttributes } from './helpers.js';

export function createFilterPane({ target, onChange }) {
    const list = createElementWithAttributes('div', { class: 'filter-pane-list' });

    target.appendChild(list);

    list.addEventListener('input', e => {
        const checks = list.getElementsByTagName('input');
        onChange(Array.from(checks).map(v => ({
            name: v.value,
            checked: !!v.checked,
        })));
    });

    function updateOptions(options) {
        list.replaceChildren(...options.map(({ checked, name, color }, i) => {
            let id = 'filter-pane-check-' + i;
            const check = createElementWithAttributes('input', { type: 'checkbox', value: name, id, ...(checked ? { checked } : undefined) });
            const checkLabel = createElementWithAttributes('label', { type: 'checkbox', for: id }, name);
            const checkColor = createElementWithAttributes('span', { class: 'filter-color', style: checked && color ? 'background:' + color : '' });
            const checkWrap = createElementWithAttributes('div', { class: 'filter-check' });
            checkWrap.append(check, checkLabel, checkColor);
            return checkWrap;
        }));
    }

    return { updateOptions };
}