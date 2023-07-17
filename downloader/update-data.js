import path from 'path';
import fs from "fs-extra";
import axios from 'axios';
import { generateFilename } from '../client/shared/generate-filename.js';
import { exec } from 'child_process';
import { resolve } from 'path';
import * as url from 'url';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const AGENT_API_URL = 'https://api.spacetraders.io/v2/agents';

const dataPath = path.resolve(__dirname, '..', 'client', 'data');
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
            console.log('Requesting page', page);
            const { data: result } = await axios({
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

            // 2 per second
            console.log('Pausing...');
            await new Promise(r => setTimeout(r, 500));
        }

        const downloadTime = performance.now() - start;
        console.log('Download finished in ', (downloadTime / 1000).toFixed(3), 's');

        console.log('Writing file...');

        await fs.writeJSON(path.resolve(dataPath, filename), agents);

        const totalTime = performance.now() - start;
        const fileTime = totalTime - downloadTime;
        console.log('File saved in ', (fileTime / 1000).toFixed(3), 's', 'Total time:', totalTime.toFixed(3), 's');

        console.log('submitting to github...');
        const scriptPath = resolve(__dirname, 'update-git.sh');
        exec('bash ' + scriptPath, (error, stdout, stderr) => {
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