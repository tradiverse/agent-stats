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
        list.replaceChildren(...options.map(({ checked, name }, i) => {
            let id = 'filter-pane-check-' + i;
            const check = createElementWithAttributes('input', { type: 'checkbox', value: name, id, ...(checked ? { checked } : undefined) });
            const checkLabel = createElementWithAttributes('label', { type: 'checkbox', for: id }, name);
            const checkWrap = createElementWithAttributes('div', { class: 'filter-check' });
            checkWrap.appendChild(check);
            checkWrap.appendChild(checkLabel);
            return checkWrap;
        }));
    }

    return { updateOptions };
}