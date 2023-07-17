import { generateFilename } from './shared/generate-filename.js';
import { createFilterPane } from './components/filter-pane.js';

const INITIAL_LOAD_COUNT = 100;
const SERVER_BASE_URL = 'https://tradiverse.github.io/agent-stats';

const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

// agents selected in the filter pane { 'AGENT_NAME': boolean }
const selectedAgents = {};
// array of arrays of agents sorted by most credits (0 = oldest ... last = latest)
const creditsSortedAgents = [];
// array of arrays of agents sorted by most ships (0 = oldest ... last = latest)
const shipsSortedAgents = [];
// array of timestamps
const dateColumns = [];

// init latest bar charts
const [creditsChart, shipsChart] = ['#credits-chart', '#ships-chart'].map(target => c3.generate({
    bindto: target,
    data: {
        x: 'x',
        columns: [],
        type: 'bar',
        color: function (inColor, data) {
            if (data.index !== undefined) {
                return colorScale(data.index);
            }

            return inColor;
        },
    },
    bar: {
        width: {
            ratio: 0.99,
        },
    },
    axis: {
        x: {
            type: 'category',
            tick: {
                rotate: 45,
                multiline: false,
            }
        },
    },
    legend: {
        show: false
    }
}));

// init over time line charts
const [creditsChartTime, shipsChartTime] = ['#credits-chart-time', '#ships-chart-time'].map(target => c3.generate({
    bindto: target,
    data: {
        x: 'x',
        columns: []
    },
    axis: {
        x: {
            type: 'timeseries',
            tick: {
                format: '%Y-%m-%d %H:%M'
            },
        }
    },
    tooltip: {
        grouped: false,
    },
    legend: {
        show: false
    },
    subchart: {
        show: true,
    },
}));

// init filter pane
const filterPane = createFilterPane({
    target: document.getElementById('filter-pane'),
    onChange: (options) => {
        options.forEach(v => {
            selectedAgents[v.name] = v.checked;
        });
        updateCharts();
    }
});

const loading = document.getElementById('loading');
const loadingLabel = document.getElementById('loading-label');

// btn to show/hide filters on mobile
const btnFilterToggle = document.getElementById('btn-filter-toggle');
btnFilterToggle.addEventListener('click', e => {
    const pane = document.getElementById('filter-pane')
    const show = !pane.classList.contains('pane-showing');
    pane.classList.toggle('pane-showing', show);
    btnFilterToggle.innerText = show ? 'Hide filters' : 'Show filters';
});

// select buttons in filter
document.getElementById('filter-header').addEventListener('click', e => {
    switch (e.target?.id) {
        case 'btn-filter-none':
            filterSelectNone();
            updateCharts();
            break;
        case 'btn-filter-credits':
            filterSelectTopCredits();
            updateCharts();
            break;
        case 'btn-filter-ships':
            filterSelectTopShips();
            updateCharts();
            break;
    }
});

// load and render initial chart data
await loadInitialChartData();
loading.classList.add('loading-hidden');

filterSelectTopCredits()
updateCharts();

// try to load new data once a minute
setInterval(async () => {
    const result = await tryLoadNextChartData();
    if (result) {
        updateCharts();
    }
}, 60_000)


////// functions only below /////////////////////////////////////////////////////////////

function filterSelectNone() {
    Object.keys(selectedAgents).forEach(v => selectedAgents[v] = false);
}

function filterSelectTopShips() {
    filterSelectNone();
    shipsSortedAgents[shipsSortedAgents.length - 1].slice(0, 20).forEach(v => selectedAgents[v.symbol] = true);
}

function filterSelectTopCredits() {
    filterSelectNone();
    creditsSortedAgents[creditsSortedAgents.length - 1].slice(0, 20).forEach(v => selectedAgents[v.symbol] = true);
}

async function loadDataFile(filename) {
    const agentResult = await fetch(SERVER_BASE_URL + '/data/' + filename);
    if (!agentResult?.ok) {
        console.error("LOAD AGENT FAIL", agentResult?.status, agentResult?.statusText);
        return [];
    }

    return agentResult.json();
}

