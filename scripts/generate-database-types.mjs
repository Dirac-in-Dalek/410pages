import { writeFile } from 'node:fs/promises';

const project = 'yyfapuwgvimbjsebfifb';
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) throw new Error('Set SUPABASE_ACCESS_TOKEN to generate database types.');

const response = await fetch(
  `https://api.supabase.com/v1/projects/${project}/types/typescript?included_schemas=public`,
  { headers: { Authorization: `Bearer ${token}` } }
);
if (!response.ok) throw new Error(`Database type generation failed: HTTP ${response.status}`);
const { types } = await response.json();
if (typeof types !== 'string' || !types.includes('export type Database')) {
  throw new Error('Invalid database type response; the existing file was kept.');
}
await writeFile(new URL('../shared/api/database.types.ts', import.meta.url), types.trimEnd() + '\n');
console.log(`Updated database types for ${project}.`);
