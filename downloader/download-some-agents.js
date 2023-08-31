import axios from 'axios';
import { AGENT_API_URL } from './constants.js';

export async function downloadSomeAgents(agentsToLoad) {
    const agents = [];

    for (let loadAgent of agentsToLoad) {
        let result;

        // retry each http request up to 3 times
        for (let tryIt = 0; tryIt < 3; tryIt++) {
            // 2 per second
            console.log('Pausing...');
            await new Promise(r => setTimeout(r, 500));

            console.log('Requesting', loadAgent, 'try', tryIt + 1);

            try {
                const { data: httpResult } = await axios({
                    method: 'GET',
                    url: AGENT_API_URL + '/' + loadAgent,
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
                const status = parseInt(e?.response?.status || 0, 10);
                const noRetry = status === 404 || status > 4100;
                if (noRetry) {
                    console.error('Load failed. HTTP ERROR:', status);
                    break;
                }

                console.error('HTTP ERROR', status, e);
            }
        }

        if (result?.data) {
            agents.push(result.data);
    
            console.log(`Finished loading. Added ${loadAgent}. Total: ${agents.length}`);
        } else {
            console.error('Failed to load', loadAgent);
        }

    }

    return agents;
}