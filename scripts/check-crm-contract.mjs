/**
 * Fails if this repo's copy of the website<->CRM contract has drifted from the
 * source of truth in the CRM repo. Run it in CI, and before shipping either
 * side. A drifted contract fails silently in production, which is the worst
 * possible time to find out.
 */
import { readFileSync, existsSync } from 'node:fs';

const COPY = new URL('../src/lib/crm/contract.ts', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const SOURCE = process.env.CRM_REPO
  ? `${process.env.CRM_REPO}/packages/shared/src/contract.ts`
  : 'D:/projects/al-amin-al-tajir-crm/packages/shared/src/contract.ts';

if (!existsSync(COPY)) {
  console.error('MISSING: ' + COPY);
  process.exit(1);
}
if (!existsSync(SOURCE)) {
  console.log('SKIP: the CRM repo is not checked out here.');
  console.log('      Set CRM_REPO=/path/to/al-amin-al-tajir-crm to check.');
  process.exit(0);
}

const source = readFileSync(SOURCE, 'utf8');
const copy = readFileSync(COPY, 'utf8');

if (copy.endsWith(source)) {
  console.log('OK: the contract copy matches the source of truth.');
  process.exit(0);
}
console.error('DRIFT: src/lib/crm/contract.ts no longer matches the CRM source.');
console.error('Re-copy it:');
console.error(`  node -e "const f=require('fs');const b=f.readFileSync('${SOURCE}','utf8');const c=f.readFileSync('${COPY}','utf8');f.writeFileSync('${COPY}', c.slice(0, c.length-0).split('// ====')[0] + b)"`);
console.error('(or copy the header from the current file and append the source verbatim)');
process.exit(1);
