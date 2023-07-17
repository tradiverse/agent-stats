export function createElementWithAttributes(type, attr = {}, text) {
    const el = document.createElement(type);
    for (let [k, v] of Object.entries(attr)) {
        el.setAttribute(k, v);
    }
    if (text) {
        el.innerText = text;
    }
    return el;
}