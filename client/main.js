import { generateFilename } from './shared/generate-filename.js';
import { createFilterPane } from './components/filter-pane.js';
import { CHART_COLORS } from './colors.js';

const INITIAL_LOAD_COUNT = 100;
// const SERVER_BASE_URL = 'https://tradiverse.github.io/agent-stats';
const SERVER_BASE_URL = 'https://tradiverse.github.io/agent-stats-data';

// agents selected in the filter pane { 'AGENT_NAME': boolean }
let selectedAgents = {};
// track unique colors per agent that is used across all charts
let agentColors = {};
// array of arrays of agents sorted by most credits (0 = oldest ... last = latest)
const creditsSortedAgents = [];
// array of arrays of agents sorted by most ships (0 = oldest ... last = latest)
const shipsSortedAgents = [];
// array of timestamps
const dateColumns = [];
// how many data points to display
let timeChartDataIntervalMinutes = 10;

function createTooltip(type, name, color, value) {
    return `
        <table class="c3-tooltip">
            <tbody>
                <tr>
                    <th colspan="2">${name}</th>
                </tr>
                <tr class="c3-tooltip-name--${type}">
                    <td class="name">
                        <span style="background-color:${color}"></span>${type}
                    </td>
                    <td class="value">${value}</td>
                </tr>
            </tbody>
        </table>
    `;
}

