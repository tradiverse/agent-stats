// I forgot to sort the _include file. Soooo yeah, this script, whatever.

import fs from "fs-extra";
import { INCLUDE_AGENTS_PATH } from './constants.js';

const names = await fs.readFile(INCLUDE_AGENTS_PATH);

const sortedNames = names.toString().split('\n').sort();
await fs.writeFile(INCLUDE_AGENTS_PATH, sortedNames.join('\n'));

console.log('AGENTS NAMES SORTED!!');