const { execFileSync, spawnSync } = require('child_process');
const { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync } = require('fs');
const path = require('path');
const { stageAdminUi, cleanAdminUiStage } = require('./stage-admin-ui.js');

const projectRoot = path.resolve(__dirname, '..');
const versionFile = path.join(projectRoot, 'public', 'version.json');
const buildScript = require.resolve('react-scripts/scripts/build');
const publicBuildRoot = path.join(projectRoot, 'build');
const privateBuildRoot = path.join(projectRoot, '.admin-ui-build');

function moveAdminAssets() {
  let movedScript = false;
  for (const kind of ['js', 'css']) {
    const sourceDir = path.join(publicBuildRoot, 'static', kind);
    const targetDir = path.join(privateBuildRoot, 'static', kind);
    mkdirSync(targetDir, { recursive: true });
    for (const name of readdirSync(targetDir)) {
      if (/^admin-ui\.[a-z0-9]+\.chunk\.(?:js|css)(?:\.map)?$/i.test(name)) {
        unlinkSync(path.join(targetDir, name));
      }
    }
    for (const name of readdirSync(sourceDir)) {
      if (!/^admin-ui\.[a-z0-9]+\.chunk\.(?:js|css)(?:\.map)?$/i.test(name)) continue;
      renameSync(path.join(sourceDir, name), path.join(targetDir, name));
      if (kind === 'js' && name.endsWith('.chunk.js')) movedScript = true;
    }
  }
  if (!movedScript) throw new Error('Admin UI chunk is missing from the production build');
  const manifestPath = path.join(publicBuildRoot, 'asset-manifest.json');
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    for (const key of Object.keys(manifest.files || {})) {
      if (String(manifest.files[key]).includes('/admin-ui.')) delete manifest.files[key];
    }
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }
  console.log('Admin UI assets moved outside the public build.');
}

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

function build() {
  const privateSourceAvailable = stageAdminUi();
  try {
    const result = spawnSync(process.execPath, [buildScript], {
      cwd: projectRoot,
      env: {
        ...process.env,
        REACT_APP_BUILD_VERSION: buildVersion,
        REACT_APP_PRIVATE_ADMIN_UI: privateSourceAvailable ? '1' : '0',
      },
      stdio: 'inherit',
    });
    if (result.error) throw result.error;
    if (result.status !== 0) {
      process.exitCode = result.status ?? 1;
      return;
    }
    moveAdminAssets();
  } finally {
    cleanAdminUiStage();
  }
}

build();
