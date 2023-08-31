import * as url from 'url';
import path from 'path';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

export const BASE_API_URL = 'https://api.spacetraders.io/v2';
export const AGENT_API_URL = BASE_API_URL + '/agents';

export const DATA_REPO_PATH = path.resolve(__dirname, '..', 'agent-stats-data');
export const DATA_PATH = path.resolve(DATA_REPO_PATH, 'data');
export const UPDATE_GIT_SCRIPT_PATH = path.resolve(DATA_REPO_PATH, 'update-git.sh');
export const RESET_DATE_PATH = path.resolve(DATA_PATH, '_reset');
export const INCLUDE_AGENTS_PATH = path.resolve(DATA_PATH, '_include');