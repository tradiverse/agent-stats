import axios from 'axios';
import { AGENT_API_URL } from './constants.js';

export async function downloadAllAgents() {
    const agents = [];
    let page = 1;

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
            return agents;
        }

        page++;
    }
}