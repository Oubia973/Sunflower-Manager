const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const stageRoot = path.join(projectRoot, 'src', '.private-admin');
const markerPath = path.join(stageRoot, '.generated-by-stage-admin-ui');
const sourceRoot = path.resolve(process.env.PRIVATE_ADMIN_UI_SOURCE_ROOT || path.resolve(projectRoot, '..', 'sflman', 'private', 'admin-ui', 'src'));

function cleanAdminUiStage() {
  if (!fs.existsSync(stageRoot)) return;
  if (path.resolve(stageRoot) !== path.resolve(projectRoot, 'src', '.private-admin')) {
    throw new Error('Unexpected Admin UI stage path');
  }
  if (!fs.existsSync(markerPath)) {
    throw new Error('Refusing to remove an Admin UI directory without its generated marker');
  }
  fs.rmSync(stageRoot, { recursive: true, force: true });
}

function stageAdminUi() {
  cleanAdminUiStage();
  fs.mkdirSync(stageRoot, { recursive: true });
  fs.writeFileSync(markerPath, 'Generated from the private backend repository. Do not edit.\n');
  try {
    if (fs.existsSync(path.join(sourceRoot, 'fadmin.jsx'))) {
      fs.cpSync(sourceRoot, stageRoot, { recursive: true, force: true });
      console.log('Staged Admin UI from the private backend repository.');
      return true;
    }
    if (process.env.CI !== 'true') {
      throw new Error(`Private Admin UI source is missing: ${sourceRoot}`);
    }
    fs.writeFileSync(path.join(stageRoot, 'fadmin.jsx'), 'export default function AdminUnavailable() { return null; }\n');
    console.log('Private Admin UI is unavailable in public CI; building a disabled Admin shell.');
    return false;
  } catch (error) {
    cleanAdminUiStage();
    throw error;
  }
}

if (require.main === module) {
  if (process.argv[2] === '--clean') cleanAdminUiStage();
  else stageAdminUi();
}

module.exports = { stageAdminUi, cleanAdminUiStage };
