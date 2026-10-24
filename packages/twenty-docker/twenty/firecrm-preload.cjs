// Read before application code; fd3 is never inherited by logic-function children.
const fs = require('node:fs');
let serialized;
try { serialized = fs.readFileSync(3, 'utf8'); }
finally { fs.closeSync(3); }
let secrets;
try { secrets = JSON.parse(serialized); }
catch { throw new Error('FIRECRM_SECRET_HANDOFF_INVALID'); }
for (const [key, value] of Object.entries(secrets)) process.env[key] = value;
serialized = undefined;
