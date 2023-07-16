function createWithAttributes(type, attr = {}) {
    const el = document.createElement(type);
    for (let [k, v] of Object.entries(attr)) {
        el.setAttribute(k, v);
    }
    return el;
}

export function createFilterChart({ target, chartOptions }) {

    let lastData = [];

    const elToolbar = createWithAttributes('div', { 'class': 'filter-chart-toolbar' });

    const elStart = createWithAttributes('input', { type: 'number', placeholder: 'Start', value: 0, min: 0, max: 0, step: 1 });
    const elLimit = createWithAttributes('input', { type: 'number', placeholder: 'Limit', value: 20, min: 10, max: 100, step: 10 });
    const elSearch = createWithAttributes('input', { type: 'text', placeholder: 'Find Agent', value: '' });
    const elSearchResult = createWithAttributes('div', { 'class': 'filter-chart-results' });
    elToolbar.appendChild(elStart);
    elToolbar.appendChild(elLimit);
    elToolbar.appendChild(elSearch);
    elToolbar.appendChild(elSearchResult);

    const elCharthart = createWithAttributes('div', { 'class': 'filter-chart-chart' });

    target.appendChild(elToolbar);
    target.appendChild(elCharthart);

    chartOptions.bindto = elCharthart;
    const chart = c3.generate(chartOptions);

    elLimit.addEventListener('change', () => load(lastData));
    elStart.addEventListener('input', () => load(lastData));

    elSearch.addEventListener('input', () => {
        const searchTerm = elSearch.value.toLowerCase();
        const resultsElements = searchTerm.length < 3 ? [] : lastData.columns
            .filter(([symbol]) => symbol.toLowerCase().includes(searchTerm))
            .map(([symbol]) => {
                const element = document.createElement('button');
                element.innerText = symbol;
                return element;
            });
        elSearchResult.replaceChildren(...resultsElements);
    });
    elSearchResult.addEventListener('click', async (e) => {
        if (e?.target?.tagName !== 'BUTTON') {
            return;
        }
        const searchAgent = e.target.innerText;
        console.log('got click', searchAgent)
        load(lastData, { searchAgent })
        elSearchResult.replaceChildren(...[]);
        elSearch.value = '';
    });

    function load(data, { searchAgent } = {}) {
        if (!data) {
            return;
        }
        lastData = data;
        const searchTerm = searchAgent ? searchAgent.toUpperCase() : '';
        const searchIdx = searchTerm ? data.columns.findIndex(([v]) => v.toUpperCase() === searchTerm) : -1;
        const limit = parseInt(elLimit.value, 10);
        const start = searchIdx < 0 ? parseInt(elStart.value, 10) : Math.max(0, searchIdx - Math.floor(limit / 2));
        const columns = data.columns.slice(start, start + limit);

        elStart.max = data.columns.length;
        if (searchIdx >= 0) {
            elStart.value = start;
        }

        return chart.load({
            ...data,
            columns,
        });
    }

    return { load };
}