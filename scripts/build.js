const { execFileSync, spawnSync } = require('child_process');
const { writeFileSync } = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const versionFile = path.join(projectRoot, 'public', 'version.json');
const buildScript = require.resolve('react-scripts/scripts/build');

function getCommitHash() {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return 'unknown';
  }
}

const buildVersion = `${Date.now()}-${getCommitHash()}`;

writeFileSync(
  versionFile,
  `${JSON.stringify({ version: buildVersion }, null, 2)}\n`,
  'utf8'
);

console.log(`Building application version ${buildVersion}`);

const result = spawnSync(process.execPath, [buildScript], {
  cwd: projectRoot,
  env: {
    ...process.env,
    REACT_APP_BUILD_VERSION: buildVersion,
  },
  stdio: 'inherit',
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
