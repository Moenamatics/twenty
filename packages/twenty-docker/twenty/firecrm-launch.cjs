// Root supervisor keeps credentials out of every process's initial environment.
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const { createRequire } = require('node:module');
const { convertProcessSignalToExitCode } = require('node:util');
const req = createRequire('/app/packages/twenty-server/package.json');
const secretPattern = /(?:SECRET|PASSWORD|CREDENTIAL|(?:^|_)(?:KEY|TOKEN)(?:_|$)|^PG_|^REDIS_)/;
const forbidden = new Set(['NODE_OPTIONS', 'NODE_PATH', 'LD_PRELOAD', 'PATH', 'HOME', 'FIRECRM_SECRET_FILE']);

function assertInitialEnv(secrets) {
  const configured = new Set(Object.keys(secrets));
  for (const [key, value] of Object.entries(process.env)) {
    if (key === 'FIRECRM_SECRET_FILE') continue;
    const privateName = secretPattern.test(key) && !key.endsWith('_EXPIRES_IN');
    if (configured.has(key) || privateName || /postgres(?:ql)?:\/\//i.test(value)) throw new Error('SECRET_IN_INITIAL_ENV');
  }
}

function readSecrets() {
  if (process.getuid() !== 0) throw new Error('ROOT_SUPERVISOR_REQUIRED');
  const fd = fs.openSync(process.env.FIRECRM_SECRET_FILE || '/run/secrets/firecrm.json', fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile() || stat.uid !== 0 || (stat.mode & 0o077) !== 0) throw new Error('SECRET_FILE_PERMISSIONS');
    const secrets = JSON.parse(fs.readFileSync(fd, 'utf8'));
    if (!secrets || Array.isArray(secrets) || typeof secrets !== 'object') throw new Error('SECRET_FILE_FORMAT');
    for (const [key, value] of Object.entries(secrets)) {
      if (!/^[A-Z][A-Z0-9_]*$/.test(key) || forbidden.has(key) || typeof value !== 'string') throw new Error('SECRET_FILE_ENTRY');
    }
    assertInitialEnv(secrets);
    return secrets;
  } finally { fs.closeSync(fd); }
}

function launch(args, secrets) {
  const child = spawn(process.execPath, ['--require', '/app/firecrm-preload.cjs', ...args], {
    uid: 1000, gid: 1000, env: { ...process.env, HOME: '/home/node' },
    stdio: ['inherit', 'inherit', 'inherit', 'pipe'],
  });
  child.stdio[3].on('error', () => child.kill('SIGKILL'));
  child.stdio[3].end(JSON.stringify(secrets));
  return child;
}

async function command(args, secrets) {
  await new Promise((resolve, reject) => {
    const child = launch(args, secrets);
    child.on('error', () => reject(new Error('STARTUP_COMMAND_SPAWN_FAILED')));
    child.on('close', (code) => code === 0 ? resolve() : reject(new Error('STARTUP_COMMAND_FAILED')));
  });
}

async function upgradeCommand(task, warning, secrets) {
  try { await command(['dist/command/command', task], secrets); }
  catch { process.stderr.write(`${warning}\n`); }
}

async function startup(secrets) {
  if (process.env.DISABLE_DB_MIGRATIONS !== 'true') {
    const { Client } = req('pg');
    const client = new Client({ connectionString: secrets.PG_DATABASE_URL });
    try {
      await client.connect();
      const result = await client.query("SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'core') AS present");
      if (!result.rows[0].present) {
        await command(['dist/database/scripts/setup-db.js'], secrets);
        await command(['dist/command/command', 'run-instance-commands', '--force', '--include-slow'], secrets);
      }
    } finally { await client.end(); }
    // Keep upstream's warning policy for already-initialized database upgrades.
    await upgradeCommand('cache:flush', 'Warning: Failed to flush cache before upgrade, but continuing startup...', secrets);
    await upgradeCommand('upgrade', 'Warning: Upgrade completed with errors. Some workspaces may not be fully migrated. Check logs for details.', secrets);
    await upgradeCommand('cache:flush', 'Warning: Failed to flush cache after upgrade, but continuing startup...', secrets);
  }
  if (process.env.DISABLE_CRON_JOBS_REGISTRATION !== 'true') {
    try { await command(['dist/command/command', 'cron:register:all'], secrets); }
    catch { process.stderr.write('Warning: Failed to register background jobs, but continuing startup...\n'); }
  }
}

async function main() {
  const secrets = readSecrets();
  const [binary, ...args] = process.argv.slice(2);
  if (binary !== 'node' || args.length === 0) throw new Error('NODE_COMMAND_REQUIRED');
  await startup(secrets);
  const child = launch(args, secrets);
  for (const signal of ['SIGTERM', 'SIGINT', 'SIGUSR2']) process.on(signal, () => child.kill(signal));
  child.on('error', () => { process.stderr.write('NATIVE_SPAWN_FAILED\n'); process.exitCode = 1; });
  child.on('close', (code, signal) => { process.exitCode = code ?? convertProcessSignalToExitCode(signal); });
}
main().catch(() => { process.stderr.write('FIRECRM_STARTUP_FAILED\n'); process.exitCode = 1; });
