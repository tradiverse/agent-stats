// single use file to include some of the top people this reset automatically

import fs from "fs-extra";
import { INCLUDE_AGENTS_PATH } from './constants.js';

const INPUT_PATH = '../agent-stats-data/data/agents_2023-08-31T14:50:00.000Z.json';

const agents = await fs.readJSON(INPUT_PATH);

const topAgents = [];

agents.sort((a,b) => b.credits - a.credits);

topAgents.push(...agents.slice(0, 40))

agents.sort((a,b) => b.shipCount - a.shipCount);

topAgents.push(...agents.slice(0, 40));

const topAgentsUnique = Array.from(new Set(topAgents.map(v => v.symbol)));

await fs.writeFile(INCLUDE_AGENTS_PATH, topAgentsUnique.join('\n'));