// init latest bar charts
const [creditsChart, shipsChart] = ['#credits-chart', '#ships-chart'].map((target, chartIdx) => c3.generate({
    bindto: target,
    data: {
        x: 'x',
        columns: [],
        type: 'bar',
        color: function (inColor, data, b) {
            if (data.index !== undefined) {
                const chart = chartIdx === 0 ? creditsChart : shipsChart;
                return agentColors[chart.categories()[data.index]];
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
        y: {
            tick: {
                format: d3.format(",")
            }
        },
    },
    legend: {
        show: false
    },
    tooltip: {
        show: true,
        contents: function (data, defaultTitleFormat, defaultValueFormat) {
            if (data && data[0]) {
                const chart = chartIdx === 0 ? creditsChart : shipsChart;
                const type = data[0].id;
                const name = defaultTitleFormat(chart.categories()[data[0].index]);
                const color = agentColors[name];
                const value = d3.format(",")(data[0].value);
                return createTooltip(type, name, color, value);
            }
            return 'Failed to generate tooltip';
        },
    }
}));

// init over time line charts
const [creditsChartTime, shipsChartTime] = ['#credits-chart-time', '#ships-chart-time'].map(target => c3.generate({
    bindto: target,
    data: {
        x: 'x',
        columns: [],
        type: 'line',
        color: function (inColor, data) {
            if (data.id !== undefined) {
                return agentColors[data.id];
            }

            return inColor;
        },
    },
    axis: {
        x: {
            type: 'timeseries',
            tick: {
                format: '%Y-%m-%d %H:%M'
            },
        },
        y: {
            tick: {
                format: d3.format(",")
            }
        },
    },
    tooltip: {
        grouped: false,
        contents: function (data, defaultTitleFormat, defaultValueFormat) {
            if (data && data[0]) {
                const type = data[0].id;
                const name = defaultTitleFormat(data[0].x);
                const color = agentColors[type];
                const value = d3.format(",")(data[0].value);
                return createTooltip(type, name, color, value);
            }
            return 'Failed to generate tooltip';
        },
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
const btnLoadMore = document.getElementById('btn-load-more');
const lblLoadMore = document.getElementById('lbl-load-more');
const btnFilterToggle = document.getElementById('btn-filter-toggle');
const selInterval = document.getElementById('sel-interval');
const txtFilterSearch = document.getElementById('txt-filter-search');

// btn to show/hide filters on mobile
btnFilterToggle.addEventListener('click', e => {
    const pane = document.getElementById('filter-pane')
    const show = !pane.classList.contains('pane-showing');
    pane.classList.toggle('pane-showing', show);
});

btnLoadMore.addEventListener('click', async e => {
    btnLoadMore.disabled = true;
    lblLoadMore.innerText = 'Loading...';
    const loaded = await loadInitialChartData(new Date(dateColumns[0]));
    updateCharts();
    if (loaded > 0) {
        lblLoadMore.innerText = '';
        btnLoadMore.disabled = false;
    } else {
        lblLoadMore.innerText = 'Loaded all data';
    }
});

txtFilterSearch.addEventListener('input', () => updateFilterOptions());

timeChartDataIntervalMinutes = parseInt(selInterval.value, 10);
selInterval.addEventListener('change', () => {
    timeChartDataIntervalMinutes = parseInt(selInterval.value, 10);
    updateCharts();
});

// select buttons in filter
document.getElementById('filter-header').addEventListener('click', e => {
    switch (e.target?.id) {
        case 'btn-filter-none':
            filterSelectOnly();
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

/**
 * Selects only the provided agents
 */
function filterSelectOnly(selected = []) {
    selectedAgents = {};
    selected.forEach(v => selectedAgents[v] = true);
}

/**
 * Selects agents with the top ship count
 */
function filterSelectTopShips(count = 20) {
    const topShipsAgents = shipsSortedAgents[shipsSortedAgents.length - 1].slice(0, count).map(v => v.symbol);
    filterSelectOnly(topShipsAgents);
}

/**
 * Selects the agents with the top credits
 */
function filterSelectTopCredits(count = 20) {
    const topCreditsAgents = creditsSortedAgents[creditsSortedAgents.length - 1].slice(0, count).map(v => v.symbol);
    filterSelectOnly(topCreditsAgents);
}

/**
 * Downloads a json data file from the server
*/
async function loadDataFile(filename) {
    const agentResult = await fetch(SERVER_BASE_URL + '/data/' + filename);
    if (!agentResult?.ok) {
        console.error("LOAD AGENT FAIL", agentResult?.status, agentResult?.statusText);
        return [];
    }

    return agentResult.json();
}

/**
 * Attempts to load the latest data if it has not already been loaded
 */
async function tryLoadNextChartData() {
    const lastFilename = generateFilename(dateColumns[dateColumns.length - 1]);
    const filename = generateFilename();
    if (lastFilename === filename) {
        // latest file name (based on time) is already loaded... exit
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

/**
 * Loads the initial chart data on page load
 * Starts 10 minutes before now to ensure the data will exist, and iterates backward to load older data
 * The latest (and newer) will be loaded automatically after this is done
 */
async function loadInitialChartData(lastDate = new Date()) {
    const results = await Promise.allSettled(new Array(INITIAL_LOAD_COUNT).fill().map(async (_, i) => {
        const thisDate = new Date(lastDate);
        thisDate.setMinutes(thisDate.getMinutes() - (10 * (i + 1)));
        let filename = generateFilename(thisDate);

        let agents = await loadDataFile(filename);

        loadingLabel.innerText = 'Loading ' + Math.floor((i / INITIAL_LOAD_COUNT) * 100) + '%';

        if (!agents?.length) {
            return;
        }
        const date = filename.replace('agents_', '').replace('.json', '')
        return {
            credits: agents.slice().sort((a, b) => b.credits - a.credits),
            ships: agents.slice().sort((a, b) => b.shipCount - a.shipCount),
            date: new Date(date)
        }
    }));

    let successCount = 0;
    results.forEach(result => {
        if (!result || result.status !== 'fulfilled' || !result.value) {
            return;
        }
        creditsSortedAgents.unshift(result.value.credits);
        shipsSortedAgents.unshift(result.value.ships);
        dateColumns.unshift(result.value.date);
        successCount++;
    });
    return successCount;
}

function updateFilterOptions() {
    const search = txtFilterSearch.value.trim().toUpperCase();
    agentColors = {};
    let colorOffset = 0;
    Object.entries(selectedAgents).forEach(([k, v]) => {
        if (v === true) {
            agentColors[k] = CHART_COLORS[colorOffset % CHART_COLORS.length];
            colorOffset++;
        }
    });
    filterPane.updateOptions(creditsSortedAgents[creditsSortedAgents.length - 1].map((v, i) => ({ name: v.symbol, checked: selectedAgents[v.symbol], color: agentColors[v.symbol], hidden: search && !v.symbol.toUpperCase().includes(search) })));
}

/**
 * Updates all charts on the page based on the previously loaded data and current filter settings
 */
function updateCharts() {
    updateFilterOptions();

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

    const chartInterval = timeChartDataIntervalMinutes / 10;

    const dateData = dateColumns.filter((_, i) => i % chartInterval === 0);
    const chartDateColumns = ['x', ...dateData];

    const shipsTimeColumns = [chartDateColumns];
    Object.entries(shipsTimeColumnsMap)
        .sort(([_, a], [__, b]) => b[0] - a[0])
        .forEach(([symbol, v]) => {
            const data = v.filter((_, i) => i % chartInterval === 0)
            shipsTimeColumns.push([symbol, ...data]);
        });

    const creditsTimeColumns = [chartDateColumns];
    Object.entries(creditsTimeColumnsMap)
        .sort(([_, a], [__, b]) => b[0] - a[0])
        .forEach(([symbol, v]) => {
            const data = v.filter((_, i) => i % chartInterval === 0)
            creditsTimeColumns.push([symbol, ...data]);
        });

    const selectedAgentItems = Object.entries(selectedAgents);
    const unloadNames = selectedAgentItems.length === 0 ? true : selectedAgentItems.filter(([k, v]) => v !== true).map(([k, v]) => k);
    shipsChartTime.load({ columns: shipsTimeColumns, unload: unloadNames });
    creditsChartTime.load({ columns: creditsTimeColumns, unload: unloadNames });
}