async function tryLoadNextChartData() {
    const lastFilename = generateFilename(dateColumns[dateColumns.length - 1]);
    const filename = generateFilename();
    if (lastFilename === filename) {
        return false;
    }
    try {
        let agents = await loadDataFile(filename);
        if (agents?.length) {
            creditsSortedAgents.push(agents.slice().sort((a, b) => b.credits - a.credits));
            shipsSortedAgents.push(agents.slice().sort((a, b) => b.shipCount - a.shipCount));
            const date = filename.replace('agents_', '').replace('.json', '')
            dateColumns.push(new Date(date));
            return true;
        }
    } catch (e) {
        console.error('FAILED TO NEW CHART DATA', e);
    }
    return false;
}

async function loadInitialChartData() {
    const lastDate = new Date();

    for (let i = 0; i < INITIAL_LOAD_COUNT; i++) {
        lastDate.setMinutes(lastDate.getMinutes() - 10);
        let filename = generateFilename(lastDate);
        let agents = await loadDataFile(filename);

        loadingLabel.innerText = 'Loading ' + Math.floor((i / INITIAL_LOAD_COUNT) * 100) + '%';

        if (!agents?.length) {
            break;
        }

        creditsSortedAgents.unshift(agents.slice().sort((a, b) => b.credits - a.credits));
        shipsSortedAgents.unshift(agents.slice().sort((a, b) => b.shipCount - a.shipCount));
        const date = filename.replace('agents_', '').replace('.json', '')
        dateColumns.unshift(new Date(date));
    }
}

function updateCharts() {
    filterPane.updateOptions(creditsSortedAgents[creditsSortedAgents.length - 1].map((v, i) => ({ name: v.symbol, checked: selectedAgents[v.symbol] })));

    let shipsTimeColumnsMap = {};
    let creditsTimeColumnsMap = {};

    const creditsColumns = [['x'], ['credits']];
    creditsSortedAgents.forEach((item, i) => {
        item.forEach((v) => {
            // exclude any non-selected agents
            if (selectedAgents[v.symbol] !== true) {
                return;
            }

            // if this is the last (latest) entry include it in the bar chart
            if (i === creditsSortedAgents.length - 1) {
                creditsColumns[0].push(v.symbol);
                creditsColumns[1].push(v.credits);
            }

            if (!creditsTimeColumnsMap[v.symbol]) {
                // the first time we encounter an agent backfill the array will null if needed
                creditsTimeColumnsMap[v.symbol] = new Array(i).fill(null);
            }
            creditsTimeColumnsMap[v.symbol].push(v.credits);
        });
    });

    const shipsColumns = [['x'], ['ships']];
    shipsSortedAgents.forEach((item, i) => {
        item.forEach((v) => {
            // exclude any non-selected agents
            if (selectedAgents[v.symbol] !== true) {
                return;
            }

            // if this is the last (latest) entry include it in the bar chart
            if (i === shipsSortedAgents.length - 1) {
                shipsColumns[0].push(v.symbol);
                shipsColumns[1].push(v.shipCount);
            }

            if (!shipsTimeColumnsMap[v.symbol]) {
                // the first time we encounter an agent backfill the array will null if needed
                shipsTimeColumnsMap[v.symbol] = new Array(i).fill(null);
            }
            shipsTimeColumnsMap[v.symbol].push(v.shipCount);
        });
    });

    shipsChart.load({ columns: shipsColumns });
    creditsChart.load({ columns: creditsColumns });

    const chartDateColumns = ['x', ...dateColumns];
    const shipsTimeColumns = [chartDateColumns];
    Object.entries(shipsTimeColumnsMap)
        .sort(([_, a], [__, b]) => b[0] - a[0])
        .forEach(([symbol, v]) => {
            shipsTimeColumns.push([symbol, ...v]);
        });

    const creditsTimeColumns = [chartDateColumns];
    Object.entries(creditsTimeColumnsMap)
        .sort(([_, a], [__, b]) => b[0] - a[0])
        .forEach(([symbol, v]) => {
            creditsTimeColumns.push([symbol, ...v]);
        });

    const unloadNames = Object.entries(selectedAgents).filter(([k, v]) => v !== true).map(([k, v]) => k);
    shipsChartTime.load({ columns: shipsTimeColumns, unload: unloadNames });
    creditsChartTime.load({ columns: creditsTimeColumns, unload: unloadNames });
}
