import { readFileSync } from 'node:fs';
import { checkSharedStyles } from './sharedStyles.js';

const errors = checkSharedStyles(readFileSync(new URL('../index.css', import.meta.url), 'utf8'));
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
}
