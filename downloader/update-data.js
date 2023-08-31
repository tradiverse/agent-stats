import path from 'path';
import fs from "fs-extra";
import axios from 'axios';
import { generateFilename } from '../client/shared/generate-filename.js';
import { exec } from 'child_process';
import { downloadAllAgents } from './download-all-agents.js';
import { downloadSomeAgents } from './download-some-agents.js';
import { BASE_API_URL, DATA_PATH, RESET_DATE_PATH, UPDATE_GIT_SCRIPT_PATH, DATA_REPO_PATH, INCLUDE_AGENTS_PATH } from './constants.js';

await fs.ensureDir(DATA_PATH);

let resetDate = '';
try {
    resetDate = (await fs.readFile(RESET_DATE_PATH)).toString();
} catch { }

console.log('Startup reset date =', resetDate);

while (true) {
    const time = new Date();
    const now = time.getTime();

    time.setSeconds(0);
    time.setMilliseconds(0);
    time.setMinutes((Math.floor(time.getMinutes() / 10) * 10) + 10);
    const target = time.getTime();

    const pause = target - now;
    console.log('Pausing', pause, 'ms', (pause / 1000 / 60).toFixed(2), 'minutes');
    await new Promise(resolve => setTimeout(resolve, pause));

    try {
        const serverInfo = await getServerInfo();
        await checkAndHandleReset(serverInfo.resetDate);
        await updateData(serverInfo);
    } catch (e) {
        console.error('MAIN LOOP ERROR', e);
    }
}

async function getServerInfo(tries = 0) {
    let returnData;

    try {
        const { data: httpResult } = await axios({
            method: 'GET',
            url: BASE_API_URL,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!httpResult.resetDate) {
            throw Error('Failed to get server info reset date from server');
        }
        returnData = httpResult;
    } catch (e) {
        // retry 3 times (unless a reset is in progress)
        const status = parseInt(e?.response?.status || 0, 10);
        const resetInProgress = status === 503 || status > 4100;
        if (tries < 3 && !resetInProgress) {
            console.error('CHECK RESET HTTP ERROR', status || e);
            console.log('Retrying try=', tries);
            return getServerInfo(tries + 1);
        }
        // re-throw (will try again in 10 minutes)
        throw new Error(e);
    }
    return returnData;
}

async function checkAndHandleReset(newReset) {
    if (!resetDate) {
        console.log('no reset date, saving');
        fs.writeFile(RESET_DATE_PATH, newReset);
        resetDate = newReset;
    } else if (newReset != resetDate) {
        console.log('RESET DATE CHANGED!!!', resetDate, '->', newReset);
        // move data
        await fs.move(DATA_PATH, DATA_PATH + '_' + resetDate + '_' + Date.now());
        // re-create data directory
        await fs.ensureDir(DATA_PATH);
        // save new reset
        resetDate = newReset;
        await fs.writeFile(RESET_DATE_PATH, newReset);
        console.log('RESET COMPLETE');
    }
}

async function updateData(serverInfo) {
    
    try {
        const start = performance.now();
        
        const filename = generateFilename();
        console.log('  ');
        console.log('START GENERATING', filename);
        
        // const agents = await downloadAllAgents();

        let includeAgentsList = [];
        try {
            includeAgentsList = (await fs.readFile(INCLUDE_AGENTS_PATH)).toString().split('\n') || [];
        } catch { }

        const agentsToLoad = Array.from(new Set([
            ...includeAgentsList,
            ...serverInfo.leaderboards.mostCredits.map(v => v.agentSymbol),
            ...serverInfo.leaderboards.mostSubmittedCharts.map(v => v.agentSymbol),
        ]));
        console.log('agentsToLoad', agentsToLoad);
        const agents = await downloadSomeAgents(agentsToLoad);

        const downloadTime = performance.now() - start;
        console.log('Download finished in ', (downloadTime / 1000).toFixed(3), 's');

        console.log('Writing file...');

        console.log('agents', agents);
        console.log('agents.length', agents.length);
        console.log('DATA_PATH', DATA_PATH);
        console.log('filename', filename);

        await fs.writeJSON(path.resolve(DATA_PATH, filename), agents);

        const totalTime = performance.now() - start;
        const fileTime = totalTime - downloadTime;
        console.log('File saved in ', (fileTime / 1000).toFixed(3), 's', 'Total time:', totalTime.toFixed(3), 's');

        console.log('submitting to github...');

        exec('bash ' + UPDATE_GIT_SCRIPT_PATH, { cwd: DATA_REPO_PATH }, (error, stdout, stderr) => {
            if (stdout) {
                console.log('out', stdout);
            }
            if (stderr) {
                console.log('err', stderr);
            }
            if (error !== null) {
                console.log(`exec error: ${error}`);
            }
        });
    } catch (e) {
        console.error('ERROR', e);
    }
}