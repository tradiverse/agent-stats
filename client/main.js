import { generateFilename } from './shared/generate-filename.js';
import { createFilterChart } from './components/filter-chart.js';

const SERVER_BASE_URL = 'https://tradiverse.github.io/agent-stats';

// init charts
const [creditsChart, shipsChart] = ['#credits-chart', '#ships-chart'].map(target => createFilterChart({
    target: document.querySelector(target),
    chartOptions: {
        data: {
            columns: [],
            type: 'bar',
            colors: {
                red: 'red',
                green: 'green',
                blue: 'blue',
            },
        },
        bar: {
            width: {
                ratio: 0.99,
            },
        },
    },
}));

const [creditsChartTime, shipsChartTime] = ['#credits-chart-time', '#ships-chart-time'].map(target => createFilterChart({
    target: document.querySelector(target),
    chartOptions: {
        data: {
            x: 'x',
            columns: [
            ]
        },
        axis: {
            x: {
                type: 'timeseries',
                tick: {
                    format: '%Y-%m-%d %H:%M'
                }
            }
        }
    },
}));

// load chart data
updateCharts();

// initForms();

// setInterval(() => updateCharts(), 60_000)

////// functions only below /////////////////////////////////////////////////////////////

async function loadDataFile(filename) {
    const agentResult = await fetch(SERVER_BASE_URL + '/data/' + filename);
    if (!agentResult?.ok) {
        console.error("LOAD AGENT FAIL", agentResult?.status, agentResult?.statusText);
        return [];
    }

    return agentResult.json();
}

async function updateCharts() {

    let shipsTimeColumns = [];
    let creditsTimeColumns = [];
    const dateColumns = [];

    const lastDate = new Date();

    for (let i = 0; i < 10; i++) {
        lastDate.setMinutes(lastDate.getMinutes() - 10);
        let filename = generateFilename(lastDate);
        let agents = await loadDataFile(filename);

        if (!agents?.length) {
            break;
        }

        const creditColumns = agents
            .map(v => [v.symbol, v.credits])
            .sort(([_, a], [__, b]) => b - a);

        if (i === 0) {
            const shipColumns = agents
                .map(v => [v.symbol, v.shipCount])
                .sort(([_, a], [__, b]) => b - a);

            shipsChart.load({ columns: shipColumns, unload: true });
            creditsChart.load({ columns: creditColumns, unload: true });

            dateColumns.push('x');

            creditColumns.forEach((v) => {
                shipsTimeColumns.push(v);
                creditsTimeColumns.push(v);
            });
        }

        creditColumns.forEach(([symbol, v], i) => {
            // shipsTimeColumns[i].push(v.shipCount);
            creditsTimeColumns[i].push(v);
        });

        const date = filename.replace('agents_', '').replace('.json', '')
        dateColumns.push(new Date(date));
    }

    shipsTimeColumns.unshift(dateColumns);
    creditsTimeColumns.unshift(dateColumns);

    console.log('shipsTimeColumns', shipsTimeColumns);
    console.log('creditsTimeColumns', creditsTimeColumns);
    shipsChartTime.load({ columns: shipsTimeColumns, unload: true });
    creditsChartTime.load({ columns: creditsTimeColumns, unload: true });
}
