import path from 'path';
import fs from "fs-extra";
import axios from 'axios';
import { generateFilename } from '../client/shared/generate-filename.js';
import { exec } from 'child_process';
import { resolve } from 'path';
import * as url from 'url';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const AGENT_API_URL = 'https://api.spacetraders.io/v2/agents';

const dataRepoPath = path.resolve(__dirname, '..', 'agent-stats-data');
const dataPath = path.resolve(dataRepoPath, 'data');
const updateGitScriptPath = resolve(dataRepoPath, 'update-git.sh');

await fs.ensureDir(dataPath);

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

    await updateData();
}

async function updateData() {
    let page = 1;

    const agents = [];
    try {
        const start = performance.now();

        const filename = generateFilename();
        console.log('  ');
        console.log('START GENERATING', filename);

        while (true) {

            let result;

            // retry each http request up to 3 times
            for (let tryIt = 0; tryIt < 3; tryIt++) {
                // 2 per second
                console.log('Pausing...');
                await new Promise(r => setTimeout(r, 500));

                console.log('Requesting page', page, 'try', tryIt + 1);

                try {
                    const { data: httpResult } = await axios({
                        method: 'GET',
                        url: AGENT_API_URL,
                        params: {
                            page,
                            limit: 20,
                        },
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });

                    if (!httpResult?.data) {
                        throw Error('NO HTTP RESULT DATA IN RETRY LOOP!!')
                    }

                    // success break out of the retry for loop
                    result = httpResult;
                    break;
                } catch (e) {
                    console.error('HTTP ERROR', e);
                }
            }

            if (!result?.data) {
                throw Error('NO RESULT DATA!!')
            }

            agents.push(...result.data);

            const { limit, total } = result.meta;
            console.log(`Finished page ${page}/${total}. Added ${result.data.length}/${limit}. Total: ${agents.length}`);

            if (page * limit >= total) {
                break;
            }

            page++;
        }

        const downloadTime = performance.now() - start;
        console.log('Download finished in ', (downloadTime / 1000).toFixed(3), 's');

        console.log('Writing file...');

        await fs.writeJSON(path.resolve(dataPath, filename), agents);

        const totalTime = performance.now() - start;
        const fileTime = totalTime - downloadTime;
        console.log('File saved in ', (fileTime / 1000).toFixed(3), 's', 'Total time:', totalTime.toFixed(3), 's');

        console.log('submitting to github...');

        exec('bash ' + updateGitScriptPath, { cwd: dataRepoPath }, (error, stdout, stderr) => {
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