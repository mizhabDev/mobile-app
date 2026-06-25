const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const appDir = path.join(srcDir, 'app');
const coreDir = path.join(srcDir, 'core');

if (fs.existsSync(appDir)) {
  fs.renameSync(appDir, coreDir);
  console.log('Renamed src/app to src/core');
}

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('@/app/')) {
    content = content.replace(/@\/app\//g, '@/core/');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated ' + filePath);
  }
}

function walkSync(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walkSync(filePath);
    } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      replaceInFile(filePath);
    }
  }
}

walkSync(srcDir);
replaceInFile(path.join(__dirname, 'App.tsx'));
