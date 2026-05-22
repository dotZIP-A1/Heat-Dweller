const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const repoRoot = typeof process.pkg !== 'undefined'
  ? path.dirname(process.execPath)
  : process.cwd();

const electronCmd = path.join(repoRoot, 'node_modules', '.bin', 'electron.cmd');
const electronBin = path.join(repoRoot, 'node_modules', '.bin', 'electron');

function fileExists(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

const launcher = fileExists(electronCmd)
  ? electronCmd
  : fileExists(electronBin)
    ? electronBin
    : null;

if (!launcher) {
  console.error('Could not find Electron in node_modules.');
  console.error('Run `npm install` first, then try launching again.');
  process.exit(1);
}

const appArgs = ['.'];
console.log('Launching Heat Dweller...');
console.log(`Using Electron binary: ${launcher}`);

const child = spawn(launcher, appArgs, {
  cwd: repoRoot,
  stdio: 'inherit',
  shell: false,
});

child.on('exit', (code) => {
  process.exit(code);
});

child.on('error', (err) => {
  console.error('Failed to launch Electron:', err.message);
  process.exit(1);
});
